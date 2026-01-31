import React, { useState, useCallback } from 'react';
import type { Spread, AlbumSettings } from '../types';
import { SpreadThumbnail } from './SpreadThumbnail';

interface PageNavigatorProps {
    spreads: Spread[];
    currentSpreadIndex: number;
    maxSpreads: number;
    albumId: string;
    settings: AlbumSettings;
    onSpreadSelect: (spreadIndex: number) => void;
    onAddSpread: () => void;
    onDeleteSpread: (spreadId: string) => void;
    onDeleteSpreads: (spreadIndices: number[]) => void;
}

export const PageNavigator: React.FC<PageNavigatorProps> = ({
    spreads,
    currentSpreadIndex,
    maxSpreads,
    albumId,
    settings,
    onSpreadSelect,
    onAddSpread,
    onDeleteSpread,
    onDeleteSpreads,
}) => {
    const canAddMore = spreads.length < maxSpreads;

    // Multi-selection state
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
    const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);

    // Clear selection when spreads change (e.g., after deletion)
    const [prevLength, setPrevLength] = useState(spreads.length);
    if (prevLength !== spreads.length) {
        setPrevLength(spreads.length);
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

        if (window.confirm(`Delete ${selectedIndices.size} spread(s)?`)) {
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
                {spreads.map((spread, spreadIndex) => (
                    <SpreadThumbnail
                        key={spread.id}
                        spread={spread}
                        spreadIndex={spreadIndex}
                        albumId={albumId}
                        settings={settings}
                        isActive={spreadIndex === currentSpreadIndex}
                        isSelected={selectedIndices.has(spreadIndex)}
                        canDelete={spreads.length > 1}
                        showCheckbox={true}
                        onClick={(e) => handleSpreadClick(spreadIndex, e)}
                        onCheckboxChange={(checked) => handleCheckboxChange(spreadIndex, checked)}
                        onDelete={() => onDeleteSpread(spread.id)}
                    />
                ))}

                <button
                    className="add-page-btn"
                    onClick={onAddSpread}
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
