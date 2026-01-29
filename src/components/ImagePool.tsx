import React, { useCallback } from 'react';
import { PoolImage } from '../types';
import { getThumbnailUrl } from '../services/googlePhotos';

interface ImagePoolProps {
    images: PoolImage[];
    isAuthenticated: boolean;
    isLoading: boolean;
    onImport: () => void;
    onClose: () => void;
}

export const ImagePool: React.FC<ImagePoolProps> = ({
    images,
    isAuthenticated,
    isLoading,
    onImport,
    onClose,
}) => {
    const handleDragStart = useCallback((e: React.DragEvent, image: PoolImage) => {
        e.dataTransfer.setData('application/json', JSON.stringify(image));
        e.dataTransfer.effectAllowed = 'copy';

        // Create drag preview
        const preview = document.createElement('div');
        preview.style.width = '80px';
        preview.style.height = '80px';
        preview.style.background = `url(${getThumbnailUrl(image.baseUrl, 80)}) center/cover`;
        preview.style.borderRadius = '8px';
        preview.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        document.body.appendChild(preview);
        e.dataTransfer.setDragImage(preview, 40, 40);

        setTimeout(() => document.body.removeChild(preview), 0);
    }, []);

    return (
        <div className="image-pool">
            <div className="image-pool-header">
                <span className="image-pool-title">
                    Image Pool
                    {images.length > 0 && (
                        <span className="text-muted" style={{ marginLeft: 'var(--space-2)' }}>
                            ({images.length} images)
                        </span>
                    )}
                </span>
                <div className="image-pool-actions">
                    {isAuthenticated && (
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={onImport}
                            disabled={isLoading}
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
                                    Import from Google Photos
                                </>
                            )}
                        </button>
                    )}
                    <button className="btn btn-ghost btn-icon" onClick={onClose} title="Close">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="image-pool-content">
                {images.length === 0 ? (
                    <div className="pool-empty">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                        <span>
                            {isAuthenticated
                                ? 'Click "Import from Google Photos" to add images'
                                : 'Connect to Google Photos to import images'}
                        </span>
                    </div>
                ) : (
                    <div className="image-grid">
                        {images.map(image => (
                            <div
                                key={image.id}
                                className="pool-image"
                                draggable
                                onDragStart={(e) => handleDragStart(e, image)}
                                title={image.filename}
                            >
                                <img
                                    src={getThumbnailUrl(image.baseUrl, 200)}
                                    alt={image.filename}
                                    loading="lazy"
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
