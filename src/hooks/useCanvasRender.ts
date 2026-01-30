import { useEffect, useCallback, useRef } from 'react';
import type { Page, AlbumSettings } from '../types';
import { imageCache } from '../services/imageCache';

interface UseCanvasRenderProps {
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    pages: Page[];
    settings: AlbumSettings;
    zoom: number;
    width: number;
    height: number;
    onRenderComplete?: () => void;
}

export function useCanvasRender({
    canvasRef,
    pages,
    settings,
    zoom,
    width,
    height,
    onRenderComplete
}: UseCanvasRenderProps) {
    const requestRef = useRef<number | undefined>(undefined);

    const render = useCallback(async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Handle High DPI rendering
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, width, height);

        // Calculate scales
        // Spread rendered width/height in pixels (at 100% zoom)
        // Canvas component uses aspect-ratio, so we render to the available width/height
        // We need to map spread percentage coordinates (0-100%) to canvas pixels

        ctx.save();

        // Draw background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // Draw seam
        const seamX = width / 2;
        ctx.strokeStyle = '#e5e7eb'; // var(--color-border)
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(seamX, 0);
        ctx.lineTo(seamX, height);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw elements
        // Logic similar to thumbnail generation but optimized for realtime
        const pageWidth = width / 2;

        for (let pageIdx = 0; pageIdx < pages.length && pageIdx < 2; pageIdx++) {
            const page = pages[pageIdx];
            // Spread percentage calculation:
            // Left page: 0-50%
            // Right page: 50-100%
            const offsetX = pageIdx * pageWidth;

            for (const element of page.elements) {
                if (element.type !== 'image') continue;

                const img = imageCache.getImage(element.imageUrl);

                // Convert spread % to pixels
                // position.x is 0-100% of SPREAD (not page, for our new logic)
                // Wait, previous logic mixed page% and spread%.
                // In Phase 4 we moved to spread-relative positioning in logic,
                // but let's verify if data structure changed.
                // Re-checking CanvasElement in Phase 4:
                // "spreadX = pageOffset + (element.position.x / 100) * 50;"
                // The stored element.position.x is still page-relative (0-100% of page).

                // Let's stick to the stored data structure: element.position is PAGE relative (0-100%)
                const x = offsetX + (element.position.x / 100) * pageWidth;
                const y = (element.position.y / 100) * height;
                const w = (element.size.width / 100) * pageWidth;
                const h = (element.size.height / 100) * height;

                if (img) {
                    try {
                        ctx.drawImage(img, x, y, w, h);
                    } catch (e) {
                        // Fallback/Error state
                        ctx.fillStyle = '#f3f4f6';
                        ctx.fillRect(x, y, w, h);
                    }
                } else {
                    // Image not loaded yet, draw placeholder & trigger load
                    ctx.fillStyle = '#f3f4f6'; // loading gray
                    ctx.fillRect(x, y, w, h);

                    // Trigger load (cache service handles deduplication)
                    imageCache.loadImage(element.imageUrl).then(() => {
                        // Trigger re-render when image loads
                        // In a real loop this happens next frame.
                        // Here we might need to force update if not polling.
                        // But since we use requestAnimationFrame, we just need to request another frame.
                        requestAnimationFrame(render);
                    });
                }

                // Draw selection border if needed handled by DOM overlay
            }
        }

        ctx.restore();

        if (onRenderComplete) {
            onRenderComplete();
        }

    }, [canvasRef, pages, width, height, onRenderComplete]);

    // Animation loop
    useEffect(() => {
        requestRef.current = requestAnimationFrame(render);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [render]);

    // Export function to get data URL for thumbnails
    const getCanvasDataUrl = useCallback((quality = 0.7) => {
        if (!canvasRef.current) return null;
        return canvasRef.current.toDataURL('image/jpeg', quality);
    }, [canvasRef]);

    return { getCanvasDataUrl };
}
