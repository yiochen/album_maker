import React from 'react';
import type { PhotoSource, SourceImage, FetchImagesResult, FetchImagesOptions } from './types';
import { uploadedImageDB } from '../db';
import { UploadIcon } from '../components/icons/UploadIcon';

class UploadPhotoSource implements PhotoSource {
    readonly id = 'uploaded';
    readonly name = 'Upload';
    readonly icon = <UploadIcon width="20" height="20" />;
    readonly requiresAuth = false;

    isAuthenticated(): boolean {
        return true;
    }

    async connect(): Promise<void> {
        // No authentication needed
        return Promise.resolve();
    }

    disconnect(): void {
        // No-op
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async fetchImages(options?: FetchImagesOptions): Promise<FetchImagesResult> {
        // Fetch everything from the uploadedImages table
        const records = await uploadedImageDB.getAll();

        const images: SourceImage[] = records.map(record => ({
            id: record.sourceImageId, // Using the stable identifier instead of internal DB ID
            sourceId: this.id,
            filename: record.filename,
            mimeType: record.mimeType,
            width: record.width,
            height: record.height,
            createdAt: record.createdAt,
            metadata: { dbId: record.id }, // Keep DB ID in metadata for URL resolution
        }));

        // Basic pagination (if ever needed, but for now we return all)
        return {
            images,
            hasMore: false,
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getThumbnailUrl(image: SourceImage, width: number, height: number): string {
        const dbId = (image.metadata?.dbId as string) || image.id;
        return `/__local__/uploaded/thumb/${dbId}`;
    }

    getFullUrl(image: SourceImage): string {
        const dbId = (image.metadata?.dbId as string) || image.id;
        return `/__local__/uploaded/full/${dbId}`;
    }
}

export const uploadPhotoSource = new UploadPhotoSource();
