import { GoogleMediaItem, GoogleAlbum, PoolImage } from '../types';

// Google OAuth configuration
// Replace these with your actual credentials from Google Cloud Console
const CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
const API_KEY = 'YOUR_GOOGLE_API_KEY';
const SCOPES = 'https://www.googleapis.com/auth/photoslibrary.readonly';

// API endpoints
const PHOTOS_API_BASE = 'https://photoslibrary.googleapis.com/v1';

interface TokenClient {
    requestAccessToken: (options?: { prompt?: string }) => void;
}

interface TokenResponse {
    access_token: string;
    expires_in: number;
    token_type: string;
}

let tokenClient: TokenClient | null = null;
let accessToken: string | null = null;
let tokenExpiresAt: number = 0;

// Initialize Google Identity Services
export const initGoogleAuth = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        // Check if already loaded
        if (window.google?.accounts?.oauth2) {
            setupTokenClient();
            resolve();
            return;
        }

        // Load the Google Identity Services script
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            setupTokenClient();
            resolve();
        };
        script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
        document.head.appendChild(script);
    });
};

const setupTokenClient = () => {
    if (!window.google?.accounts?.oauth2) return;

    tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response: TokenResponse) => {
            if (response.access_token) {
                accessToken = response.access_token;
                tokenExpiresAt = Date.now() + response.expires_in * 1000;
                // Store in sessionStorage for persistence during session
                sessionStorage.setItem('google_photos_token', accessToken);
                sessionStorage.setItem('google_photos_token_expires', tokenExpiresAt.toString());
            }
        },
    });

    // Try to restore token from session
    const storedToken = sessionStorage.getItem('google_photos_token');
    const storedExpiry = sessionStorage.getItem('google_photos_token_expires');
    if (storedToken && storedExpiry) {
        const expiry = parseInt(storedExpiry, 10);
        if (expiry > Date.now()) {
            accessToken = storedToken;
            tokenExpiresAt = expiry;
        }
    }
};

// Request user authentication
export const requestAuth = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (!tokenClient) {
            reject(new Error('Google Auth not initialized'));
            return;
        }

        // Override callback temporarily to handle this specific request
        const originalCallback = (window.google?.accounts?.oauth2 as any)._callback;

        tokenClient.requestAccessToken({ prompt: 'consent' });

        // Check for token periodically
        const checkToken = setInterval(() => {
            if (accessToken && tokenExpiresAt > Date.now()) {
                clearInterval(checkToken);
                resolve();
            }
        }, 100);

        // Timeout after 2 minutes
        setTimeout(() => {
            clearInterval(checkToken);
            if (!accessToken) {
                reject(new Error('Authentication timeout'));
            }
        }, 120000);
    });
};

// Check if authenticated
export const isAuthenticated = (): boolean => {
    return !!accessToken && tokenExpiresAt > Date.now();
};

// Sign out
export const signOut = (): void => {
    if (accessToken && window.google?.accounts?.oauth2) {
        window.google.accounts.oauth2.revoke(accessToken, () => {
            console.log('Token revoked');
        });
    }
    accessToken = null;
    tokenExpiresAt = 0;
    sessionStorage.removeItem('google_photos_token');
    sessionStorage.removeItem('google_photos_token_expires');
};

// Make authenticated API request
const apiRequest = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
    if (!accessToken || tokenExpiresAt <= Date.now()) {
        throw new Error('Not authenticated');
    }

    const response = await fetch(`${PHOTOS_API_BASE}${endpoint}`, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
        throw new Error(error.error?.message || 'API request failed');
    }

    return response.json();
};

// Fetch user's albums
export const fetchAlbums = async (): Promise<GoogleAlbum[]> => {
    const albums: GoogleAlbum[] = [];
    let pageToken: string | undefined;

    do {
        const params = new URLSearchParams({ pageSize: '50' });
        if (pageToken) params.set('pageToken', pageToken);

        const response = await apiRequest<{ albums?: GoogleAlbum[]; nextPageToken?: string }>(
            `/albums?${params}`
        );

        if (response.albums) {
            albums.push(...response.albums);
        }
        pageToken = response.nextPageToken;
    } while (pageToken);

    return albums;
};

// Fetch media items from an album or all photos
export const fetchMediaItems = async (
    albumId?: string,
    pageSize: number = 100
): Promise<PoolImage[]> => {
    const items: PoolImage[] = [];
    let pageToken: string | undefined;

    do {
        let response: { mediaItems?: GoogleMediaItem[]; nextPageToken?: string };

        if (albumId) {
            // Search within a specific album
            response = await apiRequest<{ mediaItems?: GoogleMediaItem[]; nextPageToken?: string }>(
                '/mediaItems:search',
                {
                    method: 'POST',
                    body: JSON.stringify({
                        albumId,
                        pageSize,
                        pageToken,
                    }),
                }
            );
        } else {
            // Get all photos
            const params = new URLSearchParams({ pageSize: pageSize.toString() });
            if (pageToken) params.set('pageToken', pageToken);

            response = await apiRequest<{ mediaItems?: GoogleMediaItem[]; nextPageToken?: string }>(
                `/mediaItems?${params}`
            );
        }

        if (response.mediaItems) {
            const poolImages = response.mediaItems
                .filter(item => item.mimeType.startsWith('image/'))
                .map(item => mediaItemToPoolImage(item));
            items.push(...poolImages);
        }

        pageToken = response.nextPageToken;

        // Limit to reasonable number for performance
        if (items.length >= 500) break;
    } while (pageToken);

    return items;
};

// Convert Google Media Item to our PoolImage format
const mediaItemToPoolImage = (item: GoogleMediaItem): PoolImage => ({
    id: crypto.randomUUID(),
    googleMediaId: item.id,
    baseUrl: item.baseUrl,
    filename: item.filename,
    mimeType: item.mimeType,
    width: parseInt(item.mediaMetadata.width, 10),
    height: parseInt(item.mediaMetadata.height, 10),
    creationTime: item.mediaMetadata.creationTime,
});

// Get a sized URL for a media item
// Google Photos API requires appending size parameters to baseUrl
export const getMediaUrl = (
    baseUrl: string,
    width?: number,
    height?: number
): string => {
    if (!width && !height) {
        // Return full size
        return `${baseUrl}=d`;
    }

    const params: string[] = [];
    if (width) params.push(`w${width}`);
    if (height) params.push(`h${height}`);

    return `${baseUrl}=${params.join('-')}`;
};

// Get thumbnail URL
export const getThumbnailUrl = (baseUrl: string, size: number = 256): string => {
    return `${baseUrl}=w${size}-h${size}-c`;
};

// Extend window type for Google Identity Services
declare global {
    interface Window {
        google?: {
            accounts?: {
                oauth2: {
                    initTokenClient: (config: any) => TokenClient;
                    revoke: (token: string, callback: () => void) => void;
                };
            };
        };
    }
}
