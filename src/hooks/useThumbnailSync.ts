import { useCallback } from 'react';
import { useAlbum } from '../states/albumStore';
import { useCurrentSpreadIndex } from '../states/uiStore';
import { spreadThumbnailDB, generateSpreadContentHash } from '../db';

/**
 * Hook for syncing spread thumbnails to IndexedDB.
 * Handles caching of canvas screenshots for the page navigator.
 */
export const useThumbnailSync = () => {
    const album = useAlbum();
    const currentSpreadIndex = useCurrentSpreadIndex();

    /**
     * Saves the current spread's thumbnail to IndexedDB.
     * Called when the canvas content changes.
     */
    const handleCanvasChange = useCallback(
        async (dataUrl: string) => {
            if (!album) return;
            const currentSpread = album.spreads[currentSpreadIndex];
            if (!currentSpread) return;

            const contentHash = generateSpreadContentHash(currentSpread);
            try {
                await spreadThumbnailDB.set(
                    album.id,
                    currentSpread.id,
                    dataUrl,
                    contentHash
                );
            } catch (error) {
                console.warn('Failed to save thumbnail:', error);
            }
        },
        [album, currentSpreadIndex]
    );

    return {
        handleCanvasChange,
    };
};
