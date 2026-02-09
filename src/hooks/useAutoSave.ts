import { useEffect, useRef } from 'react';
import { debouncedSave, immediatelyFlushSave } from '../services/storage';
import { useAlbum } from '../states/albumStore';

/**
 * Hook to automatically save the album state to IndexedDB.
 *
 * It uses a debounced save function to prevent excessive writes during rapid changes,
 * but ensures an immediate flush when the component unmounts or the page unloads.
 */
export const useAutoSave = () => {
    const album = useAlbum();
    const lastSavedRef = useRef<string>('');

    useEffect(() => {
        if (!album) return;

        const albumJson = JSON.stringify(album);

        // Only save if actually changed
        if (albumJson !== lastSavedRef.current) {
            lastSavedRef.current = albumJson;
            debouncedSave(album);
        }
    }, [album]);

    // Flush save on unmount or page unload
    useEffect(() => {
        if (!album) return;

        const handleBeforeUnload = () => {
            immediatelyFlushSave(album);
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            immediatelyFlushSave(album);
        };
    }, [album]);
};
