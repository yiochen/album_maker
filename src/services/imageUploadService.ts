import { PoolImage } from '../types';
import { uploadedImageDB, UploadedImageRecord } from '../db';
import { calculateThumbnailSize, calculateCanvasMaxDimensions } from '../utils/imageUtils';
import exifr from 'exifr';
import heic2any from 'heic2any';

/**
 * Custom error for unsupported HEIF formats (e.g., HDR or new iOS profiles).
 */
export class HeifUnsupportedError extends Error {
    constructor(filename: string) {
        super(`HEIF format not supported for: ${filename}`);
        this.name = 'HeifUnsupportedError';
    }
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

    const blob = new Blob([sourceFile], { type: sourceFile.type });

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
            previewCanvas.toBlob((b) => res(b!), sourceFile.type, 0.85);
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
            thumbCanvas.toBlob((b) => res(b!), sourceFile.type, 0.8);
        });

        // 5. Save to IndexedDB
        const record: UploadedImageRecord = {
            id,
            sourceImageId: sourceImageId,
            blob,
            previewBlob,
            thumbnailBlob,
            filename: sourceFile.name,
            mimeType: sourceFile.type,
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
            filename: sourceFile.name,
            mimeType: sourceFile.type,
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
