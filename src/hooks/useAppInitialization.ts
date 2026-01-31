import { useState, useEffect } from 'react';
import type { Album } from '../types';
import { APP_CONFIG } from '../config';
import {
  albumStorage,
  createNewAlbum,
  loadFromLocalStorage,
  clearLocalStorage,
} from '../services/storage';
import { initializeSources } from '../sources';

export const useAppInitialization = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [initialAlbum, setInitialAlbum] = useState<Album | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        // Initialize photo sources
        await initializeSources();

        // Check for legacy localStorage data and migrate
        const legacyAlbum = loadFromLocalStorage();
        if (legacyAlbum) {
          // Migrate to IndexedDB with settings
          const migrated: Album = {
            ...legacyAlbum,
            id: crypto.randomUUID(),
            settings: legacyAlbum.settings || { ...APP_CONFIG.DEFAULT_ALBUM_SETTINGS },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          await albumStorage.saveAlbum(migrated);
          await albumStorage.setCurrentAlbumId(migrated.id);
          clearLocalStorage();
          setInitialAlbum(migrated);
        } else {
          // Load from IndexedDB
          const album = await albumStorage.loadCurrentAlbum();
          // Ensure settings exist
          if (!album.settings) {
            album.settings = { ...APP_CONFIG.DEFAULT_ALBUM_SETTINGS };
          }
          setInitialAlbum(album);
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
        // Fallback to new album
        setInitialAlbum(createNewAlbum());
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  return { isLoading, initialAlbum };
};
