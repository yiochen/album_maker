import React, { useState, useCallback } from 'react';
import type { PoolImage } from '../types';
import type { SourceImage } from '../sources';
import { getAllSources, getSource } from '../sources';
import { usePageWidth, usePageHeight } from '../states/albumStore';
import {
    calculateThumbnailSize,
    calculateCanvasMaxDimensions,
} from '../utils/imageUtils';
import { DraggablePoolImage } from './DraggablePoolImage';
import { UploadIcon } from './icons/UploadIcon';
import { AddImageIcon } from './icons/AddImageIcon';
import { CloseIcon } from './icons/CloseIcon';

/**
 * Props for the ImagePool component.
 */
interface ImagePoolProps {
    /** List of images currently in the pool. */
    images: PoolImage[];
    /** Callback fired when new images are imported. */
    onImport: (images: PoolImage[]) => void;
    /** Callback fired when the pool close button is clicked. */
    onClose?: () => void;
}

/**
 * ImagePool component manages the library of images available for use in the album.
 * It allows importing images from various sources and dragging them onto the canvas.
 */
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
            <div className="properties-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 className="properties-title" data-testid="image-pool-title">
                    Image Pool {images.length > 0 && `(${images.length} images)`}
                </h2>
                {onClose && (
                    <button
                        className="btn btn-ghost btn-icon"
                        onClick={onClose}
                        title="Close"
                        data-testid="close-pool-button"
                        style={{ width: 24, height: 24, padding: 4 }}
                    >
                        <CloseIcon width="16" height="16" />
                    </button>
                )}
            </div>

            <div className="image-pool-actions" data-testid="image-pool-actions">
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
                            <UploadIcon width="14" height="14" />
                            Import
                        </>
                    )}
                </button>
            </div>

            <div className="image-pool-content">
                {images.length === 0 ? (
                    <div className="pool-empty" data-testid="pool-empty">
                        <AddImageIcon />
                        <span>
                            Select a source and click "Import" to add images
                        </span>
                    </div>
                ) : (
                    <div className="image-masonry" data-testid="image-grid">
                        {images.map(image => (
                            <DraggablePoolImage key={image.id} image={image} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
