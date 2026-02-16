import Dexie, { Table } from 'dexie';
import { SpreadThumbnailRecord } from '../types';

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

export interface UploadedImageRecord {
    id: string; // Internal DB Primary Key (UUID)
    sourceImageId: string; // Stable ID (<CreationDate>/<Filename>)
    blob: Blob;
    thumbnailBlob: Blob;
    filename: string;
    mimeType: string;
    width: number;
    height: number;
    createdAt: number;
}

// Database class
class AlbumDatabase extends Dexie {
    albums!: Table<AlbumRecord, string>;
    thumbnailCache!: Table<ThumbnailCacheRecord, string>; // Deprecated/Unused
    spreadThumbnails!: Table<SpreadThumbnailRecord, string>;
    settings!: Table<SettingsRecord, string>;
    uploadedImages!: Table<UploadedImageRecord, string>;

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

        // Version 4: Add uploaded images table
        this.version(4).stores({
            uploadedImages: 'id, createdAt',
        });
    }
}

// Singleton instance
export const db = new AlbumDatabase();

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
// Updated to be clearer about Spread structure assumption
export function generateSpreadContentHash(spread: { elements: Array<{ id: string; box: { x1: number; y1: number; x2: number; y2: number } }> }): string {
    const elementsHash = spread.elements.map(e =>
        `${e.id}:${e.box.x1.toFixed(4)},${e.box.y1.toFixed(4)},${e.box.x2.toFixed(4)},${e.box.y2.toFixed(4)}`
    ).join('|');

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < elementsHash.length; i++) {
        const char = elementsHash.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(36);
}

// Helper functions for uploaded images
export const uploadedImageDB = {
    async get(id: string): Promise<UploadedImageRecord | undefined> {
        return db.uploadedImages.get(id);
    },

    async getAll(): Promise<UploadedImageRecord[]> {
        return db.uploadedImages.orderBy('createdAt').reverse().toArray();
    },

    async save(record: UploadedImageRecord): Promise<void> {
        await db.uploadedImages.put(record);
    },

    async delete(id: string): Promise<void> {
        await db.uploadedImages.delete(id);
    },

    async clear(): Promise<void> {
        await db.uploadedImages.clear();
    },
};
