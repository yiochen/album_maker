
import React from 'react';
import { PhotoSource, SourceImage, FetchImagesResult } from './types';
import { ColorPaletteIcon } from '../components/icons/ColorPaletteIcon';

// Predefined color palette
const COLORS = [
    '#EF4444', // Red
    '#F97316', // Orange
    '#F59E0B', // Amber
    '#EAB308', // Yellow
    '#84CC16', // Lime
    '#22C55E', // Green
    '#10B981', // Emerald
    '#14B8A6', // Teal
    '#06B6D4', // Cyan
    '#0EA5E9', // Sky
    '#3B82F6', // Blue
    '#6366F1', // Indigo
    '#8B5CF6', // Violet
    '#A855F7', // Purple
    '#D946EF', // Fuchsia
    '#EC4899', // Pink
    '#F43F5E', // Rose
    '#78716C', // Stone
    '#64748B', // Slate
    '#1E293B', // Dark slate
];

// Realistic photo sizes (common camera and phone resolutions)
const SIZES = [
    // Landscape photos
    { width: 4032, height: 3024, name: 'iPhone 12MP Landscape' },
    { width: 6000, height: 4000, name: '24MP DSLR Landscape' },
    { width: 5472, height: 3648, name: '20MP Landscape' },
    { width: 4000, height: 3000, name: '12MP Standard Landscape' },
    { width: 3840, height: 2160, name: '4K Landscape' },
    // Portrait photos
    { width: 3024, height: 4032, name: 'iPhone 12MP Portrait' },
    { width: 4000, height: 6000, name: '24MP DSLR Portrait' },
    { width: 3648, height: 5472, name: '20MP Portrait' },
    { width: 3000, height: 4000, name: '12MP Standard Portrait' },
    { width: 2160, height: 3840, name: '4K Portrait' },
];

// Generate all color images
const generateColorImages = (): SourceImage[] => {
    const images: SourceImage[] = [];

    COLORS.forEach((color, colorIndex) => {
        SIZES.forEach((size, sizeIndex) => {
            images.push({
                id: `dummy-${colorIndex}-${sizeIndex}`,
                sourceId: 'dummy-colors',
                filename: `${color.slice(1)}_${size.width}x${size.height}.png`,
                mimeType: 'image/png',
                width: size.width,
                height: size.height,
                metadata: {
                    color,
                    sizeName: size.name,
                },
                thumbnailUrl: buildDummyColorUrl('thumb', color, 400, 300),
                previewUrl: buildDummyColorUrl('preview', color, 1024, 768),
                fullUrl: buildDummyColorUrl('full', color, size.width, size.height),
            });
        });
    });

    return images;
};

/**
 * Builds a local URL for a dummy color image.
 * The service worker intercepts this URL and generates a PNG on the fly.
 *
 * Format: /__local__/dummyColors/<type>/<hex>/<width>x<height>
 * Example: /__local__/dummyColors/full/EF4444/4032x3024
 */
const buildDummyColorUrl = (type: 'full' | 'thumb' | 'preview', color: string, width: number, height: number): string => {
    const hex = color.replace('#', '');
    return `/__local__/dummyColors/${type}/${hex}/${width}x${height}`;
};

class DummyColorsSource implements PhotoSource {
    readonly id = 'dummy-colors';
    readonly name = 'Dummy Colors';
    readonly icon = <ColorPaletteIcon width="20" height="20" />;
    readonly requiresAuth = false;

    private images: SourceImage[] = generateColorImages();

    isAuthenticated(): boolean {
        // No auth required
        return true;
    }

    async connect(): Promise<void> {
        // No-op, always connected
    }

    disconnect(): void {
        // No-op
    }

    async fetchImages(): Promise<FetchImagesResult> {
        return {
            images: this.images,
            hasMore: false,
        };
    }

    getPreviewUrl(image: SourceImage): string {
        const color = image.metadata?.color as string;
        if (!color) return '';
        return buildDummyColorUrl('preview', color, 1024, 768);
    }

    getThumbnailUrl(image: SourceImage): string {
        const color = image.metadata?.color as string;
        if (!color) return '';
        // Use thumb type and smaller dimensions for thumbnails
        return buildDummyColorUrl('thumb', color, 400, 300);
    }

    getFullUrl(image: SourceImage): string {
        const color = image.metadata?.color as string;
        const imgWidth = image.width || 400;
        const imgHeight = image.height || 300;
        if (!color) return '';
        // Use full type for original res
        return buildDummyColorUrl('full', color, imgWidth, imgHeight);
    }
}

// Singleton instance
export const dummyColorsSource = new DummyColorsSource();
