import { thumbnailDB } from '../db';

// Fetch an image and cache its thumbnail
export const fetchAndCacheThumbnail = async (
    url: string,
    size: number
): Promise<string> => {
    // Check cache first
    const cached = await thumbnailDB.get(url);
    if (cached) {
        return URL.createObjectURL(cached);
    }

    // Fetch image
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status}`);
        }

        const blob = await response.blob();

        // Cache the blob
        await thumbnailDB.set(url, blob, size);

        return URL.createObjectURL(blob);
    } catch (error) {
        console.error('Failed to fetch and cache thumbnail:', error);
        throw error;
    }
};

// Get cached thumbnail or return original URL
export const getCachedThumbnailUrl = async (url: string): Promise<string> => {
    const cached = await thumbnailDB.get(url);
    if (cached) {
        return URL.createObjectURL(cached);
    }
    return url;
};

// Preload and cache multiple thumbnails
export const preloadThumbnails = async (
    urls: string[],
    size: number,
    onProgress?: (loaded: number, total: number) => void
): Promise<void> => {
    let loaded = 0;
    const total = urls.length;

    await Promise.allSettled(
        urls.map(async (url) => {
            try {
                await fetchAndCacheThumbnail(url, size);
            } catch {
                // Ignore individual failures
            } finally {
                loaded++;
                onProgress?.(loaded, total);
            }
        })
    );
};

// Clear expired cache entries
export const cleanupThumbnailCache = async (): Promise<number> => {
    return thumbnailDB.cleanup();
};

// Get cache size in bytes
export const getThumbnailCacheSize = async (): Promise<number> => {
    return thumbnailDB.getSize();
};

// Clear all cached thumbnails
export const clearThumbnailCache = async (): Promise<void> => {
    return thumbnailDB.clear();
};
