import { useCallback, useRef } from 'react';
import type { Spread, AlbumSettings } from '../types';

interface ThumbnailOptions {
    width: number;
    height: number;
}

const DEFAULT_OPTIONS: ThumbnailOptions = {
    width: 200,
    height: 125,  // 8:5 aspect ratio for spread
};

const PPI = 300;

/**
 * Hook to generate thumbnail images from spread using HTML Canvas
 */
export function useCanvasThumbnail() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

    // Get or create offscreen canvas
    const getCanvas = useCallback((width: number, height: number): HTMLCanvasElement => {
        if (!canvasRef.current) {
            canvasRef.current = document.createElement('canvas');
        }
        canvasRef.current.width = width;
        canvasRef.current.height = height;
        return canvasRef.current;
    }, []);

    // Load image with caching
    const loadImage = useCallback((url: string): Promise<HTMLImageElement> => {
        const cached = imageCache.current.get(url);
        if (cached && cached.complete) {
            return Promise.resolve(cached);
        }

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                imageCache.current.set(url, img);
                resolve(img);
            };
            img.onerror = reject;
            img.src = url;
        });
    }, []);

    // Generate thumbnail for a spread
    const generateSpreadThumbnail = useCallback(async (
        spread: Spread | Spread[], // Support array for transition, but prefer single Spread
        settings: AlbumSettings,
        options: Partial<ThumbnailOptions> = {}
    ): Promise<string | null> => {
        // Handle array shim if needed (though we should move to passing single spread)
        const targetSpread = Array.isArray(spread) ? spread[0] : spread;
        if (!targetSpread) return null;

        const opts = { ...DEFAULT_OPTIONS, ...options };

        // Calculate aspect ratio from settings
        const spreadRealWidth = settings.pageWidth * 2 * PPI;
        const spreadRealHeight = settings.pageHeight * PPI;
        const spreadAspect = spreadRealWidth / spreadRealHeight;

        let width = opts.width;
        let height = Math.round(width / spreadAspect);

        // Ensure height doesn't exceed max
        if (height > opts.height) {
            height = opts.height;
            width = Math.round(height * spreadAspect);
        }

        const canvas = getCanvas(width, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        // Calculate scale factor (Thumbnail Px / Real Px)
        const scale = width / spreadRealWidth;

        // Clear canvas with white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // Draw seam line
        const seamX = width / 2;
        ctx.strokeStyle = '#cccccc';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(seamX, 0);
        ctx.lineTo(seamX, height);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw elements
        for (const element of targetSpread.elements) {
            if (element.type !== 'image') continue;

            const x = element.position.x * scale;
            const y = element.position.y * scale;
            const w = element.size.width * scale;
            const h = element.size.height * scale;

            try {
                const img = await loadImage(element.thumbnailUrl || element.imageUrl);
                ctx.drawImage(img, x, y, w, h);
            } catch {
                // Placeholder
                ctx.fillStyle = '#f0f0f0';
                ctx.fillRect(x, y, w, h);
                ctx.strokeStyle = '#cccccc';
                ctx.strokeRect(x, y, w, h);
            }
        }

        // Return as data URL
        return canvas.toDataURL('image/jpeg', 0.7);
    }, [getCanvas, loadImage]);

    // Generate thumbnail as Blob
    const generateSpreadThumbnailBlob = useCallback(async (
        spread: Spread | Spread[],
        settings: AlbumSettings,
        options: Partial<ThumbnailOptions> = {}
    ): Promise<Blob | null> => {
        // Handle array shim
        const targetSpread = Array.isArray(spread) ? spread[0] : spread;
        if (!targetSpread) return null;

        const opts = { ...DEFAULT_OPTIONS, ...options };

        // Calculate aspect ratio from settings
        const spreadRealWidth = settings.pageWidth * 2 * PPI;
        const spreadRealHeight = settings.pageHeight * PPI;
        const spreadAspect = spreadRealWidth / spreadRealHeight;

        let width = opts.width;
        let height = Math.round(width / spreadAspect);

        // Ensure height doesn't exceed max
        if (height > opts.height) {
            height = opts.height;
            width = Math.round(height * spreadAspect);
        }

        const canvas = getCanvas(width, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        // Calculate scale factor
        const scale = width / spreadRealWidth;

        // Clear canvas with white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // Seam
        const seamX = width / 2;
        ctx.strokeStyle = '#cccccc';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(seamX, 0);
        ctx.lineTo(seamX, height);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw elements
        for (const element of targetSpread.elements) {
            if (element.type !== 'image') continue;

            const x = element.position.x * scale;
            const y = element.position.y * scale;
            const w = element.size.width * scale;
            const h = element.size.height * scale;

            try {
                const img = await loadImage(element.thumbnailUrl || element.imageUrl);
                ctx.drawImage(img, x, y, w, h);
            } catch {
                ctx.fillStyle = '#f0f0f0';
                ctx.fillRect(x, y, w, h);
            }
        }

        // Return as Blob
        return new Promise((resolve) => {
            canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.7);
        });
    }, [getCanvas, loadImage]);

    // Clear image cache
    const clearCache = useCallback(() => {
        imageCache.current.clear();
    }, []);

    return {
        generateSpreadThumbnail,
        generateSpreadThumbnailBlob,
        clearCache,
    };
}
