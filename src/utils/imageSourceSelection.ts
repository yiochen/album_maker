import type { ImageContent } from '../types';

/**
 * Select the most appropriate image URL for a render target PPI.
 * Keep this shared between editor (Fabric) and export (OffscreenCanvas)
 * so quality-tier behavior stays consistent.
 */
export function getImageUrlForPpi(content: ImageContent, ppi: number): string {
    if (ppi < 50) return content.thumbnailUrl;
    if (ppi < 200) return content.previewUrl;
    return content.fullUrl;
}

