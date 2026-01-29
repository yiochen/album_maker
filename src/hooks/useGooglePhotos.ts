import { useState, useEffect, useCallback } from 'react';
import { PoolImage } from '../types';
import {
    initGoogleAuth,
    requestAuth,
    isAuthenticated as checkAuth,
    signOut as googleSignOut,
    fetchMediaItems,
    fetchAlbums,
} from '../services/googlePhotos';

export interface UseGooglePhotosReturn {
    isInitialized: boolean;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    connect: () => Promise<void>;
    disconnect: () => void;
    importPhotos: (albumId?: string) => Promise<PoolImage[]>;
    getAlbums: () => Promise<{ id: string; title: string }[]>;
}

export const useGooglePhotos = (): UseGooglePhotosReturn => {
    const [isInitialized, setIsInitialized] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize Google Auth on mount
    useEffect(() => {
        const init = async () => {
            try {
                await initGoogleAuth();
                setIsInitialized(true);
                setIsAuthenticated(checkAuth());
            } catch (err) {
                console.error('Failed to initialize Google Auth:', err);
                setError('Failed to initialize Google authentication');
            }
        };

        init();
    }, []);

    // Connect to Google Photos
    const connect = useCallback(async () => {
        if (!isInitialized) {
            setError('Google Auth not initialized');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            await requestAuth();
            setIsAuthenticated(true);
        } catch (err) {
            console.error('Authentication failed:', err);
            setError('Failed to connect to Google Photos');
        } finally {
            setIsLoading(false);
        }
    }, [isInitialized]);

    // Disconnect from Google Photos
    const disconnect = useCallback(() => {
        googleSignOut();
        setIsAuthenticated(false);
    }, []);

    // Import photos from Google Photos
    const importPhotos = useCallback(async (albumId?: string): Promise<PoolImage[]> => {
        if (!isAuthenticated) {
            throw new Error('Not authenticated');
        }

        setIsLoading(true);
        setError(null);

        try {
            const photos = await fetchMediaItems(albumId);
            return photos;
        } catch (err) {
            console.error('Failed to import photos:', err);
            setError('Failed to import photos from Google Photos');
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    // Get list of albums
    const getAlbums = useCallback(async () => {
        if (!isAuthenticated) {
            throw new Error('Not authenticated');
        }

        try {
            const albums = await fetchAlbums();
            return albums.map(a => ({ id: a.id, title: a.title }));
        } catch (err) {
            console.error('Failed to fetch albums:', err);
            throw err;
        }
    }, [isAuthenticated]);

    return {
        isInitialized,
        isAuthenticated,
        isLoading,
        error,
        connect,
        disconnect,
        importPhotos,
        getAlbums,
    };
};
