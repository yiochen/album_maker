import type { Spread, AlbumSettings } from '../types';
import { renderSpread } from '../utils/offscreenCanvasRenderer';
import { OffscreenRenderOptions } from '../utils/rendererTypes';

export interface ExportWorkerRequest {
    spread: Spread;
    settings: AlbumSettings;
    options: OffscreenRenderOptions;
}

export interface ExportWorkerResponse {
    spreadId: string;
    pageSide?: 'left' | 'right';
    blob?: Blob;
    error?: string;
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

        // 2. Render Spread using unified utility
        await renderSpread(spread, settings, canvas, options);

        // 3. Handle splitting or full spread output
        let finalCanvas: OffscreenCanvas = canvas;
        if (options.splitPage) {
            finalCanvas = new OffscreenCanvas(pageWidthPx, pageHeightPx);
            const finalCtx = finalCanvas.getContext('2d');
            if (!finalCtx) throw new Error("Could not get final 2D context");

            // Fill white background for JPEG exports
            if (options.format === 'jpeg') {
                finalCtx.fillStyle = '#ffffff';
                finalCtx.fillRect(0, 0, pageWidthPx, pageHeightPx);
            }
            const sourceX = options.splitPage === 'right' ? pageWidthPx : 0;
            finalCtx.drawImage(canvas, sourceX, 0, pageWidthPx, pageHeightPx, 0, 0, pageWidthPx, pageHeightPx);
        }

        // 4. Convert to Blob
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
