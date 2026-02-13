import { useCallback, useRef } from 'react';
import { Spread, AlbumSettings } from '../types';
import { calculateGaplessRect, applyCoverTransform } from '../utils/imageUtils';
import {
    type OrientationMatrix, IDENTITY,
    getOrientedDimensions, decomposeForRendering,
} from '../utils/orientationMatrix';

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

    // Helper for rendering a spread onto a context
    const renderSpreadToCtx = useCallback(async (
        ctx: CanvasRenderingContext2D,
        spread: Spread,
        settings: AlbumSettings,
        targetWidth: number,
        scale: number
    ) => {
        // Clear canvas with white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetWidth, targetWidth / (settings.pageWidth * 2 / settings.pageHeight));

        // Draw seam line
        const seamX = targetWidth / 2;
        ctx.strokeStyle = '#cccccc';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(seamX, 0);
        ctx.lineTo(seamX, targetWidth / (settings.pageWidth * 2 / settings.pageHeight));
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw elements
        const spreadWidth = settings.pageWidth * 2 * PPI;
        const spreadHeight = settings.pageHeight * PPI;

        for (const element of spread.elements) {
            if (element.type !== 'image') continue;

            const rect = calculateGaplessRect(element.box, spreadWidth, spreadHeight);

            // Apply scale to the high-res pixels
            const x = rect.left * scale;
            const y = rect.top * scale;
            const w = rect.width * scale;
            const h = rect.height * scale;

            try {
                const img = await loadImage(element.content.imageUrl);

                // SmartFrame Cover Logic with orientation
                const transform = element.content.contentTransform || { zoom: 1, panX: 0.5, panY: 0.5 };
                const orientation: OrientationMatrix = transform.orientation ?? IDENTITY;
                const oriented = getOrientedDimensions(img.width, img.height, orientation);

                const cover = applyCoverTransform(w, h, oriented.width, oriented.height, transform);

                ctx.save();
                ctx.beginPath();
                ctx.rect(x, y, w, h);
                ctx.clip();

                // Position at image center, apply orientation, then draw
                const imgCenterX = x + cover.left + cover.width / 2;
                const imgCenterY = y + cover.top + cover.height / 2;

                ctx.translate(imgCenterX, imgCenterY);
                const { angleDeg, flipX } = decomposeForRendering(orientation);
                const rotRad = angleDeg * Math.PI / 180;
                if (rotRad !== 0) {
                    ctx.rotate(rotRad);
                }
                if (flipX) {
                    ctx.scale(-1, 1);
                }
                const drawScale = cover.scale;
                ctx.drawImage(
                    img,
                    -img.width * drawScale / 2,
                    -img.height * drawScale / 2,
                    img.width * drawScale,
                    img.height * drawScale
                );
                ctx.restore();
            } catch (err) {
                console.error("Failed to load image for thumbnail", element.content.imageUrl, err);
                ctx.fillStyle = '#f0f0f0';
                ctx.fillRect(x, y, w, h);
                ctx.strokeStyle = '#cccccc';
                ctx.strokeRect(x, y, w, h);
            }
        }
    }, [loadImage]);

    // Generate thumbnail for a spread
    const generateSpreadThumbnail = useCallback(async (
        spread: Spread,
        settings: AlbumSettings,
        options: Partial<ThumbnailOptions> = {}
    ): Promise<string | null> => {
        if (!spread) return null;

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

        const scale = width / spreadRealWidth;
        await renderSpreadToCtx(ctx, spread, settings, width, scale);

        // Return as data URL
        return canvas.toDataURL('image/jpeg', 0.7);
    }, [getCanvas, renderSpreadToCtx]);

    // Generate thumbnail as Blob
    const generateSpreadThumbnailBlob = useCallback(async (
        spread: Spread,
        settings: AlbumSettings,
        options: Partial<ThumbnailOptions> = {}
    ): Promise<Blob | null> => {
        if (!spread) return null;

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

        const scale = width / spreadRealWidth;
        await renderSpreadToCtx(ctx, spread, settings, width, scale);

        // Return as Blob
        return new Promise((resolve) => {
            canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.7);
        });
    }, [getCanvas, renderSpreadToCtx]);

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
