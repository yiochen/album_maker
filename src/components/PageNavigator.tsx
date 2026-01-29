import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Page, AlbumSettings } from '../types';
import { useCanvasThumbnail } from '../hooks/useCanvasThumbnail';
import { spreadThumbnailDB, generateSpreadContentHash } from '../db';

interface PageNavigatorProps {
    pages: Page[];
    currentSpreadIndex: number;
    maxPages: number;
    albumId: string;
    settings: AlbumSettings;
    onSpreadSelect: (spreadIndex: number) => void;
    onAddPages: () => void;
    onDeleteSpread: (leftPageId: string, rightPageId: string) => void;
}

export const PageNavigator: React.FC<PageNavigatorProps> = ({
    pages,
    currentSpreadIndex,
    maxPages,
    albumId,
    settings,
    onSpreadSelect,
    onAddPages,
    onDeleteSpread,
}) => {
    // Group pages into spreads (pairs)
    const spreads: [Page, Page | undefined][] = [];
    for (let i = 0; i < pages.length; i += 2) {
        spreads.push([pages[i], pages[i + 1]]);
    }

    const canAddMore = pages.length < maxPages;

    return (
        <aside className="page-navigator">
            <div className="page-navigator-header">
                <span className="page-navigator-title">Spreads</span>
                <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                    {pages.length} / {maxPages} pages
                </span>
            </div>

            <div className="page-list">
                {spreads.map((spread, spreadIndex) => (
                    <SpreadThumbnail
                        key={spread[0].id}
                        leftPage={spread[0]}
                        rightPage={spread[1]}
                        spreadIndex={spreadIndex}
                        albumId={albumId}
                        settings={settings}
                        isActive={spreadIndex === currentSpreadIndex}
                        canDelete={spreads.length > 1}
                        onClick={() => onSpreadSelect(spreadIndex)}
                        onDelete={() => {
                            if (spread[1]) {
                                onDeleteSpread(spread[0].id, spread[1].id);
                            }
                        }}
                    />
                ))}

                <button
                    className="add-page-btn"
                    onClick={onAddPages}
                    disabled={!canAddMore}
                    title={canAddMore ? 'Add 2 pages' : `Maximum ${maxPages} pages reached`}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    Add Pages
                </button>
            </div>
        </aside>
    );
};

interface SpreadThumbnailProps {
    leftPage: Page;
    rightPage: Page | undefined;
    spreadIndex: number;
    albumId: string;
    settings: AlbumSettings;
    isActive: boolean;
    canDelete: boolean;
    onClick: () => void;
    onDelete: () => void;
}

const SpreadThumbnail: React.FC<SpreadThumbnailProps> = ({
    leftPage,
    rightPage,
    spreadIndex,
    albumId,
    settings,
    isActive,
    canDelete,
    onClick,
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
                rootMargin: '50px',
                threshold: 0.1,
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

        const pages = rightPage ? [leftPage, rightPage] : [leftPage];
        const contentHash = generateSpreadContentHash(pages);

        const loadThumbnail = async () => {
            // Check cache first
            try {
                const cached = await spreadThumbnailDB.get(albumId, spreadIndex);
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
                const dataUrl = await generateSpreadThumbnail(pages, settings);
                if (dataUrl) {
                    setThumbnailUrl(dataUrl);
                    // Cache the thumbnail
                    try {
                        await spreadThumbnailDB.set(albumId, spreadIndex, dataUrl, contentHash);
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
    }, [isVisible, leftPage, rightPage, spreadIndex, albumId, settings, generateSpreadThumbnail]);

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Delete this spread (2 pages)?')) {
            onDelete();
        }
    };

    return (
        <div
            ref={containerRef}
            className={`spread-thumbnail ${isActive ? 'active' : ''}`}
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onClick()}
        >
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

            <span className="page-thumbnail-number">
                {spreadIndex * 2 + 1}-{spreadIndex * 2 + 2}
            </span>

            {canDelete && (
                <button
                    className="page-thumbnail-delete"
                    onClick={handleDelete}
                    title="Delete spread"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </button>
            )}
        </div>
    );
};
