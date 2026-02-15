import React, { useState } from 'react';
import type { PoolImage } from '../types';
import { getAllSources } from '../sources';
import { useImageImport } from '../hooks/useImageImport';
import { DraggablePoolImage } from './DraggablePoolImage';
import { UploadIcon } from './icons/UploadIcon';
import { AddImageIcon } from './icons/AddImageIcon';
import { CloseIcon } from './icons/CloseIcon';
import { usePageWidth, usePageHeight } from '../states/albumStore';
import { processAndSaveUpload } from '../services/imageUploadService';

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
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const pageWidth = usePageWidth();
    const pageHeight = usePageHeight();

    const sources = getAllSources();
    const { importImages, isLoading: isImporting } = useImageImport(onImport);
    const [isUploading, setIsUploading] = useState(false);

    const handleImportClick = () => {
        if (activeSourceId === 'uploaded') {
            fileInputRef.current?.click();
        } else {
            importImages(activeSourceId);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0 || !pageWidth || !pageHeight) return;

        setIsUploading(true);
        try {
            const newImages = await Promise.all(
                files.map(file => processAndSaveUpload(file, pageWidth, pageHeight))
            );
            onImport(newImages);
        } catch (error) {
            console.error('Failed to upload images:', error);
            alert('Failed to upload images. Please try again.');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const isLoading = isImporting || isUploading;

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
                    onClick={handleImportClick}
                    disabled={isLoading}
                    data-testid="import-button"
                >
                    {isLoading ? (
                        <>
                            <span className="loading-spinner" style={{ width: 14, height: 14 }} />
                            {isUploading ? 'Uploading...' : 'Importing...'}
                        </>
                    ) : (
                        <>
                            <UploadIcon width="14" height="14" />
                            {activeSourceId === 'uploaded' ? 'Upload Files' : 'Import'}
                        </>
                    )}
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    multiple
                    accept="image/*"
                    style={{ display: 'none' }}
                    data-testid="file-upload-input"
                />
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
