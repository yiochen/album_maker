import type { Spread, AlbumSettings } from '../types';
import { calculateGaplessRect, applyCoverTransform } from '../utils/imageUtils';

export interface ExportWorkerRequest {
    spread: Spread;
    settings: AlbumSettings;
    options: {
        ppi: number;
        format: 'png' | 'jpeg';
        quality: number;
        splitPage?: 'left' | 'right';
    };
}

export interface ExportWorkerResponse {
    spreadId: string;
    pageSide?: 'left' | 'right';
    blob?: Blob;
    error?: string;
}

/**
 * Helper to load an image as an ImageBitmap in a worker environment.
 */
async function loadImage(url: string): Promise<ImageBitmap> {
    const response = await fetch(url);
    const blob = await response.blob();
    return await createImageBitmap(blob);
}

self.onmessage = async (e: MessageEvent<ExportWorkerRequest>) => {
    const { spread, settings, options } = e.data;

    try {
        const ppi = options.ppi;
        const pageWidthPx = Math.round(settings.pageWidth * ppi);
        const pageHeightPx = Math.round(settings.pageHeight * ppi);
        const spreadWidthPx = pageWidthPx * 2;

        // 1. Create OffscreenCanvas for the full spread
        const canvas = new OffscreenCanvas(spreadWidthPx, pageHeightPx);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Could not get 2D context");

        // 2. Clear canvas
        ctx.clearRect(0, 0, spreadWidthPx, pageHeightPx);

        // Fill white background for JPEG exports
        if (options.format === 'jpeg') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, spreadWidthPx, pageHeightPx);
        }

        // 3. Render elements in Z-Order
        // spread.elements are typically ordered by Z-index in the store
        for (const element of spread.elements) {
            try {
                const bitmap = await loadImage(element.content.imageUrl);

                // Calculate the container rect on the spread
                const box = calculateGaplessRect(element.box, spreadWidthPx, pageHeightPx);

                // Calculate image transform within that box (Cover fit)
                const transform = applyCoverTransform(
                    box.width,
                    box.height,
                    bitmap.width,
                    bitmap.height,
                    {
                        zoom: element.content.contentTransform?.zoom ?? 1,
                        panX: element.content.contentTransform?.panX ?? 0.5,
                        panY: element.content.contentTransform?.panY ?? 0.5
                    }
                );

                // Draw to canvas with clipping
                ctx.save();
                ctx.beginPath();
                ctx.rect(box.left, box.top, box.width, box.height);
                ctx.clip();

                // Draw the bitmap using the calculated transform
                ctx.drawImage(
                    bitmap,
                    box.left + transform.left,
                    box.top + transform.top,
                    transform.width,
                    transform.height
                );

                ctx.restore();

                // Cleanup bitmap
                bitmap.close();
            } catch (imageError) {
                console.error(`Failed to load/render image for element ${element.id}:`, imageError);
                // Continue with other elements even if one fails
            }
        }

        // 4. Handle splitting or full spread output
        let finalCanvas: OffscreenCanvas = canvas;
        if (options.splitPage) {
            finalCanvas = new OffscreenCanvas(pageWidthPx, pageHeightPx);
            const finalCtx = finalCanvas.getContext('2d');
            if (finalCtx) {
                // Fill white background for JPEG exports
                if (options.format === 'jpeg') {
                    finalCtx.fillStyle = '#ffffff';
                    finalCtx.fillRect(0, 0, pageWidthPx, pageHeightPx);
                }
                const sourceX = options.splitPage === 'right' ? pageWidthPx : 0;
                finalCtx.drawImage(canvas, sourceX, 0, pageWidthPx, pageHeightPx, 0, 0, pageWidthPx, pageHeightPx);
            }
        }

        // 5. Convert to Blob
        const blob = await finalCanvas.convertToBlob({
            type: options.format === 'png' ? 'image/png' : 'image/jpeg',
            quality: options.quality,
        });

        self.postMessage({
            spreadId: spread.id,
            pageSide: options.splitPage,
            blob
        } as ExportWorkerResponse);

    } catch (error) {
        console.error('Export worker error:', error);
        self.postMessage({
            spreadId: spread.id,
            pageSide: options.splitPage,
            error: (error as Error).message
        } as ExportWorkerResponse);
    }
};
