import React from 'react';
import { PhotoSource, SourceImage, FetchImagesResult, FetchImagesOptions, SourceAlbum, InitializableSource } from './types';

// Constants
const CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/photoslibrary.readonly';
const API_BASE = 'https://photoslibrary.googleapis.com/v1';

// Token storage
let accessToken: string | null = null;
let tokenClient: google.accounts.oauth2.TokenClient | null = null;

// Icon component
const GooglePhotosIcon: React.FC = () => (
    <svg width= "20" height = "20" viewBox = "0 0 24 24" fill = "none" xmlns = "http://www.w3.org/2000/svg" >
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill = "currentColor" />
            </svg>
);

class GooglePhotosSource implements PhotoSource, InitializableSource {
    readonly id = 'google-photos';
    readonly name = 'Google Photos';
    readonly icon = <GooglePhotosIcon />;
    readonly requiresAuth = true;

    private initialized = false;

    isAuthenticated(): boolean {
        return accessToken !== null;
    }

    async initialize(): Promise<void> {
        if (this.initialized) return;

        return new Promise((resolve, reject) => {
            // Load Google Identity Services script
            if (document.getElementById('google-gsi-script')) {
                this.initialized = true;
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.id = 'google-gsi-script';
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;

            script.onload = () => {
                tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: CLIENT_ID,
                    scope: SCOPES,
                    callback: () => { }, // Will be set in connect()
                });
                this.initialized = true;
                resolve();
            };

            script.onerror = () => {
                reject(new Error('Failed to load Google Identity Services'));
            };

            document.head.appendChild(script);
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

            tokenClient.callback = (response) => {
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

    getThumbnailUrl(image: SourceImage, size: number): string {
        const baseUrl = image.metadata?.baseUrl as string;
        if (!baseUrl) return '';
        return `${baseUrl}=w${size}-h${size}-c`;
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
