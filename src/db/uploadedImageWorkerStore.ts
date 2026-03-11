import type { UploadedImageRecord } from './index';
import { DB_NAME } from './constants';

const STORE_NAME = 'uploadedImages';

const openDatabase = async (): Promise<IDBDatabase> => {
    return await new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME);

        request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
        request.onsuccess = () => resolve(request.result);
    });
};

export const saveUploadedImageRecordInWorker = async (record: UploadedImageRecord): Promise<void> => {
    const db = await openDatabase();

    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.onerror = () => reject(tx.error ?? new Error('Failed to write uploaded image'));
        tx.oncomplete = () => resolve();
        tx.objectStore(STORE_NAME).put(record);
    });

    db.close();
};

export const getUploadedImageRecordInWorker = async (id: string): Promise<UploadedImageRecord | undefined> => {
    const db = await openDatabase();

    const record = await new Promise<UploadedImageRecord | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        tx.onerror = () => reject(tx.error ?? new Error('Failed to read uploaded image'));
        const request = tx.objectStore(STORE_NAME).get(id);
        request.onerror = () => reject(request.error ?? new Error('Failed to read uploaded image'));
        request.onsuccess = () => resolve(request.result as UploadedImageRecord | undefined);
    });

    db.close();
    return record;
};
