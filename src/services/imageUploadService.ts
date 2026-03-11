import { PoolImage } from '../types';
import { uploadedImageDB, UploadedImageRecord } from '../db';
import { calculateThumbnailSize, calculateCanvasMaxDimensions } from '../utils/imageUtils';
import exifr from 'exifr';
import heic2any from 'heic2any';

const PREVIEW_MAX_DIMENSION = 1024;
const FALLBACK_THUMBNAIL_MAX_DIMENSION = 512;

/**
 * Custom error for unsupported HEIF formats (e.g., HDR or new iOS profiles).
 */
export class HeifUnsupportedError extends Error {
    constructor(filename: string) {
        super(`HEIF format not supported for: ${filename}`);
        this.name = 'HeifUnsupportedError';
    }
}

export interface SavedImageAsset {
    storageId: string;
    width: number;
    height: number;
    createdAt: number;
    filename: string;
    mimeType: string;
    fullUrl: string;
    previewUrl: string;
    thumbnailUrl: string;
    thumbnailWidth: number;
    thumbnailHeight: number;
}

const loadImageDimensions = async (sourceFile: File): Promise<{ width: number; height: number }> => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(sourceFile);

    try {
        await new Promise((res, rej) => {
            img.onload = res;
            img.onerror = (e) => {
                console.error(`Failed to load image: ${sourceFile.name}`, {
                    type: sourceFile.type,
                    size: sourceFile.size,
                    error: e
                });
                rej(new Error(`Failed to load image: ${sourceFile.name}`));
            };
            img.src = objectUrl;
        });

        return { width: img.width, height: img.height };
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
};

const drawResizedBlob = async (
    sourceFile: File,
    width: number,
    height: number,
    mimeType: string,
    quality: number
): Promise<Blob> => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(sourceFile);

    try {
        await new Promise((res, rej) => {
            img.onload = res;
            img.onerror = rej;
            img.src = objectUrl;
        });

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);

        return await new Promise<Blob>((res) => {
            canvas.toBlob((b) => res(b!), mimeType, quality);
        });
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
};

export async function saveImageAsset(
    sourceFile: File,
    options?: {
        sourceImageId?: string;
        createdAt?: number;
        previewMaxDimension?: number;
        thumbnailMaxWidth?: number;
        thumbnailMaxHeight?: number;
    }
): Promise<SavedImageAsset> {
    const { width: originalWidth, height: originalHeight } = await loadImageDimensions(sourceFile);
    const previewLimit = options?.previewMaxDimension ?? PREVIEW_MAX_DIMENSION;
    const previewSize = calculateThumbnailSize(originalWidth, originalHeight, previewLimit, previewLimit);
    const thumbWidthLimit = options?.thumbnailMaxWidth ?? FALLBACK_THUMBNAIL_MAX_DIMENSION;
    const thumbHeightLimit = options?.thumbnailMaxHeight ?? FALLBACK_THUMBNAIL_MAX_DIMENSION;
    const thumbSize = calculateThumbnailSize(originalWidth, originalHeight, thumbWidthLimit, thumbHeightLimit);

    const previewBlob = await drawResizedBlob(
        sourceFile,
        previewSize.width,
        previewSize.height,
        sourceFile.type,
        0.85
    );
    const thumbnailBlob = await drawResizedBlob(
        sourceFile,
        thumbSize.width,
        thumbSize.height,
        sourceFile.type,
        0.8
    );

    const storageId = crypto.randomUUID();
    const record: UploadedImageRecord = {
        id: storageId,
        sourceImageId: options?.sourceImageId ?? sourceFile.name,
        blob: new Blob([sourceFile], { type: sourceFile.type }),
        previewBlob,
        thumbnailBlob,
        filename: sourceFile.name,
        mimeType: sourceFile.type,
        width: originalWidth,
        height: originalHeight,
        createdAt: options?.createdAt ?? Date.now(),
    };

    await uploadedImageDB.save(record);

    return {
        storageId,
        width: originalWidth,
        height: originalHeight,
        createdAt: record.createdAt,
        filename: sourceFile.name,
        mimeType: sourceFile.type,
        fullUrl: `/__local__/uploaded/full/${storageId}`,
        previewUrl: `/__local__/uploaded/preview/${storageId}`,
        thumbnailUrl: `/__local__/uploaded/thumb/${storageId}`,
        thumbnailWidth: thumbSize.width,
        thumbnailHeight: thumbSize.height,
    };
}

/**
 * Processes a raw File object from an input, generates a thumbnail,
 * saves it to the local IndexedDB, and returns a PoolImage for the state.
 */
export async function processAndSaveUpload(
    file: File,
    pageWidth: number,
    pageHeight: number
): Promise<PoolImage> {
    let sourceFile: File = file;

    // Handle HEIC/HEIF conversion
    if (file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic')) {
        try {
            console.log(`Converting HEIC file: ${file.name}`);
            const result = await heic2any({
                blob: file,
                toType: 'image/jpeg',
                quality: 0.8,
                multiple: true // Try enabling multiple to handle containers better
            });

            // heic2any can return a single blob or an array of blobs
            const blob = Array.isArray(result) ? result[0] : result;
            sourceFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                type: 'image/jpeg',
                lastModified: file.lastModified
            });
        } catch (e) {
            console.error(`Failed to convert HEIC file: ${file.name}`, e);
            if (e instanceof Error && e.message.includes('ERR_LIBHEIF')) {
                throw new HeifUnsupportedError(file.name);
            }
            // For other errors, we'll continue and let it fail at the Image load stage
        }
    }

    // 1. Extract metadata and generate ID
    let creationDate: number | undefined;
    let sourceImageId = file.name;

    try {
        const metadata = await exifr.parse(file);
        if (metadata && metadata.DateTimeOriginal) {
            const date = new Date(metadata.DateTimeOriginal);
            creationDate = date.getTime();
            sourceImageId = `${creationDate}/${file.name}`;
        }
    } catch (e) {
        console.warn('Failed to parse EXIF metadata:', e);
    }

    const { maxWidth, maxHeight } = calculateCanvasMaxDimensions(pageWidth, pageHeight);
    const saved = await saveImageAsset(sourceFile, {
        sourceImageId,
        createdAt: creationDate || Date.now(),
        thumbnailMaxWidth: maxWidth,
        thumbnailMaxHeight: maxHeight,
    });

    return {
        id: crypto.randomUUID(),
        sourceId: 'uploaded',
        sourceImageId,
        fullUrl: saved.fullUrl,
        previewUrl: saved.previewUrl,
        thumbnailUrl: saved.thumbnailUrl,
        filename: saved.filename,
        mimeType: saved.mimeType,
        width: saved.width,
        height: saved.height,
        thumbnailWidth: saved.thumbnailWidth,
        thumbnailHeight: saved.thumbnailHeight,
        createdAt: saved.createdAt,
    };
}
