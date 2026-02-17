import type { Album, Spread } from '../types';
import { APP_CONFIG } from '../config';
import { albumDB, settingsDB } from '../db';
import Ajv from 'ajv';
import albumSchema from '../schemas/albumSchema.json';

const ajv = new Ajv();
const validateAlbum = ajv.compile(albumSchema);

// Create a new empty album
export const createNewAlbum = (name: string = 'Untitled Album'): Album => {
    const now = Date.now();
    const albumId = crypto.randomUUID();

    return {
        id: albumId,
        name,
        settings: { ...APP_CONFIG.DEFAULT_ALBUM_SETTINGS },
        createdAt: now,
        updatedAt: now,
        spreads: [createNewSpread()], // Start with one spread
        imagePool: [],
    };
};

// Create a new empty spread
export const createNewSpread = (): Spread => {
    return {
        id: crypto.randomUUID(),
        versionId: crypto.randomUUID(),
        elements: [],
        background: '#ffffff',
    };
};

// Album operations using IndexedDB
export const albumStorage = {
    // Get all albums (metadata only)
    async getAllAlbums(): Promise<{ id: string; name: string; lastModified: number }[]> {
        const records = await albumDB.getAll();
        return records.map(r => ({
            id: r.id,
            name: r.name,
            lastModified: r.lastModified,
        }));
    },

    // Load a specific album
    async loadAlbum(id: string): Promise<Album | null> {
        const record = await albumDB.get(id);
        if (!record) return null;

        let data: unknown;
        try {
            data = JSON.parse(record.data);
        } catch {
            console.error('Failed to parse album data');
            return null;
        }

        if (!validateAlbum(data)) {
            console.error('Schema validation failed:', validateAlbum.errors);
            // Throwing here allows useAppInitialization to catch this error and optionally clear the DB
            // based on APP_CONFIG.CLEAR_INDEX_DB_ON_LOAD_ERROR.
            throw new Error('Schema validation failed');
        }

        return data as Album;
    },

    // Save an album
    async saveAlbum(album: Album): Promise<void> {
        await albumDB.save({
            id: album.id,
            name: album.name,
            lastModified: Date.now(),
            data: JSON.stringify(album),
        });
    },

    // Delete an album
    async deleteAlbum(id: string): Promise<void> {
        await albumDB.delete(id);
    },

    // Get current album ID
    async getCurrentAlbumId(): Promise<string | null> {
        return settingsDB.get(APP_CONFIG.CURRENT_ALBUM_KEY);
    },

    // Set current album ID
    async setCurrentAlbumId(id: string): Promise<void> {
        await settingsDB.set(APP_CONFIG.CURRENT_ALBUM_KEY, id);
    },

    // Load current album or create new one
    async loadCurrentAlbum(): Promise<Album> {
        const currentId = await this.getCurrentAlbumId();

        if (currentId) {
            const album = await this.loadAlbum(currentId);
            if (album) return album;
        }

        // No current album, create a new one
        const newAlbum = createNewAlbum();
        await this.saveAlbum(newAlbum);
        await this.setCurrentAlbumId(newAlbum.id);
        return newAlbum;
    },
};

// Auto-save with microtask bundling
// Using a microtask ensures that multiple synchronous state changes 
// (e.g., updating multiple elements, or updating box + content)
// are bundled into a single IndexedDB write at the end of the current tick.
let isSavePending = false;
let pendingAlbumToSave: Album | null = null;

export const debouncedSave = (album: Album): void => {
    pendingAlbumToSave = album;

    if (!isSavePending) {
        isSavePending = true;
        queueMicrotask(async () => {
            if (!pendingAlbumToSave) {
                isSavePending = false;
                return;
            }

            const albumToSave = pendingAlbumToSave;
            pendingAlbumToSave = null;
            isSavePending = false;

            try {
                await albumStorage.saveAlbum(albumToSave);
                console.debug('Album auto-saved (microtask)');
            } catch (error) {
                console.error('Failed to auto-save album:', error);
            }
        });
    }
};

export const immediatelyFlushSave = async (album: Album): Promise<void> => {
    pendingAlbumToSave = null;
    isSavePending = false;
    await albumStorage.saveAlbum(album);
};

// Export album as JSON file (for download)
export const exportAlbumAsJson = (album: Album): void => {
    const data = JSON.stringify(album, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${album.name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

// Import album from JSON file
export const importAlbumFromJson = (): Promise<Album> => {
    return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) {
                reject(new Error('No file selected'));
                return;
            }

            try {
                const text = await file.text();
                const album = JSON.parse(text) as Album;

                // Generate new ID for imported album to avoid conflicts
                album.id = crypto.randomUUID();
                album.updatedAt = Date.now();

                // Save to IndexedDB
                await albumStorage.saveAlbum(album);
                await albumStorage.setCurrentAlbumId(album.id);

                resolve(album);
            } catch {
                reject(new Error('Failed to parse album file'));
            }
        };

        input.click();
    });
};

// Legacy: Load from localStorage (for migration)
export const loadFromLocalStorage = (): Album | null => {
    try {
        const data = localStorage.getItem(APP_CONFIG.LOCAL_STORAGE_KEY);
        if (!data) return null;
        return JSON.parse(data) as Album;
    } catch {
        return null;
    }
};

// Legacy: Clear localStorage after migration
export const clearLocalStorage = (): void => {
    localStorage.removeItem(APP_CONFIG.LOCAL_STORAGE_KEY);
};
