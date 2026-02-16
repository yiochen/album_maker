import { Spread, AlbumSettings } from '../types';
import { calculateGaplessRect, applyCoverTransform } from './imageUtils';
import { OffscreenRenderOptions } from './rendererTypes';
import { decomposeForRendering, IDENTITY, getOrientedDimensions } from './orientationMatrix';

/**
 * Helper to load an image as an ImageBitmap in a worker environment.
 */
async function loadImage(url: string): Promise<ImageBitmap> {
    const response = await fetch(url);
    const blob = await response.blob();
    return await createImageBitmap(blob);
}

/**
 * Renders a spread onto an OffscreenCanvas using native 2D Canvas API.
 * Optimized for performance and Web Worker compatibility (no Fabric.js or DOM dependencies).
 * 
 * This mimics the logic of fabricRenderer.ts but for a pure headless context.
 */
export async function renderSpread(
    spread: Spread,
    settings: AlbumSettings,
    canvas: OffscreenCanvas,
    options: OffscreenRenderOptions
): Promise<void> {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Could not get 2D context");

    const ppi = options.ppi;
    const pageWidthPx = Math.round(settings.pageWidth * ppi);
    const pageHeightPx = Math.round(settings.pageHeight * ppi);
    const spreadWidthPx = pageWidthPx * 2;

    // Clear canvas
    ctx.clearRect(0, 0, spreadWidthPx, pageHeightPx);

    // Fill white background for JPEG exports
    if (options.format === 'jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, spreadWidthPx, pageHeightPx);
    }

    // Render elements in Z-Order
    // spread.elements are assumed to be ordered correctly in the store
    for (const element of spread.elements) {
        try {
            const url = options.useThumbnail ? element.content.thumbnailUrl : element.content.imageUrl;
            const bitmap = await loadImage(url);

            // Determine orientation
            const orientation = element.content.contentTransform?.orientation || IDENTITY;

            // Get effective dimensions after rotation/flip for cover calculation
            const oriented = getOrientedDimensions(bitmap.width, bitmap.height, orientation);

            // Calculate the container rect on the spread
            const box = calculateGaplessRect(element.box, spreadWidthPx, pageHeightPx);

            // Calculate image transform within that box (Cover fit)
            const transform = applyCoverTransform(
                box.width,
                box.height,
                oriented.width,
                oriented.height,
                {
                    zoom: element.content.contentTransform?.zoom ?? 1,
                    panX: element.content.contentTransform?.panX ?? 0.5,
                    panY: element.content.contentTransform?.panY ?? 0.5
                }
            );

            ctx.save();

            // 1. Clip to the frame box
            ctx.beginPath();
            ctx.rect(box.left, box.top, box.width, box.height);
            ctx.clip();

            // 2. Handle Orientation/Transform
            // We decompose orientation (D4 matrix) into angle and flipX to match 2D canvas transforms
            const { angleDeg, flipX } = decomposeForRendering(orientation);

            // Move coordinate system to the center of the rendered image area within the frame
            ctx.translate(
                box.left + transform.left + transform.width / 2,
                box.top + transform.top + transform.height / 2
            );

            // Apply flip and rotation (order matters: flip then rotate to match decomposeForRendering)
            if (flipX) ctx.scale(-1, 1);
            if (angleDeg !== 0) ctx.rotate((angleDeg * Math.PI) / 180);

            // 3. Draw image centered
            ctx.drawImage(
                bitmap,
                -transform.width / 2,
                -transform.height / 2,
                transform.width,
                transform.height
            );

            ctx.restore();

            // Cleanup memory
            bitmap.close();
        } catch (error) {
            console.error(`Failed to load or render image for element ${element.id}:`, error);
        }
    }
}
