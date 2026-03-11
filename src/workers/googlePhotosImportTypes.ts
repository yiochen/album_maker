export interface GooglePhotosImportItem {
    sourceImageId: string;
    filename: string;
    mimeType: string;
    baseUrl: string;
    width?: number;
    height?: number;
    createdAt?: number;
}

export interface GooglePhotosImportWorkerRequest {
    accessToken: string;
    items: GooglePhotosImportItem[];
    thumbnailMaxWidth: number;
    thumbnailMaxHeight: number;
}

export interface GooglePhotosImportedAsset {
    storageId: string;
    sourceImageId: string;
    filename: string;
    mimeType: string;
    width?: number;
    height?: number;
    createdAt: number;
    fullUrl: string;
    previewUrl: string;
    thumbnailUrl: string;
    thumbnailWidth: number;
    thumbnailHeight: number;
}

export type GooglePhotosImportStage = 'thumbnail' | 'preview' | 'full' | 'done';

export interface GooglePhotosImportWorkerResponse {
    event: 'progress' | 'complete' | 'error';
    asset?: GooglePhotosImportedAsset;
    imported?: GooglePhotosImportedAsset[];
    stage?: GooglePhotosImportStage;
    error?: string;
}
