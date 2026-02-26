import React, { useCallback, useEffect } from 'react';
import { useAlbumSpreads, useAlbumSettings, useAlbumId, useAddSpreads, useDeleteSpread } from '../states/albumStore';
import { useCurrentSpreadIndex, useSelectedPageSide, useSetCurrentSpreadIndex, useSetSelectedPageSide } from '../states/uiStore';
import { SpreadThumbnail } from './SpreadThumbnail';
import { Spread } from '../types';
import { PlusIcon } from './icons/PlusIcon';

export const PageNavigator: React.FC = () => {
    const spreads = useAlbumSpreads();
    const settings = useAlbumSettings();
    const albumId = useAlbumId();
    const addSpreads = useAddSpreads();
    const deleteSpread = useDeleteSpread();
    const currentSpreadIndex = useCurrentSpreadIndex();
    const selectedPageSide = useSelectedPageSide();
    const setCurrentSpreadIndex = useSetCurrentSpreadIndex();
    const setSelectedPageSide = useSetSelectedPageSide();

    const maxSpreads = settings ? settings.maxPages / 2 : 20;
    const canAddMore = spreads.length < maxSpreads;
    const pageAspectRatio = settings ? settings.pageWidth / settings.pageHeight : 1;
    const selectedSpreadIndexSafe = Math.max(0, Math.min(currentSpreadIndex, spreads.length - 1));

    const handleAddSpread = () => {
        const insertIndex = currentSpreadIndex + 1;
        addSpreads(1, insertIndex);
        // Select the newly added spread
        setCurrentSpreadIndex(insertIndex);
        setSelectedPageSide('left');
    };

    const handlePageClick = useCallback((spreadIndex: number, side: 'left' | 'right') => {
        setCurrentSpreadIndex(spreadIndex);
        setSelectedPageSide(side);
    }, [setCurrentSpreadIndex, setSelectedPageSide]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Delete' && e.key !== 'Backspace') return;
            if (spreads.length <= 1) return;

            const target = e.target as HTMLElement | null;
            if (target && (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.tagName === 'SELECT' ||
                target.isContentEditable
            )) {
                return;
            }

            const spread = spreads[selectedSpreadIndexSafe];
            if (!spread) return;

            e.preventDefault();
            deleteSpread(spread.id);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedSpreadIndexSafe, spreads, deleteSpread]);

    if (!settings) return null;

    return (
        <aside className="page-navigator" data-testid="page-navigator">
            <div className="page-navigator-header">
                <span className="page-navigator-title" data-testid="page-navigator-title">Spreads</span>
                <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }} data-testid="page-count">
                    {spreads.length} / {maxSpreads} spreads
                </span>
            </div>

            <div className="page-list">
                {spreads.map((spread: Spread, spreadIndex: number) => (
                    <SpreadThumbnail
                        key={spread.id}
                        spread={spread}
                        spreadIndex={spreadIndex}
                        albumId={albumId!}
                        pageAspectRatio={pageAspectRatio}
                        isShowing={spreadIndex === currentSpreadIndex}
                        isLeftSelected={spreadIndex === selectedSpreadIndexSafe && selectedPageSide === 'left'}
                        isRightSelected={spreadIndex === selectedSpreadIndexSafe && selectedPageSide === 'right'}
                        onPageClick={(side) => handlePageClick(spreadIndex, side)}
                    />
                ))}

                <button
                    className="add-page-btn"
                    onClick={handleAddSpread}
                    disabled={!canAddMore}
                    title={canAddMore ? 'Add Spread' : `Maximum ${maxSpreads} spreads reached`}
                    data-testid="add-pages-button"
                >
                    <PlusIcon width="16" height="16" />
                    Add Spread
                </button>
            </div>
        </aside>
    );
};
