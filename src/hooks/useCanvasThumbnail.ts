import { useCallback, useRef } from 'react';
import type { Spread, AlbumSettings, PageElement } from '../types';

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

    // Helper to draw elements on canvas
    const drawElements = useCallback(async (
        ctx: CanvasRenderingContext2D,
        elements: PageElement[],
        scale: number,
        spreadRealWidth: number,
        spreadRealHeight: number
    ) => {
        for (const element of elements) {
            if (element.type !== 'image' && element.type !== 'smartFrame') continue;

            let x = 0, y = 0, w = 0, h = 0;

            if (element.box) {
                // Normalized box 0-1
                const left = element.box.x1 * spreadRealWidth;
                const top = element.box.y1 * spreadRealHeight;
                const right = element.box.x2 * spreadRealWidth;
                const bottom = element.box.y2 * spreadRealHeight;

                x = left * scale;
                y = top * scale;
                w = (right - left) * scale;
                h = (bottom - top) * scale;
            } else if (element.position && element.size) {
                 x = (element.position.x - element.size.width / 2) * scale;
                 y = (element.position.y - element.size.height / 2) * scale;
                 w = element.size.width * scale;
                 h = element.size.height * scale;
            } else {
                 continue;
            }

            try {
                const img = await loadImage(element.thumbnailUrl || element.imageUrl);

                // Draw with basic cover (center crop) to avoid distortion
                const imgAspect = img.width / img.height;
                const frameAspect = w / h;

                let renderW, renderH, renderX, renderY;

                if (imgAspect > frameAspect) {
                    // Image is wider than frame -> limit by height, crop width
                    renderH = h;
                    renderW = h * imgAspect;
                    renderY = y;
                    renderX = x - (renderW - w) / 2; // Center horizontally
                } else {
                    // Image is taller than frame -> limit by width, crop height
                    renderW = w;
                    renderH = w / imgAspect;
                    renderX = x;
                    renderY = y - (renderH - h) / 2; // Center vertically
                }

                ctx.save();
                ctx.beginPath();
                ctx.rect(x, y, w, h);
                ctx.clip();
                ctx.drawImage(img, renderX, renderY, renderW, renderH);
                ctx.restore();

            } catch {
                // Placeholder
                ctx.fillStyle = '#f0f0f0';
                ctx.fillRect(x, y, w, h);
                ctx.strokeStyle = '#cccccc';
                ctx.strokeRect(x, y, w, h);
            }
        }
    }, [loadImage]);

    // Generate thumbnail for a spread
    const generateSpreadThumbnail = useCallback(async (
        spread: Spread | Spread[],
        settings: AlbumSettings,
        options: Partial<ThumbnailOptions> = {}
    ): Promise<string | null> => {
        const targetSpread = Array.isArray(spread) ? spread[0] : spread;
        if (!targetSpread) return null;

        const opts = { ...DEFAULT_OPTIONS, ...options };

        // Calculate aspect ratio from settings
        const spreadRealWidth = settings.pageWidth * 2 * PPI;
        const spreadRealHeight = settings.pageHeight * PPI;
        const spreadAspect = spreadRealWidth / spreadRealHeight;

        let width = opts.width;
        let height = Math.round(width / spreadAspect);

        if (height > opts.height) {
            height = opts.height;
            width = Math.round(height * spreadAspect);
        }

        const canvas = getCanvas(width, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const scale = width / spreadRealWidth;

        // Clear canvas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // Draw Background
        if (targetSpread.background) {
            ctx.fillStyle = targetSpread.background;
            ctx.fillRect(0, 0, width, height);
        }

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
        await drawElements(ctx, targetSpread.elements, scale, spreadRealWidth, spreadRealHeight);

        return canvas.toDataURL('image/jpeg', 0.7);
    }, [getCanvas, drawElements]);

    // Generate thumbnail as Blob
    const generateSpreadThumbnailBlob = useCallback(async (
        spread: Spread | Spread[],
        settings: AlbumSettings,
        options: Partial<ThumbnailOptions> = {}
    ): Promise<Blob | null> => {
        const targetSpread = Array.isArray(spread) ? spread[0] : spread;
        if (!targetSpread) return null;

        const opts = { ...DEFAULT_OPTIONS, ...options };

        const spreadRealWidth = settings.pageWidth * 2 * PPI;
        const spreadRealHeight = settings.pageHeight * PPI;
        const spreadAspect = spreadRealWidth / spreadRealHeight;

        let width = opts.width;
        let height = Math.round(width / spreadAspect);

        if (height > opts.height) {
            height = opts.height;
            width = Math.round(height * spreadAspect);
        }

        const canvas = getCanvas(width, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const scale = width / spreadRealWidth;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        if (targetSpread.background) {
            ctx.fillStyle = targetSpread.background;
            ctx.fillRect(0, 0, width, height);
        }

        const seamX = width / 2;
        ctx.strokeStyle = '#cccccc';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(seamX, 0);
        ctx.lineTo(seamX, height);
        ctx.stroke();
        ctx.setLineDash([]);

        await drawElements(ctx, targetSpread.elements, scale, spreadRealWidth, spreadRealHeight);

        return new Promise((resolve) => {
            canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.7);
        });
    }, [getCanvas, drawElements]);

    const clearCache = useCallback(() => {
        imageCache.current.clear();
    }, []);

    return {
        generateSpreadThumbnail,
        generateSpreadThumbnailBlob,
        clearCache,
    };
}
