import { APP_CONFIG } from '../config';

/**
 * Calculate optimal thumbnail dimensions that fit within canvas max bounds
 * while respecting original image dimensions.
 *
 * @param originalWidth - Full resolution width in pixels
 * @param originalHeight - Full resolution height in pixels
 * @param maxWidth - Maximum allowed width (canvas width in screen pixels)
 * @param maxHeight - Maximum allowed height (canvas height in screen pixels)
 * @returns Optimal thumbnail dimensions
 */
export function calculateThumbnailSize(
    originalWidth: number | undefined,
    originalHeight: number | undefined,
    maxWidth: number,
    maxHeight: number
): { width: number; height: number } {
    // If original dimensions unknown, use max dimensions
    if (!originalWidth || !originalHeight) {
        return { width: maxWidth, height: maxHeight };
    }

    // If original fits within max bounds, use original
    if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
        return { width: originalWidth, height: originalHeight };
    }

    // Scale down to fit within max bounds while preserving aspect ratio
    const aspectRatio = originalWidth / originalHeight;
    const maxAspectRatio = maxWidth / maxHeight;

    let width: number;
    let height: number;

    if (aspectRatio > maxAspectRatio) {
        // Image is wider than max bounds - constrain by width
        width = maxWidth;
        height = Math.round(maxWidth / aspectRatio);
    } else {
        // Image is taller than max bounds - constrain by height
        height = maxHeight;
        width = Math.round(maxHeight * aspectRatio);
    }

    return { width, height };
}

/**
 * Calculate canvas max dimensions in screen pixels based on album settings.
 *
 * @param pageWidth - Page width in inches
 * @param pageHeight - Page height in inches
 * @returns Max canvas dimensions in screen pixels
 */
export function calculateCanvasMaxDimensions(
    pageWidth: number,
    pageHeight: number
): { maxWidth: number; maxHeight: number } {
    // Spread is two pages wide
    const spreadWidth = pageWidth * 2;
    const maxWidth = Math.round(spreadWidth * APP_CONFIG.SCREEN_PPI);
    const maxHeight = Math.round(pageHeight * APP_CONFIG.SCREEN_PPI);

    return { maxWidth, maxHeight };
}

/**
 * Convert from model pixels (print resolution at PPI) to canvas/screen pixels.
 * Used when rendering model coordinates to the screen.
 *
 * @param value - Value in model pixels (at APP_CONFIG.PPI)
 * @returns Value in screen pixels (at APP_CONFIG.SCREEN_PPI)
 */
export function toCanvasPx(value: number): number {
    return value * (APP_CONFIG.SCREEN_PPI / APP_CONFIG.PPI);
}

/**
 * Convert from canvas/screen pixels to model pixels (print resolution at PPI).
 * Used when converting screen coordinates to model coordinates.
 *
 * @param value - Value in screen pixels (at APP_CONFIG.SCREEN_PPI)
 * @returns Value in model pixels (at APP_CONFIG.PPI)
 */
export function toModelPx(value: number): number {
    return value * (APP_CONFIG.PPI / APP_CONFIG.SCREEN_PPI);
}
/**
 * Calculate integer pixel boundaries for a normalized box to prevent gaps.
 * This ensures that adjacent elements share the exact same integer pixel boundary.
 *
 * @param box - Normalized box model with x1, y1, x2, y2 (0.0 to 1.0)
 * @param canvasWidth - Current canvas width in screen or print pixels
 * @param canvasHeight - Current canvas height in screen or print pixels
 * @returns Integer pixel coordinates and dimensions
 */
export function calculateGaplessRect(
    box: { x1: number; y1: number; x2: number; y2: number },
    canvasWidth: number,
    canvasHeight: number
) {
    const left = Math.round(box.x1 * canvasWidth);
    const top = Math.round(box.y1 * canvasHeight);
    const right = Math.round(box.x2 * canvasWidth);
    const bottom = Math.round(box.y2 * canvasHeight);

    return {
        left,
        top,
        width: right - left,
        height: bottom - top,
    };
}

/**
 * Calculates scale and position for an image to "cover" a frame (background-size: cover).
 * Supports additional zoom and panning within the frame.
 *
 * @param frameWidth - Width of the container/frame
 * @param frameHeight - Height of the container/frame
 * @param imageWidth - Natural width of the image
 * @param imageHeight - Natural height of the image
 * @param transform - Zoom and pan parameters (panX/panY 0.0 to 1.0)
 */
export function applyCoverTransform(
    frameWidth: number,
    frameHeight: number,
    imageWidth: number,
    imageHeight: number,
    partialTransform: Partial<{ zoom: number; panX: number; panY: number; rotation: number; flipH: boolean; flipV: boolean }> = {}
) {
    const transform = {
        zoom: 1,
        panX: 0.5,
        panY: 0.5,
        rotation: 0,
        flipH: false,
        flipV: false,
        ...partialTransform
    };

    // Swap image dimensions if rotated 90 or 270 degrees
    let effectiveImageWidth = imageWidth;
    let effectiveImageHeight = imageHeight;
    if (transform.rotation % 180 !== 0) {
        effectiveImageWidth = imageHeight;
        effectiveImageHeight = imageWidth;
    }

    const frameRatio = frameWidth / frameHeight;
    const imageRatio = effectiveImageWidth / effectiveImageHeight;

    let scale: number;
    if (imageRatio > frameRatio) {
        // Image is wider than frame - fit to height
        scale = frameHeight / effectiveImageHeight;
    } else {
        // Image is taller than frame - fit to width
        scale = frameWidth / effectiveImageWidth;
    }

    // Apply additional zoom relative to the "cover" scale
    scale *= transform.zoom;

    const scaledWidth = effectiveImageWidth * scale;
    const scaledHeight = effectiveImageHeight * scale;

    // Pan (0.0 to 1.0). 0.5 is centered.
    // We calculate left/top so the image stays within the frame if pan=0.5 and zoom=1.
    const left = (frameWidth - scaledWidth) * transform.panX;
    const top = (frameHeight - scaledHeight) * transform.panY;

    return {
        left,
        top,
        scale,
        width: scaledWidth,
        height: scaledHeight,
        canPanX: scaledWidth > frameWidth + 0.1, // Float tolerance
        canPanY: scaledHeight > frameHeight + 0.1,
        overflowWidth: Math.max(0, scaledWidth - frameWidth),
        overflowHeight: Math.max(0, scaledHeight - frameHeight),
    };
}
