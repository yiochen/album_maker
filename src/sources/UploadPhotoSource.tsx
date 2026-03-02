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

    async fetchImages(options?: FetchImagesOptions): Promise<FetchImagesResult> {
        // Fetch everything from the uploadedImages table
        const records = await uploadedImageDB.getAll();
        const pageSize = Math.max(1, options?.pageSize ?? records.length);
        const startIndex = Number.parseInt(options?.pageToken ?? '0', 10);
        const safeStartIndex = Number.isFinite(startIndex) ? Math.max(0, startIndex) : 0;
        const paginatedRecords = records.slice(safeStartIndex, safeStartIndex + pageSize);

        const images: SourceImage[] = paginatedRecords.map(record => ({
            id: record.sourceImageId, // Using the stable identifier instead of internal DB ID
            sourceId: this.id,
            filename: record.filename,
            mimeType: record.mimeType,
            width: record.width,
            height: record.height,
            createdAt: record.createdAt,
            thumbnailUrl: `/__local__/uploaded/thumb/${record.id}`,
            previewUrl: `/__local__/uploaded/preview/${record.id}`,
            fullUrl: `/__local__/uploaded/full/${record.id}`,
            metadata: { dbId: record.id }, // Keep DB ID in metadata for URL resolution
        }));

        const nextPageIndex = safeStartIndex + paginatedRecords.length;
        const hasMore = nextPageIndex < records.length;

        return {
            images,
            hasMore,
            nextPageToken: hasMore ? String(nextPageIndex) : undefined,
        };
    }

    getPreviewUrl(image: SourceImage): string {
        const dbId = (image.metadata?.dbId as string) || image.id;
        return `/__local__/uploaded/preview/${dbId}`;
    }

    getThumbnailUrl(image: SourceImage): string {
        const dbId = (image.metadata?.dbId as string) || image.id;
        return `/__local__/uploaded/thumb/${dbId}`;
    }

    getFullUrl(image: SourceImage): string {
        const dbId = (image.metadata?.dbId as string) || image.id;
        return `/__local__/uploaded/full/${dbId}`;
    }
}

export const uploadPhotoSource = new UploadPhotoSource();
