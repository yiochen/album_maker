import { PoolImage } from '../types';
import { uploadedImageDB, UploadedImageRecord } from '../db';
import { calculateThumbnailSize, calculateCanvasMaxDimensions } from '../utils/imageUtils';
import exifr from 'exifr';

/**
 * Processes a raw File object from an input, generates a thumbnail,
 * saves it to the local IndexedDB, and returns a PoolImage for the state.
 */
export async function processAndSaveUpload(
    file: File,
    pageWidth: number,
    pageHeight: number
): Promise<PoolImage> {
    const blob = new Blob([file], { type: file.type });

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

    const id = crypto.randomUUID(); // This is still the internal DB primary key/resource ID

    // 1. Get image dimensions
    const img = new Image();
    img.src = URL.createObjectURL(blob);

    try {
        await new Promise((res, rej) => {
            img.onload = res;
            img.onerror = rej;
        });

        const originalWidth = img.width;
        const originalHeight = img.height;

        // 2. Generate preview blob via Canvas (at most 1024px)
        const previewSize = calculateThumbnailSize(
            originalWidth,
            originalHeight,
            1024,
            1024
        );
        const previewCanvas = document.createElement('canvas');
        previewCanvas.width = previewSize.width;
        previewCanvas.height = previewSize.height;
        const previewCtx = previewCanvas.getContext('2d')!;
        previewCtx.drawImage(img, 0, 0, previewSize.width, previewSize.height);

        const previewBlob = await new Promise<Blob>((res) => {
            previewCanvas.toBlob((b) => res(b!), file.type, 0.85);
        });

        // 3. Calculate optimal thumbnail size
        const { maxWidth, maxHeight } = calculateCanvasMaxDimensions(pageWidth, pageHeight);
        const thumbSize = calculateThumbnailSize(
            originalWidth,
            originalHeight,
            maxWidth,
            maxHeight
        );

        // 4. Generate thumbnail blob via Canvas
        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = thumbSize.width;
        thumbCanvas.height = thumbSize.height;
        const thumbCtx = thumbCanvas.getContext('2d')!;
        thumbCtx.drawImage(img, 0, 0, thumbSize.width, thumbSize.height);

        const thumbnailBlob = await new Promise<Blob>((res) => {
            thumbCanvas.toBlob((b) => res(b!), file.type, 0.8);
        });

        // 5. Save to IndexedDB
        const record: UploadedImageRecord = {
            id,
            sourceImageId: sourceImageId,
            blob,
            previewBlob,
            thumbnailBlob,
            filename: file.name,
            mimeType: file.type,
            width: originalWidth,
            height: originalHeight,
            createdAt: creationDate || Date.now(),
        };

        await uploadedImageDB.save(record);

        // 6. Return PoolImage
        return {
            id: crypto.randomUUID(), // Unique ID for the pool instance
            sourceId: 'uploaded',
            sourceImageId: sourceImageId,
            fullUrl: `/__local__/uploaded/full/${id}`,
            previewUrl: `/__local__/uploaded/preview/${id}`,
            thumbnailUrl: `/__local__/uploaded/thumb/${id}`,
            filename: file.name,
            mimeType: file.type,
            width: originalWidth,
            height: originalHeight,
            thumbnailWidth: thumbSize.width,
            thumbnailHeight: thumbSize.height,
            createdAt: record.createdAt,
        };
    } finally {
        URL.revokeObjectURL(img.src);
    }
}
