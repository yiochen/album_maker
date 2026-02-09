import React, { useState, useEffect, useRef } from 'react';
import type { Spread, AlbumSettings } from '../types';
import { APP_CONFIG } from '../config';
import { useCanvasThumbnail } from '../hooks/useCanvasThumbnail';
import { spreadThumbnailDB, generateSpreadContentHash } from '../db';
import { TrashIcon } from './icons/TrashIcon';

interface SpreadThumbnailProps {
    spread: Spread;
    spreadIndex: number;
    albumId: string;
    settings: AlbumSettings;
    isActive: boolean;
    isSelected: boolean;
    canDelete: boolean;
    showCheckbox: boolean;
    onClick: (e: React.MouseEvent) => void;
    onCheckboxChange: (checked: boolean) => void;
    onDelete: () => void;
}

export const SpreadThumbnail: React.FC<SpreadThumbnailProps> = ({
    spread,
    spreadIndex,
    albumId,
    settings,
    isActive,
    isSelected,
    canDelete,
    showCheckbox,
    onClick,
    onCheckboxChange,
    onDelete,
}) => {
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const { generateSpreadThumbnail } = useCanvasThumbnail();

    // Lazy loading with IntersectionObserver
    useEffect(() => {
        const element = containerRef.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsVisible(true);
                    }
                });
            },
            {
                root: null,
                rootMargin: APP_CONFIG.INTERSECTION_ROOT_MARGIN,
                threshold: APP_CONFIG.INTERSECTION_THRESHOLD,
            }
        );

        observer.observe(element);

        return () => {
            observer.disconnect();
        };
    }, []);

    // Generate thumbnail when visible
    useEffect(() => {
        if (!isVisible) return;

        // Pass single spread to generator
        const contentHash = generateSpreadContentHash(spread);

        const loadThumbnail = async () => {
            // Check cache first
            try {
                // Use spread.id instead of index
                const cached = await spreadThumbnailDB.get(albumId, spread.id);
                if (cached && cached.contentHash === contentHash) {
                    setThumbnailUrl(cached.dataUrl);
                    return;
                }
            } catch (error) {
                console.warn('Failed to load cached thumbnail:', error);
            }

            // Generate new thumbnail
            setIsLoading(true);
            try {
                // generateSpreadThumbnail expects Spread (single or array, hook handles it)
                const dataUrl = await generateSpreadThumbnail(spread, settings);
                if (dataUrl) {
                    setThumbnailUrl(dataUrl);
                    // Cache the thumbnail
                    try {
                        await spreadThumbnailDB.set(albumId, spread.id, dataUrl, contentHash);
                    } catch (error) {
                        console.warn('Failed to cache thumbnail:', error);
                    }
                }
            } catch (error) {
                console.error('Failed to generate thumbnail:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadThumbnail();
    }, [isVisible, spread, spreadIndex, albumId, settings, generateSpreadThumbnail]);

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Delete this spread?')) {
            onDelete();
        }
    };

    const handleCheckboxClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onCheckboxChange(e.target.checked);
    };

    return (
        <div
            ref={containerRef}
            className={`spread-thumbnail ${isActive ? 'active' : ''} ${isSelected ? 'selected' : ''}`}
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onClick(e as unknown as React.MouseEvent)}
            data-testid="spread-thumbnail"
        >
            {showCheckbox && (
                <label
                    className="spread-thumbnail-checkbox"
                    onClick={handleCheckboxClick}
                    data-testid="spread-checkbox-label"
                >
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={handleCheckboxChange}
                        data-testid="spread-checkbox"
                    />
                </label>
            )}

            <div className="spread-thumbnail-content">
                {thumbnailUrl ? (
                    <img
                        src={thumbnailUrl}
                        alt={`Spread ${spreadIndex + 1}`}
                        className="spread-thumbnail-image"
                    />
                ) : isLoading ? (
                    <div className="spread-thumbnail-loading">
                        <div className="loading-spinner" />
                    </div>
                ) : (
                    <div className="spread-thumbnail-placeholder">
                        <div className="spread-thumbnail-page" />
                        <div className="spread-thumbnail-seam" />
                        <div className="spread-thumbnail-page" />
                    </div>
                )}
            </div>

            <span className="page-thumbnail-number" data-testid="page-number">
                {spreadIndex * 2 + 1}-{spreadIndex * 2 + 2}
            </span>

            {canDelete && (
                <button
                    className="page-thumbnail-delete"
                    onClick={handleDelete}
                    title="Delete spread"
                    data-testid="delete-spread-button"
                >
                    <TrashIcon width="14" height="14" />
                </button>
            )}
        </div>
    );
};
