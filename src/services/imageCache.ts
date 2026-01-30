/**
 * Service for caching loaded HTMLImageElements to avoid repeated network requests/decoding.
 */
class ImageCacheService {
    private cache: Map<string, HTMLImageElement> = new Map();
    private pending: Map<string, Promise<HTMLImageElement>> = new Map();

    /**
     * Load an image from a URL.
     * Returns a Promise that resolves to the loaded HTMLImageElement.
     */
    loadImage(url: string): Promise<HTMLImageElement> {
        // Check cache first
        const cached = this.cache.get(url);
        if (cached && cached.complete && cached.naturalWidth > 0) {
            return Promise.resolve(cached);
        }

        // Check if already loading
        const existingPromise = this.pending.get(url);
        if (existingPromise) {
            return existingPromise;
        }

        // Load new image
        const promise = new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.cache.set(url, img);
                this.pending.delete(url);
                resolve(img);
            };
            img.onerror = (err) => {
                this.pending.delete(url);
                reject(err);
            };
            img.src = url;
        });

        this.pending.set(url, promise);
        return promise;
    }

    /**
     * Check if an image is already loaded and available synchronously.
     */
    getImage(url: string): HTMLImageElement | undefined {
        const img = this.cache.get(url);
        if (img && img.complete && img.naturalWidth > 0) {
            return img;
        }
        return undefined;
    }

    /**
     * Clear the cache to free memory.
     */
    clear() {
        this.cache.clear();
        this.pending.clear();
    }
}

export const imageCache = new ImageCacheService();
