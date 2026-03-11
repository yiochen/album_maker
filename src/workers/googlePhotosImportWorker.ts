import { calculateThumbnailSize } from '../utils/imageUtils';
import type { UploadedImageRecord } from '../db';
import {
    getUploadedImageRecordInWorker,
    saveUploadedImageRecordInWorker,
} from '../db/uploadedImageWorkerStore';
import type {
    GooglePhotosImportWorkerRequest,
    GooglePhotosImportWorkerResponse,
    GooglePhotosImportedAsset,
    GooglePhotosImportItem,
    GooglePhotosImportStage,
} from './googlePhotosImportTypes';

const PREVIEW_MAX_DIMENSION = 1024;

const fetchBlob = async (
    url: string,
    accessToken: string,
    expectedMimeType: string,
): Promise<Blob> => {
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch Google Photos asset: ${response.status}`);
    }

    const blob = await response.blob();
    if (blob.type) {
        return blob;
    }

    return new Blob([blob], { type: expectedMimeType });
};

const postProgress = (asset: GooglePhotosImportedAsset, stage: GooglePhotosImportStage): void => {
    self.postMessage({
        event: 'progress',
        asset,
        stage,
    } satisfies GooglePhotosImportWorkerResponse);
};

const upsertRecord = async (record: UploadedImageRecord): Promise<void> => {
    const existing = await getUploadedImageRecordInWorker(record.id);
    await saveUploadedImageRecordInWorker({
        ...existing,
        ...record,
    });
};

const createAsset = (
    storageId: string,
    item: GooglePhotosImportItem,
    thumbnailWidth: number,
    thumbnailHeight: number,
): GooglePhotosImportedAsset => ({
    storageId,
    sourceImageId: item.sourceImageId,
    filename: item.filename,
    mimeType: item.mimeType,
    width: item.width,
    height: item.height,
    createdAt: item.createdAt ?? Date.now(),
    fullUrl: `/__local__/uploaded/full/${storageId}`,
    previewUrl: `/__local__/uploaded/preview/${storageId}`,
    thumbnailUrl: `/__local__/uploaded/thumb/${storageId}`,
    thumbnailWidth,
    thumbnailHeight,
});

const importItem = async (
    item: GooglePhotosImportItem,
    request: GooglePhotosImportWorkerRequest,
): Promise<GooglePhotosImportedAsset> => {
    const previewSize = calculateThumbnailSize(
        item.width,
        item.height,
        PREVIEW_MAX_DIMENSION,
        PREVIEW_MAX_DIMENSION,
    );
    const thumbnailSize = calculateThumbnailSize(
        item.width,
        item.height,
        request.thumbnailMaxWidth,
        request.thumbnailMaxHeight,
    );

    const storageId = crypto.randomUUID();
    const createdAt = item.createdAt ?? Date.now();
    const asset = createAsset(storageId, item, thumbnailSize.width, thumbnailSize.height);

    const thumbnailBlob = await fetchBlob(
        `${item.baseUrl}=w${thumbnailSize.width}-h${thumbnailSize.height}`,
        request.accessToken,
        item.mimeType,
    );
    await upsertRecord({
        id: storageId,
        sourceImageId: item.sourceImageId,
        thumbnailBlob,
        filename: item.filename,
        mimeType: item.mimeType,
        width: item.width,
        height: item.height,
        createdAt,
    });
    postProgress(asset, 'thumbnail');

    const previewBlob = await fetchBlob(
        `${item.baseUrl}=w${previewSize.width}-h${previewSize.height}`,
        request.accessToken,
        item.mimeType,
    );
    await upsertRecord({
        id: storageId,
        sourceImageId: item.sourceImageId,
        previewBlob,
        filename: item.filename,
        mimeType: item.mimeType,
        width: item.width,
        height: item.height,
        createdAt,
    });
    postProgress(asset, 'preview');

    const fullBlob = await fetchBlob(`${item.baseUrl}=d`, request.accessToken, item.mimeType);
    await upsertRecord({
        id: storageId,
        sourceImageId: item.sourceImageId,
        blob: fullBlob,
        filename: item.filename,
        mimeType: item.mimeType,
        width: item.width,
        height: item.height,
        createdAt,
    });
    postProgress(asset, 'full');

    return asset;
};

self.onmessage = async (event: MessageEvent<GooglePhotosImportWorkerRequest>) => {
    try {
        const imported: GooglePhotosImportedAsset[] = [];
        for (const item of event.data.items) {
            imported.push(await importItem(item, event.data));
        }

        self.postMessage({
            event: 'complete',
            imported,
        } satisfies GooglePhotosImportWorkerResponse);
    } catch (error) {
        self.postMessage({
            event: 'error',
            error: error instanceof Error ? error.message : 'Google Photos import failed',
        } satisfies GooglePhotosImportWorkerResponse);
    }
};
