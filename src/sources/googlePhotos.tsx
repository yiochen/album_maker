import React from 'react';
import type { PhotoSource, SourceImage, FetchImagesResult, FetchImagesOptions, InitializableSource } from './types';
import type { PoolImage } from '../types';
import { GooglePhotosIcon } from '../components/icons/GooglePhotosIcon';
import type {
    GooglePhotosImportItem,
    GooglePhotosImportedAsset,
    GooglePhotosImportWorkerRequest,
    GooglePhotosImportWorkerResponse,
} from '../workers/googlePhotosImportTypes';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? '';
const SCOPES = 'https://www.googleapis.com/auth/photospicker.mediaitems.readonly';
const GSI_SCRIPT_ID = 'google-gsi-script';
const GSI_INIT_TIMEOUT_MS = 5000;
const PICKER_API_BASE = 'https://photospicker.googleapis.com/v1';
const PICKER_POLL_TIMEOUT_MS = 2 * 60 * 1000;
const DEFAULT_POLL_INTERVAL_MS = 2000;
const MAX_MEDIA_ITEMS = 50;
const DEFAULT_THUMBNAIL_MAX_WIDTH = 512;
const DEFAULT_THUMBNAIL_MAX_HEIGHT = 512;

declare const google: {
    accounts: {
        oauth2: {
            initCodeClient: (config: {
                client_id: string;
                scope: string;
                ux_mode: 'popup';
                callback: (response: CodeResponse) => void;
            }) => CodeClient;
            revoke: (token: string, callback: () => void) => void;
        };
    };
};

interface CodeResponse {
    code?: string;
    error?: string;
}

interface CodeClient {
    callback: (response: CodeResponse) => void;
    requestCode: () => void;
}

interface TokenExchangeResponse {
    access_token?: string;
    error?: string;
    error_description?: string;
}

interface PickerSessionResponse {
    id?: string;
    pickerUri?: string;
    mediaItemsSet?: boolean;
    pollingConfig?: {
        pollInterval?: string;
        timeoutIn?: string;
    };
}

interface PickedMediaItem {
    id?: string;
    mediaFile?: {
        baseUrl?: string;
        filename?: string;
        mimeType?: string;
        mediaFileMetadata?: {
            width?: string;
            height?: string;
            creationTime?: string;
        };
    };
}

let accessToken: string | null = null;
let codeClient: CodeClient | null = null;
let pendingPickerSession: PickerSessionResponse | null = null;

const parseDurationMs = (value: string | undefined): number | null => {
    if (!value) {
        return null;
    }

    const match = value.match(/^(\d+(?:\.\d+)?)s$/);
    if (!match) {
        return null;
    }

    return Math.max(0, Math.round(Number(match[1]) * 1000));
};

const wait = (ms: number): Promise<void> => new Promise(resolve => window.setTimeout(resolve, ms));

class GooglePhotosSource implements PhotoSource, InitializableSource {
    readonly id = 'google-photos';
    readonly name = 'Google Photos';
    readonly icon = <GooglePhotosIcon width="20" height="20" />;
    readonly requiresAuth = true;

    private initialized = false;

    private buildSourceImage(asset: GooglePhotosImportedAsset): SourceImage {
        return {
            id: asset.sourceImageId,
            sourceId: this.id,
            filename: asset.filename,
            mimeType: asset.mimeType,
            width: asset.width,
            height: asset.height,
            createdAt: asset.createdAt,
            thumbnailUrl: asset.thumbnailUrl,
            previewUrl: asset.previewUrl,
            fullUrl: asset.fullUrl,
        };
    }

