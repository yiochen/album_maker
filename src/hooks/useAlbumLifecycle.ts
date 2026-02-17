import { useCallback } from 'react';
import { useAlbumStore } from '../states/albumStore';
import { useUIStore } from '../states/uiStore';
import { APP_CONFIG } from '../config';
import {
    albumStorage,
    createNewAlbum,
    exportAlbumAsJson,
    importAlbumFromJson,
} from '../services/storage';

/**
 * Hook for album lifecycle operations.
 * Handles CRUD operations and import/export functionality.
 */
export const useAlbumLifecycle = () => {
    const { album, setAlbum } = useAlbumStore();
    const { setCurrentSpreadIndex, setSelectedElementId } = useUIStore();

    /**
     * Resets UI state to initial values after album changes.
     */
    const resetUIState = useCallback(() => {
        setCurrentSpreadIndex(0);
        setSelectedElementId(null);
    }, [setCurrentSpreadIndex, setSelectedElementId]);

    /**
     * Loads and switches to an existing album by ID.
     */
    const handleSelectAlbum = useCallback(
        async (id: string) => {
            const newAlbum = await albumStorage.loadAlbum(id);
            if (newAlbum) {
                if (!newAlbum.settings) {
                    newAlbum.settings = { ...APP_CONFIG.DEFAULT_ALBUM_SETTINGS };
                }
                await albumStorage.setCurrentAlbumId(id);
                setAlbum(newAlbum);
                resetUIState();
            }
        },
        [setAlbum, resetUIState]
    );

    /**
     * Creates a new album with the given name.
     */
    const handleCreateAlbum = useCallback(
        async (name: string) => {
            const newAlbum = createNewAlbum(name);
            await albumStorage.saveAlbum(newAlbum);
            await albumStorage.setCurrentAlbumId(newAlbum.id);
            setAlbum(newAlbum);
            resetUIState();
        },
        [setAlbum, resetUIState]
    );

    /**
     * Deletes an album by ID.
     */
    const handleDeleteAlbum = useCallback(async (id: string) => {
        await albumStorage.deleteAlbum(id);

        // Clear thumbnail cache for this album
        try {
            const cache = await caches.open('spread-thumbnails-v1');
            const keys = await cache.keys();
            const prefix = `/__local__/spreadThumbnails/${id}/`;

            for (const request of keys) {
                if (new URL(request.url).pathname.startsWith(prefix)) {
                    await cache.delete(request);
                }
            }
        } catch (e) {
            console.warn('Failed to clean up album cache:', e);
        }
    }, []);

    /**
     * Imports an album from a JSON file.
     */
    const handleImportAlbum = useCallback(async () => {
        try {
            const imported = await importAlbumFromJson();
            if (!imported.settings) {
                imported.settings = { ...APP_CONFIG.DEFAULT_ALBUM_SETTINGS };
            }
            setAlbum(imported);
            resetUIState();
        } catch (error) {
            console.error('Failed to import album:', error);
        }
    }, [setAlbum, resetUIState]);

    /**
     * Exports the current album to a JSON file.
     */
    const handleExportAlbum = useCallback(() => {
        if (album) exportAlbumAsJson(album);
    }, [album]);

    return {
        handleSelectAlbum,
        handleCreateAlbum,
        handleDeleteAlbum,
        handleImportAlbum,
        handleExportAlbum,
    };
};
