/// <reference lib="webworker" />

/**
 * Service Worker for Album App
 *
 * Handles two route types:
 * 1. /__local__/dummyColors/<color>/<WxH> — Generates SVG color swatches on the fly
 * 2. lh3.googleusercontent.com/* — Cache-first strategy for Google Photos images
 */

declare const self: ServiceWorkerGlobalScope;
import { renderSpread } from './utils/offscreenCanvasRenderer';
import type { Album, Spread } from './types';
import { APP_CONFIG } from './config';
import { DB_NAME } from './db/constants';

const GOOGLE_PHOTOS_CACHE = 'google-photos-v1';
const THUMBNAIL_CACHE = 'spread-thumbnails-v1';
const THUMBNAIL_PPI = APP_CONFIG.THUMBNAIL_PPI;

// ─── Install & Activate ──────────────────────────────────────────────

self.addEventListener('install', () => {
    // Activate immediately, don't wait for existing clients to close
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Take control of all open tabs immediately
    event.waitUntil(self.clients.claim());
});

// ─── Fetch Handler ───────────────────────────────────────────────────

/**
 * Universal request resolver.
 * Can be called from the fetch event OR internally by the thumbnail renderer.
 * This ensures that SW-intercepted routes work even when called from within the SW.
 */
async function resolveRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Route 1: Dummy color image generation
    if (url.pathname.startsWith('/__local__/dummyColors/')) {
        return handleDummyColor(url);
    }

    // Route 2: Google Photos image caching
    if (url.hostname === 'lh3.googleusercontent.com') {
        return handleGooglePhotos(request);
    }

    // Route 3: Uploaded images from IndexedDB
    if (url.pathname.startsWith('/__local__/uploaded/')) {
        return handleUploadedImage(url);
    }

    // Route 4: Spread Thumbnails (Virtual)
    if (url.pathname.startsWith('/__local__/spreadThumbnails/')) {
        return handleSpreadThumbnail(url);
    }

    // Default: Fallback to network
    return fetch(request);
}

self.addEventListener('fetch', (event) => {
    event.respondWith(resolveRequest(event.request));
});

// ─── Dummy Colors Route ──────────────────────────────────────────────

/**
 * Generates a PNG response for a dummy color image.
 *
 * URL format: /__local__/dummyColors/<type>/<hex color>/<width>x<height>
 * Example:    /__local__/dummyColors/full/EF4444/4032x3024
 */
async function handleDummyColor(url: URL): Promise<Response> {
    // Parse path: /__local__/dummyColors/[type/]<color>/<WxH>
    const segments = url.pathname.split('/');
    // segments: ['', '__local__', 'dummyColors', '<type>', '<color>', '<WxH>'] 
    // OR legacy: ['', '__local__', 'dummyColors', '<color>', '<WxH>']

    let colorHex: string;
    let dimensions: string;

    if (segments[3] === 'full' || segments[3] === 'thumb' || segments[3] === 'preview') {
        colorHex = segments[4];
        dimensions = segments[5];
    } else {
        // Legacy support
        colorHex = segments[3];
        dimensions = segments[4];
    }

    if (!colorHex || !dimensions) {
        return new Response('Invalid dummy color URL', { status: 400 });
    }

    const [widthStr, heightStr] = dimensions.split('x');
    const width = parseInt(widthStr, 10);
    const height = parseInt(heightStr, 10);

    if (isNaN(width) || isNaN(height)) {
        return new Response('Invalid dimensions', { status: 400 });
    }

    const color = `#${colorHex}`;

    // Use OffscreenCanvas to generate PNG
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return new Response('Failed to get canvas context', { status: 500 });
    }

    // 1. Fill background
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);

    // 2. Draw subtle checkerboard pattern
    const tileSize = Math.max(20, Math.floor(Math.min(width, height) / 10));
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (let x = 0; x < width; x += tileSize * 2) {
        for (let y = 0; y < height; y += tileSize * 2) {
            ctx.fillRect(x, y, tileSize, tileSize);
            ctx.fillRect(x + tileSize, y + tileSize, tileSize, tileSize);
        }
    }

    // 3. Draw label
    const fontSize = Math.max(16, Math.floor(Math.min(width, height) / 12));
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Shadow for readability
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(`${width}x${height}`, width / 2, height / 2);

    const blob = await canvas.convertToBlob({ type: 'image/png' });

    return new Response(blob, {
        status: 200,
        headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=31536000, immutable',
        },
    });
}


