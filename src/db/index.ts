import Dexie, { Table } from 'dexie';
import { Spread } from '../types';

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

export interface SpreadThumbnailRecord {
    id: string;           // albumId-spreadId
    albumId: string;
    spreadId: string;
    dataUrl: string;      // Base64 data URL
    contentHash: string;  // Hash of spread content for cache invalidation
    timestamp: number;
}

export interface SettingsRecord {
    key: string;
    value: string;
}

// Database class
class AlbumDatabase extends Dexie {
    albums!: Table<AlbumRecord, string>;
    thumbnailCache!: Table<ThumbnailCacheRecord, string>;
    spreadThumbnails!: Table<SpreadThumbnailRecord, string>;
    settings!: Table<SettingsRecord, string>;

    constructor() {
        super('AlbumEditorDB');

        this.version(1).stores({
            albums: 'id, name, lastModified',
            thumbnailCache: 'url, timestamp',
            settings: 'key',
        });

        // Version 2: Add spread thumbnails
        // Note: We are changing the schema of spreadThumbnails to use spreadId.
        // If users have existing v2 data with spreadIndex, this might cause issues or just be ignored/overwritten.
        this.version(2).stores({
            albums: 'id, name, lastModified',
            thumbnailCache: 'url, timestamp',
            spreadThumbnails: 'id, albumId, spreadIndex, timestamp', // Legacy
            settings: 'key',
        });

        this.version(3).stores({
            spreadThumbnails: 'id, albumId, spreadId, timestamp', // New schema
        }).upgrade(tx => {
            // Optional: migrate or clear old thumbnails. Clearing is safer/easier.
            return tx.table('spreadThumbnails').clear();
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

// Helper functions for spread thumbnails
export const spreadThumbnailDB = {
    async get(albumId: string, spreadId: string): Promise<SpreadThumbnailRecord | null> {
        const id = `${albumId}-${spreadId}`;
        const record = await db.spreadThumbnails.get(id);
        return record ?? null;
    },

    async set(
        albumId: string,
        spreadId: string,
        dataUrl: string,
        contentHash: string
    ): Promise<void> {
        const id = `${albumId}-${spreadId}`;
        await db.spreadThumbnails.put({
            id,
            albumId,
            spreadId,
            dataUrl,
            contentHash,
            timestamp: Date.now(),
        });
    },

    async delete(albumId: string, spreadId: string): Promise<void> {
        const id = `${albumId}-${spreadId}`;
        await db.spreadThumbnails.delete(id);
    },

    async deleteForAlbum(albumId: string): Promise<number> {
        return db.spreadThumbnails.where('albumId').equals(albumId).delete();
    },

    async clear(): Promise<void> {
        await db.spreadThumbnails.clear();
    },

    async getAllForAlbum(albumId: string): Promise<SpreadThumbnailRecord[]> {
        return db.spreadThumbnails.where('albumId').equals(albumId).toArray();
    },
};

// Generate a simple hash from spread content for cache invalidation
export function generateSpreadContentHash(spread: Spread): string {
    const content = spread.elements.map(e => {
        if (e.box) {
             // Use box coordinates
             return `${e.id}:box:${e.box.x1.toFixed(4)},${e.box.y1.toFixed(4)},${e.box.x2.toFixed(4)},${e.box.y2.toFixed(4)}`;
        }
        if (e.position && e.size) {
             // Use legacy position/size
             return `${e.id}:pos:${e.position.x.toFixed(1)},${e.position.y.toFixed(1)}:${e.size.width.toFixed(1)},${e.size.height.toFixed(1)}`;
        }
        return `${e.id}:unknown`;
    }).join('|');

    // Include background
    const bg = spread.background || 'white';
    const fullContent = `${bg}|${content}`;

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < fullContent.length; i++) {
        const char = fullContent.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(36);
}
