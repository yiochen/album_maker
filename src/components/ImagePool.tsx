import React, { useState, useCallback } from 'react';
import { APP_CONFIG } from '../config';
import type { PoolImage } from '../types';
import type { SourceImage } from '../sources';
import { getAllSources, getSource } from '../sources';
import { usePageWidth, usePageHeight } from '../states/albumStore';
import {
    calculateThumbnailSize,
    calculateCanvasMaxDimensions,
} from '../utils/imageUtils';

interface ImagePoolProps {
    images: PoolImage[];
    onImport: (images: PoolImage[]) => void;
    onClose: () => void;
}

export const ImagePool: React.FC<ImagePoolProps> = ({
    images,
    onImport,
    onClose,
}) => {
    const [activeSourceId, setActiveSourceId] = useState<string>('dummy-colors');
    const [isLoading, setIsLoading] = useState(false);
    const sources = getAllSources();
    const activeSource = getSource(activeSourceId);
    const pageWidth = usePageWidth();
    const pageHeight = usePageHeight();

    const handleDragStart = useCallback((e: React.DragEvent, image: PoolImage) => {
        e.dataTransfer.setData('application/json', JSON.stringify(image));
        e.dataTransfer.effectAllowed = 'copy';

        // Create drag preview
        const size = APP_CONFIG.DRAG_PREVIEW_SIZE;
        const preview = document.createElement('div');
        preview.style.width = `${size}px`;
        preview.style.height = `${size}px`;
        preview.style.background = `url(${image.thumbnailUrl || image.baseUrl}) center/cover`;
        preview.style.borderRadius = '8px';
        preview.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        document.body.appendChild(preview);
        e.dataTransfer.setDragImage(preview, size / 2, size / 2);

        setTimeout(() => document.body.removeChild(preview), 0);
    }, []);

    const handleImportFromSource = useCallback(async () => {
        if (!activeSource || !pageWidth || !pageHeight) return;

        // Check if auth required
        if (activeSource.requiresAuth && !activeSource.isAuthenticated()) {
            try {
                await activeSource.connect();
            } catch (error) {
                console.error('Failed to connect to source:', error);
                alert(`Failed to connect to ${activeSource.name}. Please try again.`);
                return;
            }
        }

        setIsLoading(true);
        try {
            const result = await activeSource.fetchImages();

            // Calculate canvas max dimensions based on album settings
            const { maxWidth, maxHeight } = calculateCanvasMaxDimensions(
                pageWidth,
                pageHeight
            );

            // Convert source images to pool images with optimal thumbnail sizes
            const poolImages: PoolImage[] = result.images.map((img: SourceImage) => {
                // Calculate optimal thumbnail size for this image
                const thumbSize = calculateThumbnailSize(
                    img.width,
                    img.height,
                    maxWidth,
                    maxHeight
                );

                return {
                    id: crypto.randomUUID(),
                    sourceId: activeSource.id,
                    sourceImageId: img.id,
                    baseUrl: activeSource.getFullUrl(img),
                    thumbnailUrl: activeSource.getThumbnailUrl(img, thumbSize.width, thumbSize.height),
                    filename: img.filename,
                    mimeType: img.mimeType,
                    width: img.width,
                    height: img.height,
                    thumbnailWidth: thumbSize.width,
                    thumbnailHeight: thumbSize.height,
                    createdAt: img.createdAt,
                };
            });

            onImport(poolImages);
        } catch (error) {
            console.error('Failed to import from source:', error);
            alert(`Failed to import from ${activeSource.name}. Please try again.`);
        } finally {
            setIsLoading(false);
        }
    }, [activeSource, pageWidth, pageHeight, onImport]);

    return (
        <div className="image-pool" data-testid="image-pool">
            <div className="image-pool-header">
                <span className="image-pool-title" data-testid="image-pool-title">
                    Image Pool
                    {images.length > 0 && (
                        <span className="text-muted" style={{ marginLeft: 'var(--space-2)' }}>
                            ({images.length} images)
                        </span>
                    )}
                </span>
                <div className="image-pool-actions">
                    <select
                        className="source-selector"
                        value={activeSourceId}
                        onChange={(e) => setActiveSourceId(e.target.value)}
                        data-testid="source-selector"
                    >
                        {sources.map(source => (
                            <option key={source.id} value={source.id}>
                                {source.name}
                            </option>
                        ))}
                    </select>
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={handleImportFromSource}
                        disabled={isLoading}
                        data-testid="import-button"
                    >
                        {isLoading ? (
                            <>
                                <span className="loading-spinner" style={{ width: 14, height: 14 }} />
                                Importing...
                            </>
                        ) : (
                            <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Import
                            </>
                        )}
                    </button>
                    <button className="btn btn-ghost btn-icon" onClick={onClose} title="Close" data-testid="close-pool-button">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="image-pool-content">
                {images.length === 0 ? (
                    <div className="pool-empty" data-testid="pool-empty">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                        <span>
                            Select a source and click "Import" to add images
                        </span>
                    </div>
                ) : (
                    <div className="image-grid" data-testid="image-grid">
                        {images.map(image => (
                            <div
                                key={image.id}
                                className="pool-image"
                                draggable
                                onDragStart={(e) => handleDragStart(e, image)}
                                data-testid="pool-image"
                                style={{ aspectRatio: image.width && image.height ? `${image.width} / ${image.height}` : '1 / 1' }}
                            >
                                <img
                                    src={image.thumbnailUrl || image.baseUrl}
                                    alt={image.filename}
                                    title={image.filename}
                                    loading="lazy"
                                    data-width-px={image.width}
                                    data-height-px={image.height}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