// ─── Google Photos Route ─────────────────────────────────────────────

/**
 * Cache-first strategy for Google Photos images.
 * Returns cached response if available (even if the original URL has expired).
 * Otherwise fetches from network, caches the response, and returns it.
 */
async function handleGooglePhotos(request: Request): Promise<Response> {
    const cache = await caches.open(GOOGLE_PHOTOS_CACHE);

    // Check cache first
    const cached = await cache.match(request);
    if (cached) {
        return cached;
    }

    // Cache miss — fetch from network
    try {
        const response = await fetch(request);
        if (response.ok) {
            // Cache a clone (response body can only be consumed once)
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        return new Response('Network error', { status: 503 });
    }
}

// ─── Spread Thumbnails Route ──────────────────────────────────────────

/**
 * Intercepts requests for spread thumbnails.
 * 
 * URL format: /__local__/spreadThumbnails/<albumId>/<spreadId>/<versionId>
 */
async function handleSpreadThumbnail(url: URL): Promise<Response> {
    const segments = url.pathname.split('/');
    // segments: ['', '__local__', 'spreadThumbnails', '<albumId>', '<spreadId>', '<versionId>']
    const albumId = segments[3];
    const spreadId = segments[4];
    const versionId = segments[5];

    if (!albumId || !spreadId || !versionId) {
        return new Response('Invalid thumbnail URL', { status: 400 });
    }

    const cache = await caches.open(THUMBNAIL_CACHE);

    // 1. Double check cache first (should be keyed by full URL)
    const cachedResponse = await cache.match(url.toString());
    if (cachedResponse) {
        return cachedResponse;
    }

    // 2. Fetch Album from IndexedDB with retry if version doesn't match
    try {
        let album: Album | null = null;
        let spread: Spread | null = null;
        let retries = 0;
        const maxRetries = 10;
        const retryDelay = 100;

        while (retries < maxRetries) {
            album = await getAlbumFromDB(albumId);
            if (!album) break;

            spread = album.spreads.find((s: Spread) => s.id === spreadId) || null;
            if (spread && spread.versionId === versionId) {
                break; // Found correct version
            }

            // Version mismatch: wait and retry
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            retries++;
        }

        if (!album) {
            return new Response('Album not found', { status: 404 });
        }

        if (!spread) {
            return new Response('Spread not found', { status: 404 });
        }

        const isCorrectVersion = spread.versionId === versionId;

        // 3. Render spread to OffscreenCanvas
        const pageWidthPx = Math.round(album.settings.pageWidth * THUMBNAIL_PPI);
        const pageHeightPx = Math.round(album.settings.pageHeight * THUMBNAIL_PPI);
        const spreadWidthPx = pageWidthPx * 2;

        const canvas = new OffscreenCanvas(spreadWidthPx, pageHeightPx);
        await renderSpread(spread, album.settings, canvas, {
            ppi: THUMBNAIL_PPI,
            format: 'jpeg',
            quality: 0.8,
            // CRITICAL: We pass our internal resolver because self.fetch() 
            // from within the SW bypasses the 'fetch' event listener.
            customFetch: (input: string | Request | URL) => {
                const req = input instanceof Request ? input : new Request(input.toString());
                return resolveRequest(req);
            }
        });

        // 4. Convert to Blob
        const blob = await canvas.convertToBlob({
            type: 'image/jpeg',
            quality: 0.8
        });

        const response = new Response(blob, {
            headers: {
                'Content-Type': 'image/jpeg',
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });

        // 5. Cache the result ONLY if it's the correct version
        if (isCorrectVersion) {
            // Cleanup older versions of this same spread from cache
            // We do this asynchronously to not block the response
            eventualCacheCleanup(cache, albumId, spreadId, versionId);
            await cache.put(url.toString(), response.clone());
        }

        return response;
    } catch (e) {
        console.error('Failed to generate thumbnail:', e);
        return new Response('Thumbnail generation failed', { status: 500 });
    }
}

/**
 * Cleans up old cache entries for the same spread but different versionIds.
 */
async function eventualCacheCleanup(cache: Cache, albumId: string, spreadId: string, currentVersionId: string) {
    try {
        const keys = await cache.keys();
        const prefix = `/__local__/spreadThumbnails/${albumId}/${spreadId}/`;

        for (const request of keys) {
            const path = new URL(request.url).pathname;
            if (path.startsWith(prefix) && !path.endsWith(`/${currentVersionId}`)) {
                console.debug(`[SW] Cleaning up old thumbnail cache: ${path}`);
                await cache.delete(request);
            }
        }
    } catch (e) {
        console.warn('Cache cleanup failed', e);
    }
}

async function getAlbumFromDB(id: string): Promise<Album | null> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains('albums')) {
                resolve(null);
                return;
            }
            const transaction = db.transaction('albums', 'readonly');
            const store = transaction.objectStore('albums');
            const getRequest = store.get(id);

            getRequest.onsuccess = () => {
                const record = getRequest.result;
                if (!record) {
                    resolve(null);
                    return;
                }
                try {
                    resolve(JSON.parse(record.data) as Album);
                } catch (e) {
                    reject(e);
                }
            };
            getRequest.onerror = () => reject(getRequest.error);
        };
    });
}

