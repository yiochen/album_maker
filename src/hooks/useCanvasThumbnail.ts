import { useCallback, useRef } from 'react';
import type { Page, AlbumSettings } from '../types';

interface ThumbnailOptions {
    width: number;
    height: number;
}

const DEFAULT_OPTIONS: ThumbnailOptions = {
    width: 200,
    height: 125,  // 8:5 aspect ratio for spread
};

/**
 * Hook to generate thumbnail images from spread pages using HTML Canvas
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

    // Generate thumbnail for a spread (two pages)
    const generateSpreadThumbnail = useCallback(async (
        pages: Page[],
        settings: AlbumSettings,
        options: Partial<ThumbnailOptions> = {}
    ): Promise<string | null> => {
        const opts = { ...DEFAULT_OPTIONS, ...options };

        // Calculate aspect ratio from settings
        const spreadAspect = (settings.pageWidth * 2) / settings.pageHeight;
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

        // Draw elements from both pages
        const pageWidth = width / 2;

        for (let pageIdx = 0; pageIdx < pages.length && pageIdx < 2; pageIdx++) {
            const page = pages[pageIdx];
            const offsetX = pageIdx * pageWidth;

            for (const element of page.elements) {
                if (element.type !== 'image') continue;

                try {
                    const img = await loadImage(element.thumbnailUrl || element.imageUrl);

                    // Convert page-relative coordinates to canvas coordinates
                    const x = offsetX + (element.position.x / 100) * pageWidth;
                    const y = (element.position.y / 100) * height;
                    const w = (element.size.width / 100) * pageWidth;
                    const h = (element.size.height / 100) * height;

                    ctx.drawImage(img, x, y, w, h);
                } catch (error) {
                    // Draw placeholder for failed images
                    const x = offsetX + (element.position.x / 100) * pageWidth;
                    const y = (element.position.y / 100) * height;
                    const w = (element.size.width / 100) * pageWidth;
                    const h = (element.size.height / 100) * height;

                    ctx.fillStyle = '#f0f0f0';
                    ctx.fillRect(x, y, w, h);
                    ctx.strokeStyle = '#cccccc';
                    ctx.strokeRect(x, y, w, h);
                }
            }
        }

        // Return as data URL
        return canvas.toDataURL('image/jpeg', 0.7);
    }, [getCanvas, loadImage]);

    // Generate thumbnail as Blob for IndexedDB storage
    const generateSpreadThumbnailBlob = useCallback(async (
        pages: Page[],
        settings: AlbumSettings,
        options: Partial<ThumbnailOptions> = {}
    ): Promise<Blob | null> => {
        const opts = { ...DEFAULT_OPTIONS, ...options };

        const spreadAspect = (settings.pageWidth * 2) / settings.pageHeight;
        let width = opts.width;
        let height = Math.round(width / spreadAspect);

        if (height > opts.height) {
            height = opts.height;
            width = Math.round(height * spreadAspect);
        }

        const canvas = getCanvas(width, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        // Same drawing logic as above
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        const seamX = width / 2;
        ctx.strokeStyle = '#cccccc';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(seamX, 0);
        ctx.lineTo(seamX, height);
        ctx.stroke();
        ctx.setLineDash([]);

        const pageWidth = width / 2;

        for (let pageIdx = 0; pageIdx < pages.length && pageIdx < 2; pageIdx++) {
            const page = pages[pageIdx];
            const offsetX = pageIdx * pageWidth;

            for (const element of page.elements) {
                if (element.type !== 'image') continue;

                try {
                    const img = await loadImage(element.thumbnailUrl || element.imageUrl);

                    const x = offsetX + (element.position.x / 100) * pageWidth;
                    const y = (element.position.y / 100) * height;
                    const w = (element.size.width / 100) * pageWidth;
                    const h = (element.size.height / 100) * height;

                    ctx.drawImage(img, x, y, w, h);
                } catch (error) {
                    const x = offsetX + (element.position.x / 100) * pageWidth;
                    const y = (element.position.y / 100) * height;
                    const w = (element.size.width / 100) * pageWidth;
                    const h = (element.size.height / 100) * height;

                    ctx.fillStyle = '#f0f0f0';
                    ctx.fillRect(x, y, w, h);
                }
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
