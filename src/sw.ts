/// <reference lib="webworker" />

/**
 * Service Worker for Album App
 *
 * Handles two route types:
 * 1. /__local__/dummyColors/<color>/<WxH> — Generates SVG color swatches on the fly
 * 2. lh3.googleusercontent.com/* — Cache-first strategy for Google Photos images
 */

declare const self: ServiceWorkerGlobalScope;

const GOOGLE_PHOTOS_CACHE = 'google-photos-v1';

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

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Route 1: Dummy color image generation
    if (url.pathname.startsWith('/__local__/dummyColors/')) {
        event.respondWith(handleDummyColor(url));
        return;
    }

    // Route 2: Google Photos image caching
    if (url.hostname === 'lh3.googleusercontent.com') {
        event.respondWith(handleGooglePhotos(event.request));
        return;
    }

    // Route 3: Uploaded images from IndexedDB
    if (url.pathname.startsWith('/__local__/uploaded/')) {
        event.respondWith(handleUploadedImage(url));
        return;
    }
});

// ─── Dummy Colors Route ──────────────────────────────────────────────

/**
 * Generates an SVG response for a dummy color image.
 *
 * URL format: /__local__/dummyColors/<hex color>/<width>x<height>
 * Example:    /__local__/dummyColors/EF4444/4032x3024
 */
function handleDummyColor(url: URL): Response {
    // Parse path: /__local__/dummyColors/<color>/<WxH>
    const segments = url.pathname.split('/');
    // segments: ['', '__local__', 'dummyColors', '<color>', '<WxH>']
    const colorHex = segments[3];
    const dimensions = segments[4];

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
    const svg = generateColorSvg(color, width, height);

    return new Response(svg, {
        status: 200,
        headers: {
            'Content-Type': 'image/svg+xml',
            'Cache-Control': 'public, max-age=31536000, immutable',
        },
    });
}

/**
 * Generates an SVG string with the given color, a subtle checkerboard overlay,
 * and a centered dimension label.
 */
function generateColorSvg(color: string, width: number, height: number): string {
    const tileSize = Math.max(20, Math.floor(Math.min(width, height) / 10));
    const patternSize = tileSize * 2;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <pattern id="checkerboard" width="${patternSize}" height="${patternSize}" patternUnits="userSpaceOnUse">
      <rect width="${tileSize}" height="${tileSize}" fill="white" fill-opacity="0.2"/>
      <rect x="${tileSize}" y="${tileSize}" width="${tileSize}" height="${tileSize}" fill="white" fill-opacity="0.2"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="${color}"/>
  <rect width="100%" height="100%" fill="url(#checkerboard)"/>
  <text x="50%" y="50%" font-family="sans-serif" font-size="${tileSize}" fill="white" fill-opacity="0.5" text-anchor="middle" dominant-baseline="middle" style="pointer-events: none;">${width}x${height}</text>
</svg>`;
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

    if (!id || (type !== 'full' && type !== 'thumb')) {
        return new Response('Invalid uploaded image URL', { status: 400 });
    }

    try {
        const record = await getRecordFromDB(id);
        if (!record) {
            return new Response('Image not found', { status: 404 });
        }

        const blob = type === 'full' ? record.blob : record.thumbnailBlob;
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
    blob: Blob;
    thumbnailBlob: Blob;
    filename: string;
    mimeType: string;
    width: number;
    height: number;
    createdAt: number;
}

/**
 * Raw IndexedDB lookup logic for Service Worker.
 * Bypasses Dexie to keep SW footprint small and avoid complex imports.
 */
function getRecordFromDB(id: string): Promise<UploadedImageRecord | null> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('AlbumEditorDB'); // Must match db/index.ts

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
