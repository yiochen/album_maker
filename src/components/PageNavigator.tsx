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
    onDeleteSpreads: (spreadIndices: number[]) => void;
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
    onDeleteSpreads,
}) => {
    // Group pages into spreads (pairs)
    const spreads: [Page, Page | undefined][] = [];
    for (let i = 0; i < pages.length; i += 2) {
        spreads.push([pages[i], pages[i + 1]]);
    }

    const canAddMore = pages.length < maxPages;

    // Multi-selection state
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
    const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);

    // Clear selection when pages change (e.g., after deletion)
    const [prevPageLength, setPrevPageLength] = useState(pages.length);
    if (prevPageLength !== pages.length) {
        setPrevPageLength(pages.length);
        if (selectedIndices.size > 0) {
            setSelectedIndices(new Set());
            setLastClickedIndex(null);
        }
    }

    const handleSpreadClick = useCallback((spreadIndex: number, event: React.MouseEvent) => {
        const isCtrlOrCmd = event.metaKey || event.ctrlKey;
        const isShift = event.shiftKey;

        if (isCtrlOrCmd) {
            // Toggle individual selection
            setSelectedIndices(prev => {
                const next = new Set(prev);
                if (next.has(spreadIndex)) {
                    next.delete(spreadIndex);
                } else {
                    next.add(spreadIndex);
                }
                return next;
            });
            setLastClickedIndex(spreadIndex);
        } else if (isShift && lastClickedIndex !== null) {
            // Range selection
            const start = Math.min(lastClickedIndex, spreadIndex);
            const end = Math.max(lastClickedIndex, spreadIndex);
            setSelectedIndices(prev => {
                const next = new Set(prev);
                for (let i = start; i <= end; i++) {
                    next.add(i);
                }
                return next;
            });
        } else {
            // Normal click - navigate to spread
            onSpreadSelect(spreadIndex);
            setLastClickedIndex(spreadIndex);
        }
    }, [lastClickedIndex, onSpreadSelect]);

    const handleCheckboxChange = useCallback((spreadIndex: number, checked: boolean) => {
        setSelectedIndices(prev => {
            const next = new Set(prev);
            if (checked) {
                next.add(spreadIndex);
            } else {
                next.delete(spreadIndex);
            }
            return next;
        });
        setLastClickedIndex(spreadIndex);
    }, []);

    const handleDeleteSelected = useCallback(() => {
        if (selectedIndices.size === 0) return;

        // Cannot delete all spreads
        if (selectedIndices.size >= spreads.length) {
            alert('Cannot delete all spreads. At least one spread must remain.');
            return;
        }

        if (window.confirm(`Delete ${selectedIndices.size} spread(s) (${selectedIndices.size * 2} pages)?`)) {
            onDeleteSpreads(Array.from(selectedIndices));
            setSelectedIndices(new Set());
        }
    }, [selectedIndices, spreads.length, onDeleteSpreads]);

    const handleClearSelection = useCallback(() => {
        setSelectedIndices(new Set());
    }, []);

    return (
        <aside className="page-navigator" data-testid="page-navigator">
            <div className="page-navigator-header">
                <span className="page-navigator-title" data-testid="page-navigator-title">Spreads</span>
                <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }} data-testid="page-count">
                    {pages.length} / {maxPages} pages
                </span>
            </div>

            {selectedIndices.size > 0 && (
                <div className="page-navigator-actions" data-testid="selection-actions">
                    <span className="selection-count" data-testid="selection-count">
                        {selectedIndices.size} selected
                    </span>
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={handleClearSelection}
                        data-testid="clear-selection-button"
                    >
                        Clear
                    </button>
                    <button
                        className="btn btn-danger btn-sm"
                        onClick={handleDeleteSelected}
                        data-testid="delete-selected-button"
                    >
                        Delete
                    </button>
                </div>
            )}

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
                        isSelected={selectedIndices.has(spreadIndex)}
                        canDelete={spreads.length > 1}
                        showCheckbox={true}
                        onClick={(e) => handleSpreadClick(spreadIndex, e)}
                        onCheckboxChange={(checked) => handleCheckboxChange(spreadIndex, checked)}
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
                    data-testid="add-pages-button"
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
    isSelected: boolean;
    canDelete: boolean;
    showCheckbox: boolean;
    onClick: (e: React.MouseEvent) => void;
    onCheckboxChange: (checked: boolean) => void;
    onDelete: () => void;
}

const SpreadThumbnail: React.FC<SpreadThumbnailProps> = ({
    leftPage,
    rightPage,
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
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </button>
            )}
        </div>
    );
};
