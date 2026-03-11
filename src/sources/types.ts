import React from 'react';
import type { PoolImage } from '../types';

// Source image from any provider
export interface SourceImage {
    id: string;
    sourceId: string;  // Which source this came from
    filename: string;
    mimeType: string;
    width?: number;
    height?: number;
    createdAt?: number;
    fullUrl?: string;
    previewUrl?: string;
    thumbnailUrl?: string;
    metadata?: Record<string, unknown>;
}

// Options for fetching images
export interface FetchImagesOptions {
    albumId?: string;
    pageToken?: string;
    pageSize?: number;
    thumbnailMaxWidth?: number;
    thumbnailMaxHeight?: number;
    onProgress?: (images: PoolImage[]) => void;
}

// Result from fetching images
export interface FetchImagesResult {
    images: SourceImage[];
    nextPageToken?: string;
    hasMore: boolean;
}

// Album/folder from a source
export interface SourceAlbum {
    id: string;
    title: string;
    coverUrl?: string;
    itemCount?: number;
}

// Photo source interface - all sources must implement this
export interface PhotoSource {
    // Unique identifier for this source
    readonly id: string;

    // Display name for UI
    readonly name: string;

    // Icon component for UI
    readonly icon: React.ReactNode;

    // Whether this source requires authentication
    readonly requiresAuth: boolean;

    // Check if currently authenticated
    isAuthenticated(): boolean;

    // Connect/authenticate to the source
    connect(): Promise<void>;

    // Disconnect/sign out from the source
    disconnect(): void;

    // Fetch images from the source
    fetchImages(options?: FetchImagesOptions): Promise<FetchImagesResult>;

    // Get preview URL (medium resolution) for an image
    getPreviewUrl(image: SourceImage): string;

    // Get thumbnail URL for an image
    getThumbnailUrl(image: SourceImage): string;

    // Get full-resolution URL for an image
    getFullUrl(image: SourceImage, maxWidth?: number, maxHeight?: number): string;
}

// Source with initialization
export interface InitializableSource extends PhotoSource {
    initialize(): Promise<void>;
}

// Check if a source needs initialization
export const isInitializableSource = (source: PhotoSource): source is InitializableSource => {
    return 'initialize' in source && typeof (source as InitializableSource).initialize === 'function';
};
