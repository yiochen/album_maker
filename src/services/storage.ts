import type { Album, Page, TemplateId } from '../types';
import { DEFAULT_ALBUM_SETTINGS } from '../types';
import { albumDB, settingsDB } from '../db';

const CURRENT_ALBUM_KEY = 'currentAlbumId';

// Create a new empty album
export const createNewAlbum = (name: string = 'Untitled Album'): Album => {
    const now = Date.now();
    const albumId = crypto.randomUUID();

    return {
        id: albumId,
        name,
        settings: { ...DEFAULT_ALBUM_SETTINGS },
        createdAt: now,
        updatedAt: now,
        pages: [createNewPage(), createNewPage()], // Start with one spread (2 pages)
        imagePool: [],
    };
};

// Create a new empty page
export const createNewPage = (templateId: TemplateId = 'fullpage'): Page => {
    return {
        id: crypto.randomUUID(),
        templateId,
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

        try {
            return JSON.parse(record.data) as Album;
        } catch {
            console.error('Failed to parse album data');
            return null;
        }
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
        return settingsDB.get(CURRENT_ALBUM_KEY);
    },

    // Set current album ID
    async setCurrentAlbumId(id: string): Promise<void> {
        await settingsDB.set(CURRENT_ALBUM_KEY, id);
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

// Auto-save with debouncing
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
const SAVE_DELAY = 1000; // 1 second debounce

export const debouncedSave = (album: Album): void => {
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }

    saveTimeout = setTimeout(async () => {
        try {
            await albumStorage.saveAlbum(album);
            console.debug('Album auto-saved');
        } catch (error) {
            console.error('Failed to auto-save album:', error);
        }
    }, SAVE_DELAY);
};

export const immediatelyFlushSave = async (album: Album): Promise<void> => {
    if (saveTimeout) {
        clearTimeout(saveTimeout);
        saveTimeout = null;
    }
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
        const data = localStorage.getItem('albumEditor_album');
        if (!data) return null;
        return JSON.parse(data) as Album;
    } catch {
        return null;
    }
};

// Legacy: Clear localStorage after migration
export const clearLocalStorage = (): void => {
    localStorage.removeItem('albumEditor_album');
};
