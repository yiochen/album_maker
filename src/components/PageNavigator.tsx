import React, { useState, useCallback } from 'react';
import { useAlbumStore } from '../states/albumStore';
import { useUIStore } from '../states/uiStore';
import { SpreadThumbnail } from './SpreadThumbnail';
import { Spread } from '../types';

export const PageNavigator: React.FC = () => {
    const { album, addSpreads, deleteSpread } = useAlbumStore();
    const { currentSpreadIndex, setCurrentSpreadIndex } = useUIStore();

    const spreads = album?.spreads || [];
    const settings = album?.settings;
    const maxSpreads = settings ? settings.maxPages / 2 : 20;
    const canAddMore = spreads.length < maxSpreads;

    // Multi-selection state
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
    const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);

    // Clear selection when spreads change
    const [prevLength, setPrevLength] = useState(spreads.length);
    if (prevLength !== spreads.length) {
        setPrevLength(spreads.length);
        if (selectedIndices.size > 0) {
            setSelectedIndices(new Set());
            setLastClickedIndex(null);
        }
    }

    const handleSpreadSelect = useCallback((index: number) => {
        setCurrentSpreadIndex(index);
    }, [setCurrentSpreadIndex]);

    const handleAddSpread = () => {
        addSpreads(1);
    };

    const handleDeleteSpread = (spreadId: string) => {
        deleteSpread(spreadId);
    };

    // Helper for bulk delete - since store only has single delete, we iterate
    // Ideally store should support bulk delete.
    const handleDeleteSpreads = useCallback((spreadIndices: number[]) => {
        if (!album) return;
        const sortedIndices = [...spreadIndices].sort((a, b) => b - a);
        for (const spreadIndex of sortedIndices) {
            const spread = album.spreads[spreadIndex];
            if (spread) deleteSpread(spread.id);
        }
    }, [album, deleteSpread]);

    const handleSpreadClick = useCallback((spreadIndex: number, event: React.MouseEvent) => {
        const isCtrlOrCmd = event.metaKey || event.ctrlKey;
        const isShift = event.shiftKey;

        if (isCtrlOrCmd) {
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
            handleSpreadSelect(spreadIndex);
            setLastClickedIndex(spreadIndex);
        }
    }, [lastClickedIndex, handleSpreadSelect]);

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
        if (selectedIndices.size >= spreads.length) {
            alert('Cannot delete all spreads. At least one spread must remain.');
            return;
        }

        if (window.confirm(`Delete ${selectedIndices.size} spread(s)?`)) {
            handleDeleteSpreads(Array.from(selectedIndices));
            setSelectedIndices(new Set());
        }
    }, [selectedIndices, spreads.length, handleDeleteSpreads]);

    const handleClearSelection = useCallback(() => {
        setSelectedIndices(new Set());
    }, []);

    if (!album || !settings) return null;

    return (
        <aside className="page-navigator" data-testid="page-navigator">
            <div className="page-navigator-header">
                <span className="page-navigator-title" data-testid="page-navigator-title">Spreads</span>
                <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }} data-testid="page-count">
                    {spreads.length} / {maxSpreads} spreads
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
                {spreads.map((spread: Spread, spreadIndex: number) => (
                    <SpreadThumbnail
                        key={spread.id}
                        spread={spread}
                        spreadIndex={spreadIndex}
                        albumId={album.id}
                        settings={settings}
                        isActive={spreadIndex === currentSpreadIndex}
                        isSelected={selectedIndices.has(spreadIndex)}
                        canDelete={spreads.length > 1}
                        showCheckbox={true}
                        onClick={(e) => handleSpreadClick(spreadIndex, e)}
                        onCheckboxChange={(checked) => handleCheckboxChange(spreadIndex, checked)}
                        onDelete={() => handleDeleteSpread(spread.id)}
                    />
                ))}

                <button
                    className="add-page-btn"
                    onClick={handleAddSpread}
                    disabled={!canAddMore}
                    title={canAddMore ? 'Add Spread' : `Maximum ${maxSpreads} spreads reached`}
                    data-testid="add-pages-button"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    Add Spread
                </button>
            </div>
        </aside>
    );
};
