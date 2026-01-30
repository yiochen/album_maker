
import React from 'react';
import { PhotoSource, SourceImage, FetchImagesResult } from './types';

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

// Predefined sizes
const SIZES = [
    { width: 100, height: 100, name: 'Square Small' },
    { width: 200, height: 200, name: 'Square Medium' },
    { width: 400, height: 400, name: 'Square Large' },
    { width: 400, height: 300, name: 'Landscape 4:3' },
    { width: 800, height: 600, name: 'Landscape HD' },
    { width: 300, height: 400, name: 'Portrait 3:4' },
    { width: 600, height: 800, name: 'Portrait HD' },
    { width: 1920, height: 1080, name: 'Full HD' },
    { width: 1080, height: 1920, name: 'Full HD Portrait' },
];

// Icon component
const ColorPaletteIcon = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" >
        <path d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10c1.38 0 2.5-1.12 2.5-2.5 0-.61-.23-1.2-.64-1.67-.08-.1-.13-.21-.13-.33 0-.28.22-.5.5-.5H16c3.31 0 6-2.69 6-6 0-4.96-4.49-9-10-9zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 8 6.5 8 8 8.67 8 9.5 7.33 11 6.5 11zm3-4C8.67 7 8 6.33 8 5.5S8.67 4 9.5 4s1.5.67 1.5 1.5S10.33 7 9.5 7zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 4 14.5 4s1.5.67 1.5 1.5S15.33 7 14.5 7zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 8 17.5 8s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" fill="currentColor" />
    </svg>
);

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
            });
        });
    });

    return images;
};

// Generate SVG data URL for a solid color
const generateColorSvg = (color: string, width: number, height: number): string => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${color}"/></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

class DummyColorsSource implements PhotoSource {
    readonly id = 'dummy-colors';
    readonly name = 'Dummy Colors';
    readonly icon = ColorPaletteIcon;
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

    getThumbnailUrl(image: SourceImage, size: number): string {
        const color = image.metadata?.color as string;
        if (!color) return '';
        return generateColorSvg(color, size, size);
    }

    getFullUrl(image: SourceImage): string {
        const color = image.metadata?.color as string;
        const width = image.width || 400;
        const height = image.height || 300;
        if (!color) return '';
        return generateColorSvg(color, width, height);
    }
}

// Singleton instance
export const dummyColorsSource = new DummyColorsSource();
