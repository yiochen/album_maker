import { useState, useEffect, useRef } from 'react';
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

/**
 * Hook for initializing the application state.
 *
 * Responsibilities:
 * 1. Initializes external photo sources.
 * 2. Checks for legacy localStorage data and migrates it to IndexedDB.
 * 3. Loads the most recent album from IndexedDB (or creates a new one).
 * 4. Handles database errors by optionally clearing the DB and resetting.
 *
 * @returns An object containing the loading state.
 */
export const useAppInitialization = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { setAlbum } = useAlbumStore();
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;

    const init = async () => {
      try {
        // Initialize photo sources
        await initializeSources();

        if (!isMounted.current) return;

        let albumToSet: Album | null = null;

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
          // Load from IndexedDB with a timeout to prevent infinite hangs
          // (e.g., if IndexedDB is locked or corrupted)
          const loadPromise = albumStorage.loadCurrentAlbum();
          const timeoutPromise = new Promise<null>((resolve) =>
            setTimeout(() => {
              if (isMounted.current) console.warn('DB load timed out, falling back to new album');
              resolve(null);
            }, 3000)
          );

          const loadedAlbum = await Promise.race([loadPromise, timeoutPromise]);

          if (loadedAlbum) {
            // Ensure settings exist
            if (!loadedAlbum.settings) {
              loadedAlbum.settings = { ...APP_CONFIG.DEFAULT_ALBUM_SETTINGS };
            }
            albumToSet = loadedAlbum;
          }
        }

        if (isMounted.current) {
          // If loading failed or timed out, create a new album
          setAlbum(albumToSet || createNewAlbum());
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);

        // Prevent multiple resets if unmounted
        if (!isMounted.current) return;

        if (APP_CONFIG.CLEAR_INDEX_DB_ON_LOAD_ERROR) {
          console.warn('Clearing IndexedDB due to load error...');
          try {
            await db.delete();
            await db.open();
          } catch (dbError) {
            console.error('Failed to clear/reset DB:', dbError);
          }
        }

        // Fallback to new album
        if (isMounted.current) {
          setAlbum(createNewAlbum());
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    };

    init();

    return () => {
      isMounted.current = false;
      // Close the DB connection on unmount to prevent locking issues in tests
      db.close();
    };
  }, [setAlbum]);

  return { isLoading };
};
