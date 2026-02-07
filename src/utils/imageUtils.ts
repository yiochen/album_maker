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
