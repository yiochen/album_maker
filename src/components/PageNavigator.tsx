import React from 'react';
import type { Page, AlbumSettings } from '../types';

interface PageNavigatorProps {
    pages: Page[];
    currentSpreadIndex: number;  // Index of the spread (pairs of pages)
    maxPages: number;
    onSpreadSelect: (spreadIndex: number) => void;
    onAddPages: () => void;
    onDeleteSpread: (leftPageId: string, rightPageId: string) => void;
}

export const PageNavigator: React.FC<PageNavigatorProps> = ({
    pages,
    currentSpreadIndex,
    maxPages,
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
    const spreadCount = spreads.length;

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
    isActive: boolean;
    canDelete: boolean;
    onClick: () => void;
    onDelete: () => void;
}

const SpreadThumbnail: React.FC<SpreadThumbnailProps> = ({
    leftPage,
    rightPage,
    spreadIndex,
    isActive,
    canDelete,
    onClick,
    onDelete,
}) => {
    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Delete this spread (2 pages)?')) {
            onDelete();
        }
    };

    const leftImage = leftPage.elements[0];
    const rightImage = rightPage?.elements[0];

    return (
        <div
            className={`spread-thumbnail ${isActive ? 'active' : ''}`}
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onClick()}
        >
            <div className="spread-thumbnail-content">
                <div className="spread-thumbnail-page">
                    {leftImage ? (
                        <img
                            src={leftImage.thumbnailUrl || leftImage.imageUrl}
                            alt="Left page"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    ) : (
                        <span className="spread-thumbnail-empty" />
                    )}
                </div>
                <div className="spread-thumbnail-seam" />
                <div className="spread-thumbnail-page">
                    {rightImage ? (
                        <img
                            src={rightImage.thumbnailUrl || rightImage.imageUrl}
                            alt="Right page"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    ) : (
                        <span className="spread-thumbnail-empty" />
                    )}
                </div>
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