// ─── Uploaded Images Route ───────────────────────────────────────────

/**
 * Serves uploaded images from IndexedDB.
 * URL format:
 *   - /__local__/uploaded/full/<id>
 *   - /__local__/uploaded/thumb/<id>
 */
async function handleUploadedImage(url: URL): Promise<Response> {
    const segments = url.pathname.split('/');
    // segments: ['', '__local__', 'uploaded', 'full|thumb', '<id>']
    const type = segments[3];
    const id = segments[4];

    if (!id || (type !== 'full' && type !== 'thumb' && type !== 'preview')) {
        return new Response('Invalid uploaded image URL', { status: 400 });
    }

    try {
        const record = await getRecordFromDB(id);
        if (!record) {
            return new Response('Image not found', { status: 404 });
        }

        let blob: Blob | undefined;
        if (type === 'full') {
            blob = record.blob || record.previewBlob || record.thumbnailBlob;
        } else if (type === 'preview') {
            blob = record.previewBlob || record.thumbnailBlob || record.blob;
        } else {
            blob = record.thumbnailBlob || record.previewBlob || record.blob;
        }

        if (!blob) {
            return new Response('Image variant not ready', { status: 404 });
        }

        return new Response(blob, {
            headers: {
                'Content-Type': record.mimeType,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (error) {
        console.error('Failed to fetch from IndexedDB:', error);
        return new Response('Database error', { status: 500 });
    }
}

interface UploadedImageRecord {
    id: string;
    blob?: Blob;
    previewBlob?: Blob;
    thumbnailBlob?: Blob;
    filename: string;
    mimeType: string;
    width?: number;
    height?: number;
    createdAt: number;
}

/**
 * Raw IndexedDB lookup logic for Service Worker.
 * Bypasses Dexie to keep SW footprint small and avoid complex imports.
 */
function getRecordFromDB(id: string): Promise<UploadedImageRecord | null> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME); // Must match db/index.ts

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            try {
                // Check if the store exists to avoid crashes during initial/failed migrations
                if (!db.objectStoreNames.contains('uploadedImages')) {
                    resolve(null);
                    return;
                }
                const transaction = db.transaction('uploadedImages', 'readonly');
                const store = transaction.objectStore('uploadedImages');
                const getRequest = store.get(id);

                getRequest.onsuccess = () => resolve(getRequest.result || null);
                getRequest.onerror = () => reject(getRequest.error);
            } catch (e) {
                reject(e);
            }
        };
    });
}

export { };
