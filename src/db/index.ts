import Dexie, { Table } from 'dexie';

// Types for database
export interface AlbumRecord {
    id: string;
    name: string;
    lastModified: number;
    data: string; // JSON stringified Album
}



export interface SettingsRecord {
    key: string;
    value: string;
}

export interface UploadedImageRecord {
    id: string; // Internal DB Primary Key (UUID)
    sourceImageId: string; // Stable ID (<CreationDate>/<Filename>)
    blob: Blob;
    previewBlob?: Blob;
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
    settings!: Table<SettingsRecord, string>;
    uploadedImages!: Table<UploadedImageRecord, string>;

    constructor() {
        super('AlbumEditorDB');

        this.version(1).stores({
            albums: 'id, name, lastModified',
            settings: 'key',
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