    private buildProgressPoolImage(asset: GooglePhotosImportedAsset, stage: 'thumbnail' | 'preview' | 'full'): PoolImage {
        const progressByStage = {
            thumbnail: 34,
            preview: 67,
            full: 100,
        } as const;

        return {
            id: crypto.randomUUID(),
            sourceId: this.id,
            sourceImageId: asset.sourceImageId,
            fullUrl: stage === 'full' ? asset.fullUrl : stage === 'preview' ? asset.previewUrl : asset.thumbnailUrl,
            previewUrl: stage === 'thumbnail' ? asset.thumbnailUrl : asset.previewUrl,
            thumbnailUrl: asset.thumbnailUrl,
            filename: asset.filename,
            mimeType: asset.mimeType,
            width: asset.width,
            height: asset.height,
            thumbnailWidth: asset.thumbnailWidth,
            thumbnailHeight: asset.thumbnailHeight,
            createdAt: asset.createdAt,
            importStage: stage,
            importProgress: progressByStage[stage],
        };
    }

    isAuthenticated(): boolean {
        return accessToken !== null;
    }

    async initialize(): Promise<void> {
        if (this.initialized) return;
        if (!CLIENT_ID) {
            throw new Error('Missing VITE_GOOGLE_CLIENT_ID for Google Photos source');
        }

        return new Promise((resolve, reject) => {
            const timeoutIdRef: { current: number | undefined } = { current: undefined };

            const cleanup = (script: HTMLScriptElement, onLoad: () => void, onError: () => void): void => {
                script.removeEventListener('load', onLoad);
                script.removeEventListener('error', onError);
                if (timeoutIdRef.current !== undefined) {
                    window.clearTimeout(timeoutIdRef.current);
                }
            };

            const finishInitialization = (): void => {
                codeClient = google.accounts.oauth2.initCodeClient({
                    client_id: CLIENT_ID,
                    scope: SCOPES,
                    ux_mode: 'popup',
                    callback: () => { },
                });
                this.initialized = true;
                resolve();
            };

            let script = document.getElementById(GSI_SCRIPT_ID) as HTMLScriptElement | null;
            if (!script) {
                script = document.createElement('script');
                script.id = GSI_SCRIPT_ID;
                script.src = 'https://accounts.google.com/gsi/client';
                script.async = true;
                script.defer = true;
                document.head.appendChild(script);
            }

            if (typeof google !== 'undefined' && google.accounts?.oauth2) {
                finishInitialization();
                return;
            }

            const onLoad = (): void => {
                cleanup(script!, onLoad, onError);
                finishInitialization();
            };

            const onError = (): void => {
                cleanup(script!, onLoad, onError);
                reject(new Error('Failed to load Google Identity Services'));
            };

            script.addEventListener('load', onLoad);
            script.addEventListener('error', onError);

            timeoutIdRef.current = window.setTimeout(() => {
                cleanup(script!, onLoad, onError);
                reject(new Error(`Google Identity Services load timed out after ${GSI_INIT_TIMEOUT_MS}ms`));
            }, GSI_INIT_TIMEOUT_MS);
        });
    }

    async connect(): Promise<void> {
        if (!this.initialized) {
            await this.initialize();
        }

        // Open popup immediately in the user-gesture call stack so the
        // browser doesn't block it. We'll navigate it to the picker URL
        // once the async setup completes.
        const pickerWindow = window.open('about:blank', 'google-photos-picker', 'popup,width=1280,height=900');
        if (!pickerWindow) {
            throw new Error('Google Photos picker popup was blocked');
        }

        try {
            await this.authorize();
            pendingPickerSession = await this.createPickerSession();

            if (!pendingPickerSession.id || !pendingPickerSession.pickerUri) {
                throw new Error('Google Photos picker did not return a valid session');
            }

            pickerWindow.location.href = `${pendingPickerSession.pickerUri}/autoclose`;
        } catch (error) {
            pickerWindow.close();
            pendingPickerSession = null;
            throw error;
        }
    }

    disconnect(): void {
        if (accessToken) {
            google.accounts.oauth2.revoke(accessToken, () => {
                accessToken = null;
            });
        }
        accessToken = null;
        pendingPickerSession = null;
    }

