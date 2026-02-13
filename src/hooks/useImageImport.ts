import { useState, useCallback } from 'react';
import type { PoolImage } from '../types';
import type { SourceImage } from '../sources';
import { getSource } from '../sources';
import { usePageWidth, usePageHeight } from '../states/albumStore';
import {
    calculateThumbnailSize,
    calculateCanvasMaxDimensions,
} from '../utils/imageUtils';

export const useImageImport = (onImport: (images: PoolImage[]) => void) => {
    const [isLoading, setIsLoading] = useState(false);
    const pageWidth = usePageWidth();
    const pageHeight = usePageHeight();

    const importImages = useCallback(async (activeSourceId: string) => {
        const activeSource = getSource(activeSourceId);
        if (!activeSource || !pageWidth || !pageHeight) return;

        // Check if auth required
        if (activeSource.requiresAuth && !activeSource.isAuthenticated()) {
            try {
                await activeSource.connect();
            } catch (error) {
                console.error('Failed to connect to source:', error);
                alert(`Failed to connect to ${activeSource.name}. Please try again.`);
                return;
            }
        }

        setIsLoading(true);
        try {
            const result = await activeSource.fetchImages();

            // Calculate canvas max dimensions based on album settings
            const { maxWidth, maxHeight } = calculateCanvasMaxDimensions(
                pageWidth,
                pageHeight
            );

            // Convert source images to pool images with optimal thumbnail sizes
            const poolImages: PoolImage[] = result.images.map((img: SourceImage) => {
                // Calculate optimal thumbnail size for this image
                const thumbSize = calculateThumbnailSize(
                    img.width,
                    img.height,
                    maxWidth,
                    maxHeight
                );

                return {
                    id: crypto.randomUUID(),
                    sourceId: activeSource.id,
                    sourceImageId: img.id,
                    baseUrl: activeSource.getFullUrl(img),
                    thumbnailUrl: activeSource.getThumbnailUrl(img, thumbSize.width, thumbSize.height),
                    filename: img.filename,
                    mimeType: img.mimeType,
                    width: img.width,
                    height: img.height,
                    thumbnailWidth: thumbSize.width,
                    thumbnailHeight: thumbSize.height,
                    createdAt: img.createdAt,
                };
            });

            onImport(poolImages);
        } catch (error) {
            console.error('Failed to import from source:', error);
            alert(`Failed to import from ${activeSource.name}. Please try again.`);
        } finally {
            setIsLoading(false);
        }
    }, [pageWidth, pageHeight, onImport]);

    return { importImages, isLoading };
};
