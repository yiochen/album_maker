import Dexie, { Table } from 'dexie';

// Types for database
export interface AlbumRecord {
    id: string;
    name: string;
    lastModified: number;
    data: string; // JSON stringified Album
}

export interface ThumbnailCacheRecord {
    url: string;
    blob: Blob;
    timestamp: number;
    size: number; // thumbnail size
}

export interface SettingsRecord {
    key: string;
    value: string;
}

// Database class
class AlbumDatabase extends Dexie {
    albums!: Table<AlbumRecord, string>;
    thumbnailCache!: Table<ThumbnailCacheRecord, string>;
    settings!: Table<SettingsRecord, string>;

    constructor() {
        super('AlbumEditorDB');

        this.version(1).stores({
            albums: 'id, name, lastModified',
            thumbnailCache: 'url, timestamp',
            settings: 'key',
        });
    }
}

// Singleton instance
export const db = new AlbumDatabase();

// Thumbnail cache TTL (7 days)
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

// Helper functions for album operations
export const albumDB = {
    async getAll(): Promise<AlbumRecord[]> {
        return db.albums.orderBy('lastModified').reverse().toArray();
    },

    async get(id: string): Promise<AlbumRecord | undefined> {
        return db.albums.get(id);
    },

    async save(album: AlbumRecord): Promise<void> {
        await db.albums.put({
            ...album,
            lastModified: Date.now(),
        });
    },

    async delete(id: string): Promise<void> {
        await db.albums.delete(id);
    },

    async exists(id: string): Promise<boolean> {
        const count = await db.albums.where('id').equals(id).count();
        return count > 0;
    },
};

// Helper functions for thumbnail cache
export const thumbnailDB = {
    async get(url: string): Promise<Blob | null> {
        const record = await db.thumbnailCache.get(url);
        if (!record) return null;

        // Check if cache is expired
        if (Date.now() - record.timestamp > CACHE_TTL) {
            await db.thumbnailCache.delete(url);
            return null;
        }

        return record.blob;
    },

    async set(url: string, blob: Blob, size: number): Promise<void> {
        await db.thumbnailCache.put({
            url,
            blob,
            timestamp: Date.now(),
            size,
        });
    },

    async delete(url: string): Promise<void> {
        await db.thumbnailCache.delete(url);
    },

    async clear(): Promise<void> {
        await db.thumbnailCache.clear();
    },

    async cleanup(): Promise<number> {
        const expired = Date.now() - CACHE_TTL;
        const count = await db.thumbnailCache
            .where('timestamp')
            .below(expired)
            .delete();
        return count;
    },

    async getSize(): Promise<number> {
        const all = await db.thumbnailCache.toArray();
        return all.reduce((sum, record) => sum + record.blob.size, 0);
    },
};

// Helper functions for settings
export const settingsDB = {
    async get(key: string): Promise<string | null> {
        const record = await db.settings.get(key);
        return record?.value ?? null;
    },

    async set(key: string, value: string): Promise<void> {
        await db.settings.put({ key, value });
    },

    async delete(key: string): Promise<void> {
        await db.settings.delete(key);
    },
};
