
import React from 'react';
import type { PhotoSource, SourceImage, FetchImagesResult, FetchImagesOptions, SourceAlbum, InitializableSource } from './types';
import { GooglePhotosIcon } from '../components/icons/GooglePhotosIcon';

// Constants
const CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/photoslibrary.readonly';
const API_BASE = 'https://photoslibrary.googleapis.com/v1';
const GSI_SCRIPT_ID = 'google-gsi-script';
const GSI_INIT_TIMEOUT_MS = 5000;

// Declare Google types (loaded dynamically via script)
declare const google: {
    accounts: {
        oauth2: {
            initTokenClient: (config: {
                client_id: string;
                scope: string;
                callback: (response: TokenResponse) => void;
            }) => TokenClient;
            revoke: (token: string, callback: () => void) => void;
        };
    };
};

interface TokenResponse {
    access_token: string;
    error?: string;
}

interface TokenClient {
    callback: (response: TokenResponse) => void;
    requestAccessToken: (options: { prompt: string }) => void;
}

// Token storage
let accessToken: string | null = null;
let tokenClient: TokenClient | null = null;

class GooglePhotosSource implements PhotoSource, InitializableSource {
    readonly id = 'google-photos';
    readonly name = 'Google Photos';
    readonly icon = <GooglePhotosIcon width="20" height="20" />;
    readonly requiresAuth = true;

    private initialized = false;

    isAuthenticated(): boolean {
        return accessToken !== null;
    }

    async initialize(): Promise<void> {
        if (this.initialized) return;

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
                tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: CLIENT_ID,
                    scope: SCOPES,
                    callback: () => { }, // Will be set in connect()
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

            // If already loaded, initialize immediately.
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

        return new Promise((resolve, reject) => {
            if (!tokenClient) {
                reject(new Error('Token client not initialized'));
                return;
            }

            tokenClient.callback = (response: TokenResponse) => {
                if (response.error) {
                    reject(new Error(response.error));
                    return;
                }
                accessToken = response.access_token;
                resolve();
            };

            tokenClient.requestAccessToken({ prompt: '' });
        });
    }

    disconnect(): void {
        if (accessToken) {
            google.accounts.oauth2.revoke(accessToken, () => {
                accessToken = null;
            });
        }
        accessToken = null;
    }

    async fetchImages(options?: FetchImagesOptions): Promise<FetchImagesResult> {
        if (!accessToken) {
            throw new Error('Not authenticated');
        }

        const pageSize = options?.pageSize || 50;
        let url = `${API_BASE}/mediaItems?pageSize=${pageSize}`;

        if (options?.pageToken) {
            url += `&pageToken=${options.pageToken}`;
        }

        // If album specified, use search instead
        if (options?.albumId) {
            const response = await fetch(`${API_BASE}/mediaItems:search`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    albumId: options.albumId,
                    pageSize,
                    pageToken: options.pageToken,
                }),
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            return this.parseMediaItemsResponse(data);
        }

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        return this.parseMediaItemsResponse(data);
    }

    private parseMediaItemsResponse(data: { mediaItems?: unknown[]; nextPageToken?: string }): FetchImagesResult {
        const mediaItems = data.mediaItems || [];

        const images: SourceImage[] = mediaItems
            .filter((item: unknown) => {
                const i = item as { mimeType?: string };
                return i.mimeType?.startsWith('image/');
            })
            .map((item: unknown) => {
                const i = item as {
                    id: string;
                    filename: string;
                    mimeType: string;
                    mediaMetadata?: { width?: string; height?: string; creationTime?: string };
                    baseUrl?: string;
                };
                return {
                    id: i.id,
                    sourceId: this.id,
                    filename: i.filename,
                    mimeType: i.mimeType,
                    width: i.mediaMetadata?.width ? parseInt(i.mediaMetadata.width) : undefined,
                    height: i.mediaMetadata?.height ? parseInt(i.mediaMetadata.height) : undefined,
                    createdAt: i.mediaMetadata?.creationTime ? new Date(i.mediaMetadata.creationTime).getTime() : undefined,
                    thumbnailUrl: `${i.baseUrl}=w256`,
                    previewUrl: `${i.baseUrl}=w1024`,
                    fullUrl: `${i.baseUrl}=d`,
                    metadata: { baseUrl: i.baseUrl },
                };
            });

        return {
            images,
            nextPageToken: data.nextPageToken,
            hasMore: !!data.nextPageToken,
        };
    }

    async fetchAlbums(): Promise<SourceAlbum[]> {
        if (!accessToken) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`${API_BASE}/albums?pageSize=50`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const albums = data.albums || [];

        return albums.map((album: { id: string; title: string; coverPhotoBaseUrl?: string; mediaItemsCount?: string }) => ({
            id: album.id,
            title: album.title,
            coverUrl: album.coverPhotoBaseUrl ? `${album.coverPhotoBaseUrl}=w200-h200` : undefined,
            itemCount: album.mediaItemsCount ? parseInt(album.mediaItemsCount) : undefined,
        }));
    }

    getPreviewUrl(image: SourceImage): string {
        const baseUrl = image.metadata?.baseUrl as string;
        if (!baseUrl) return '';
        return `${baseUrl}=w1024`;
    }

    getThumbnailUrl(image: SourceImage): string {
        const baseUrl = image.metadata?.baseUrl as string;
        if (!baseUrl) return '';
        return `${baseUrl}=w256`;
    }

    getFullUrl(image: SourceImage, maxWidth?: number, maxHeight?: number): string {
        const baseUrl = image.metadata?.baseUrl as string;
        if (!baseUrl) return '';

        if (maxWidth && maxHeight) {
            return `${baseUrl}=w${maxWidth}-h${maxHeight}`;
        }
        return `${baseUrl}=d`; // Original quality
    }
}

// Singleton instance
export const googlePhotosSource = new GooglePhotosSource();
