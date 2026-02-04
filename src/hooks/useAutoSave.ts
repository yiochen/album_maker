import { useEffect, useRef } from 'react';
import { Album } from '../types';
import { debouncedSave, immediatelyFlushSave } from '../services/storage';
import { useAlbumStore } from '../states/albumStore';

export const useAutoSave = (albumProp?: Album | null) => {
    // Use store if albumProp not provided
    const storeAlbum = useAlbumStore((state) => state.album);
    const album = albumProp ?? storeAlbum;

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
