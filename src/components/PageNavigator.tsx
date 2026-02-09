import React, { useState, useCallback } from 'react';
import { useAlbumSpreads, useAlbumSettings, useAlbumId, useAddSpreads, useDeleteSpread, useDeleteSpreads } from '../states/albumStore';
import { useCurrentSpreadIndex, useSetCurrentSpreadIndex } from '../states/uiStore';
import { SpreadThumbnail } from './SpreadThumbnail';
import { Spread } from '../types';
import { PlusIcon } from './icons/PlusIcon';

export const PageNavigator: React.FC = () => {
    const spreads = useAlbumSpreads();
    const settings = useAlbumSettings();
    const albumId = useAlbumId();
    const addSpreads = useAddSpreads();
    const deleteSpread = useDeleteSpread();
    const deleteSpreads = useDeleteSpreads();
    const currentSpreadIndex = useCurrentSpreadIndex();
    const setCurrentSpreadIndex = useSetCurrentSpreadIndex();

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

    // Helper for bulk delete
    const handleDeleteSpreads = useCallback((spreadIndices: number[]) => {
        if (spreads.length === 0) return;

        const ids: string[] = [];
        for (const idx of spreadIndices) {
            if (spreads[idx]) {
                ids.push(spreads[idx].id);
            }
        }

        if (ids.length > 0) {
            deleteSpreads(ids);
        }
    }, [spreads, deleteSpreads]);

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

    if (!settings) return null;

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
                        albumId={albumId!}
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
                    <PlusIcon width="16" height="16" />
                    Add Spread
                </button>
            </div>
        </aside>
    );
};
