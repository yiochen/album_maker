import { useEffect, useRef } from 'react';
import { Album } from '../types';
import { saveToLocalStorage, saveImmediately } from '../services/storage';

export const useAutoSave = (album: Album, enabled: boolean = true): void => {
    const isFirstRender = useRef(true);

    useEffect(() => {
        // Skip first render to avoid saving initial state
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        if (!enabled) return;

        // Debounced save
        saveToLocalStorage(album);

        // Cleanup: save immediately when component unmounts
        return () => {
            saveImmediately(album);
        };
    }, [album, enabled]);

    // Save on page unload
    useEffect(() => {
        if (!enabled) return;

        const handleBeforeUnload = () => {
            saveImmediately(album);
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [album, enabled]);
};
