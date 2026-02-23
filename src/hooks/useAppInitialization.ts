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
import { useAlbumStore } from '../states/albumStore';
import { db } from '../db';

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
};

/**
 * Hook for initializing the application state.
 *
 * Responsibilities:
 * 1. Initializes external photo sources.
 * 2. Checks for legacy data in localStorage and migrates it to IndexedDB.
 * 3. Loads the most recent album from IndexedDB (or creates a new one).
 * 4. Handles database errors by optionally clearing the DB and resetting.
 *
 * @returns An object containing the loading state.
 */
export const useAppInitialization = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { setAlbum } = useAlbumStore();

  useEffect(() => {
    const init = async () => {
      try {
        // Initialize photo sources
        await initializeSources();

        let albumToSet: Album;

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
          albumToSet = migrated;
        } else {
          // Load from IndexedDB
          const album = await albumStorage.loadCurrentAlbum();
          // Ensure settings exist
          if (!album.settings) {
            album.settings = { ...APP_CONFIG.DEFAULT_ALBUM_SETTINGS };
          }
          albumToSet = album;
        }
        setAlbum(albumToSet);
      } catch (error) {
        console.error('Failed to initialize app:', error);

        if (APP_CONFIG.CLEAR_INDEX_DB_ON_LOAD_ERROR) {
          console.warn('Clearing IndexedDB due to load error...');
          try {
            await withTimeout(
              db.delete().then(() => db.open()),
              5000,
              'Database reset timed out after 5 seconds'
            );
          } catch (dbError) {
            console.error('Failed to clear/reset DB:', dbError);
          }
        }

        // Fallback to new album
        setAlbum(createNewAlbum());
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [setAlbum]);

  return { isLoading };
};
