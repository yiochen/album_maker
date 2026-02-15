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

        // 2. Calculate optimal thumbnail size
        const { maxWidth, maxHeight } = calculateCanvasMaxDimensions(pageWidth, pageHeight);
        const thumbSize = calculateThumbnailSize(
            originalWidth,
            originalHeight,
            maxWidth,
            maxHeight
        );

        // 3. Generate thumbnail blob via Canvas
        const canvas = document.createElement('canvas');
        canvas.width = thumbSize.width;
        canvas.height = thumbSize.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, thumbSize.width, thumbSize.height);

        const thumbnailBlob = await new Promise<Blob>((res) => {
            canvas.toBlob((b) => res(b!), file.type, 0.8);
        });

        // 4. Save to IndexedDB
        const record: UploadedImageRecord = {
            id,
            sourceImageId: sourceImageId,
            blob,
            thumbnailBlob,
            filename: file.name,
            mimeType: file.type,
            width: originalWidth,
            height: originalHeight,
            createdAt: creationDate || Date.now(),
        };

        await uploadedImageDB.save(record);

        // 5. Return PoolImage
        return {
            id: crypto.randomUUID(), // Unique ID for the pool instance
            sourceId: 'uploaded',
            sourceImageId: sourceImageId,
            baseUrl: `/__local__/uploaded/full/${id}`,
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
