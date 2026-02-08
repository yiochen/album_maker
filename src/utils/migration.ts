import { PageElement, AlbumSettings } from '../types';
import { APP_CONFIG } from '../config';

/**
 * Migrates a PageElement from the old pixel-based layout (position/size)
 * to the new normalized gapless layout (box).
 *
 * @param element The element to migrate
 * @param settings Album settings (needed for page dimensions)
 * @returns The migrated element with 'box' and 'contentTransform' populated
 */
export function migratePageElement(element: PageElement, settings: AlbumSettings): PageElement {
    // If already migrated, return as is
    if (element.box && element.contentTransform) {
        return element;
    }

    // Clone element to avoid mutation
    const migrated = { ...element };

    // Default dimensions if missing (shouldn't happen for valid elements)
    const modelWidth = settings.pageWidth * 2 * APP_CONFIG.PPI;
    const modelHeight = settings.pageHeight * APP_CONFIG.PPI;

    // Convert position/size to box
    if (element.position && element.size) {
        // Calculate edges from center position and size
        const halfWidth = element.size.width / 2;
        const halfHeight = element.size.height / 2;

        const left = element.position.x - halfWidth;
        const top = element.position.y - halfHeight;
        const right = element.position.x + halfWidth;
        const bottom = element.position.y + halfHeight;

        // Normalize to 0-1
        migrated.box = {
            x1: Math.max(0, Math.min(1, left / modelWidth)),
            y1: Math.max(0, Math.min(1, top / modelHeight)),
            x2: Math.max(0, Math.min(1, right / modelWidth)),
            y2: Math.max(0, Math.min(1, bottom / modelHeight))
        };
    } else {
        // Fallback for elements without position/size (e.g. just dropped?)
        // Default to a small box in the center
        migrated.box = {
            x1: 0.4,
            y1: 0.4,
            x2: 0.6,
            y2: 0.6
        };
    }

    // Convert crop to contentTransform
    if (element.crop) {
        // This is complex because 'crop' was likely in pixels or relative to image
        // For now, we'll reset to 'cover' (default contentTransform)
        // Implementing full crop migration requires knowing the original image aspect ratio vs frame aspect ratio
        // which might be tricky here without image metadata.
        // Given 'SmartFrame' handles 'cover' by default, we can start with defaults.
        migrated.contentTransform = {
            zoom: 1,
            panX: 0.5,
            panY: 0.5,
            rotation: 0
        };
    } else {
        migrated.contentTransform = {
            zoom: 1,
            panX: 0.5,
            panY: 0.5,
            rotation: 0
        };
    }

    // Set type to 'smartFrame'
    migrated.type = 'smartFrame';

    return migrated;
}

/**
 * Helper to get pixel dimensions from a normalized box
 */
export function getBoxDimensions(
    box: { x1: number, y1: number, x2: number, y2: number },
    canvasWidth: number,
    canvasHeight: number
) {
    // Integer rounding for gapless rendering
    const left = Math.round(box.x1 * canvasWidth);
    const top = Math.round(box.y1 * canvasHeight);
    const right = Math.round(box.x2 * canvasWidth);
    const bottom = Math.round(box.y2 * canvasHeight);

    return {
        left,
        top,
        width: right - left,
        height: bottom - top
    };
}
