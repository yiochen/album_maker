import { useEffect, useRef } from 'react';
import { Album } from '../types';
import { debouncedSave, immediatelyFlushSave } from '../services/storage';

export const useAutoSave = (album: Album) => {
    const lastSavedRef = useRef<string>('');

    useEffect(() => {
        const albumJson = JSON.stringify(album);

        // Only save if actually changed
        if (albumJson !== lastSavedRef.current) {
            lastSavedRef.current = albumJson;
            debouncedSave(album);
        }
    }, [album]);

    // Flush save on unmount or page unload
    useEffect(() => {
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