    async fetchImages(options?: FetchImagesOptions): Promise<FetchImagesResult> {
        if (!accessToken) {
            throw new Error('Not authenticated');
        }
        if (!pendingPickerSession?.id) {
            throw new Error('No Google Photos picker session is active');
        }

        const session = pendingPickerSession;
        pendingPickerSession = null;

        try {
            const completedSession = await this.waitForSelection(session);
            const pickedItems = await this.listPickedMediaItems(completedSession.id!);
            const images = await this.importPickedImages(pickedItems, options);

            return {
                images,
                hasMore: false,
            };
        } finally {
            await this.deletePickerSession(session.id);
        }
    }

    getPreviewUrl(image: SourceImage): string {
        return image.previewUrl ?? '';
    }

    getThumbnailUrl(image: SourceImage): string {
        return image.thumbnailUrl ?? '';
    }

    getFullUrl(image: SourceImage, maxWidth?: number, maxHeight?: number): string {
        void maxWidth;
        void maxHeight;
        return image.fullUrl ?? '';
    }

    private async authorize(): Promise<void> {
        if (!codeClient) {
            throw new Error('Code client not initialized');
        }

        await new Promise<void>((resolve, reject) => {
            codeClient!.callback = async (response: CodeResponse) => {
                if (response.error) {
                    reject(new Error(response.error));
                    return;
                }

                const code = response.code?.trim();
                if (!code) {
                    reject(new Error('Missing authorization code'));
                    return;
                }

                try {
                    const exchangeResponse = await fetch('/.netlify/functions/auth', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                        body: JSON.stringify({ code }),
                    });

                    const tokenData = await exchangeResponse.json() as TokenExchangeResponse;
                    if (!exchangeResponse.ok) {
                        reject(new Error(tokenData.error_description ?? tokenData.error ?? `Auth exchange failed: ${exchangeResponse.status}`));
                        return;
                    }

                    if (!tokenData.access_token) {
                        reject(new Error('Token exchange did not return an access token'));
                        return;
                    }

                    accessToken = tokenData.access_token;
                    resolve();
                } catch (error) {
                    reject(error instanceof Error ? error : new Error('Token exchange failed'));
                }
            };

            codeClient!.requestCode();
        });
    }

    private async createPickerSession(): Promise<PickerSessionResponse> {
        const response = await fetch(`${PICKER_API_BASE}/sessions`, {
            method: 'POST',
            headers: this.getApiHeaders(),
            body: JSON.stringify({}),
        });

        if (!response.ok) {
            throw new Error(`Failed to create Google Photos picker session: ${response.status}`);
        }

        return await response.json() as PickerSessionResponse;
    }

    private async waitForSelection(initialSession: PickerSessionResponse): Promise<PickerSessionResponse> {
        const timeoutMs = parseDurationMs(initialSession.pollingConfig?.timeoutIn) ?? PICKER_POLL_TIMEOUT_MS;
        const pollIntervalMs = parseDurationMs(initialSession.pollingConfig?.pollInterval) ?? DEFAULT_POLL_INTERVAL_MS;
        const deadline = Date.now() + timeoutMs;
        let session = initialSession;

        while (Date.now() < deadline) {
            if (session.mediaItemsSet) {
                return session;
            }

            await wait(pollIntervalMs);
            session = await this.getPickerSession(initialSession.id!);
        }

        throw new Error('Google Photos picker timed out before any images were selected');
    }

    private async getPickerSession(sessionId: string): Promise<PickerSessionResponse> {
        const response = await fetch(`${PICKER_API_BASE}/sessions/${sessionId}`, {
            headers: this.getApiHeaders(),
        });

        if (!response.ok) {
            throw new Error(`Failed to read Google Photos picker session: ${response.status}`);
        }

        return await response.json() as PickerSessionResponse;
    }

    private async listPickedMediaItems(sessionId: string): Promise<PickedMediaItem[]> {
        const items: PickedMediaItem[] = [];
        let pageToken: string | undefined;

        do {
            const params = new URLSearchParams({
                sessionId,
                pageSize: String(MAX_MEDIA_ITEMS),
            });
            if (pageToken) {
                params.set('pageToken', pageToken);
            }

            const response = await fetch(`${PICKER_API_BASE}/mediaItems?${params.toString()}`, {
                headers: this.getApiHeaders(),
            });

            if (!response.ok) {
                throw new Error(`Failed to list selected Google Photos items: ${response.status}`);
            }

            const data = await response.json() as {
                mediaItems?: PickedMediaItem[];
                nextPageToken?: string;
            };

            items.push(...(data.mediaItems ?? []));
            pageToken = data.nextPageToken;
        } while (pageToken);

        return items;
    }

    private async importPickedImages(
        items: PickedMediaItem[],
        options?: FetchImagesOptions,
    ): Promise<SourceImage[]> {
        if (!accessToken) {
            throw new Error('Not authenticated');
        }

        const workerItems: GooglePhotosImportItem[] = items.flatMap((item) => {
            const mediaFile = item.mediaFile;
            const baseUrl = mediaFile?.baseUrl;
            if (!item.id || !mediaFile || !baseUrl || !mediaFile.filename || !mediaFile.mimeType) {
                return [];
            }
            if (!mediaFile.mimeType.startsWith('image/')) {
                return [];
            }

            return [{
                sourceImageId: item.id,
                filename: mediaFile.filename,
                mimeType: mediaFile.mimeType,
                baseUrl,
                width: mediaFile.mediaFileMetadata?.width
                    ? Number.parseInt(mediaFile.mediaFileMetadata.width, 10)
                    : undefined,
                height: mediaFile.mediaFileMetadata?.height
                    ? Number.parseInt(mediaFile.mediaFileMetadata.height, 10)
                    : undefined,
                createdAt: mediaFile.mediaFileMetadata?.creationTime
                    ? new Date(mediaFile.mediaFileMetadata.creationTime).getTime()
                    : Date.now(),
            } satisfies GooglePhotosImportItem];
        });

        if (workerItems.length === 0) {
            return [];
        }

        const worker = new Worker(new URL('../workers/googlePhotosImportWorker.ts', import.meta.url), {
            type: 'module',
        });

        const request: GooglePhotosImportWorkerRequest = {
            accessToken,
            items: workerItems,
            thumbnailMaxWidth: options?.thumbnailMaxWidth ?? DEFAULT_THUMBNAIL_MAX_WIDTH,
            thumbnailMaxHeight: options?.thumbnailMaxHeight ?? DEFAULT_THUMBNAIL_MAX_HEIGHT,
        };

        try {
            const response = await new Promise<GooglePhotosImportWorkerResponse>((resolve, reject) => {
                worker.onmessage = (event: MessageEvent<GooglePhotosImportWorkerResponse>) => {
                    if (event.data.event === 'progress' && event.data.asset && event.data.stage) {
                        options?.onProgress?.([
                            this.buildProgressPoolImage(
                                event.data.asset,
                                event.data.stage as 'thumbnail' | 'preview' | 'full',
                            ),
                        ]);
                        return;
                    }

                    resolve(event.data);
                };
                worker.onerror = () => {
                    reject(new Error('Google Photos import worker failed'));
                };
                worker.postMessage(request);
            });

            if (response.event === 'error' || response.error) {
                throw new Error(response.error);
            }

            return (response.imported ?? []).map((asset) => this.buildSourceImage(asset));
        } finally {
            worker.terminate();
        }
    }

    private async deletePickerSession(sessionId: string | undefined): Promise<void> {
        if (!sessionId) {
            return;
        }

        await fetch(`${PICKER_API_BASE}/sessions/${sessionId}`, {
            method: 'DELETE',
            headers: this.getApiHeaders(),
        }).catch(() => undefined);
    }

    private getApiHeaders(): Record<string, string> {
        if (!accessToken) {
            throw new Error('Not authenticated');
        }

        return {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        };
    }
}

export const googlePhotosSource = new GooglePhotosSource();
