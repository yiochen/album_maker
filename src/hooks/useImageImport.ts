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
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const pageWidth = usePageWidth();
    const pageHeight = usePageHeight();

    const importImages = useCallback(async (activeSourceId: string) => {
        const activeSource = getSource(activeSourceId);
        if (!activeSource || !pageWidth || !pageHeight) return false;
        setErrorMessage(null);

        // Check if auth required
        if (activeSource.requiresAuth && !activeSource.isAuthenticated()) {
            try {
                await activeSource.connect();
            } catch (error) {
                console.error('Failed to connect to source:', error);
                setErrorMessage(`Could not connect to ${activeSource.name}. Check your sign-in state and retry.`);
                return false;
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
                    fullUrl: activeSource.getFullUrl(img),
                    previewUrl: activeSource.getPreviewUrl(img),
                    thumbnailUrl: activeSource.getThumbnailUrl(img),
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
            return true;
        } catch (error) {
            console.error('Failed to import from source:', error);
            setErrorMessage(`Import from ${activeSource.name} failed. Please retry in a moment.`);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [pageWidth, pageHeight, onImport]);

    const clearError = useCallback(() => setErrorMessage(null), []);

    return { importImages, isLoading, errorMessage, clearError };
};
