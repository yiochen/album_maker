import React, { useEffect, useState } from 'react';
import { Album } from '../types';
import { spreadThumbnailDB } from '../db';

interface ExportSelectionGridProps {
    album: Album;
    exportUnit: 'page' | 'spread';
    selectedIds: Set<string>;
    onToggle: (id: string) => void;
    onSelectAll: () => void;
    onSelectNone: () => void;
}

export const ExportSelectionGrid: React.FC<ExportSelectionGridProps> = ({
    album,
    exportUnit,
    selectedIds,
    onToggle,
    onSelectAll,
    onSelectNone,
}) => {
    const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadThumbnails = async () => {
            setIsLoading(true);
            try {
                const results = await spreadThumbnailDB.getAllForAlbum(album.id);
                const thumbMap: Record<string, string> = {};
                results.forEach(rec => {
                    thumbMap[rec.spreadId] = rec.dataUrl;
                });
                setThumbnails(thumbMap);
            } catch (error) {
                console.error('Failed to load thumbnails for selection grid:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadThumbnails();
    }, [album.id]);

    const renderSelectionItem = (spreadId: string, index: number, subId?: 'left' | 'right') => {
        const fullId = subId ? `${spreadId}:${subId}` : spreadId;
        const isSelected = selectedIds.has(fullId);
        const thumbnailUrl = thumbnails[spreadId];

        // Page numbers
        let label = '';
        if (exportUnit === 'spread') {
            label = `Spread ${index + 1} (Pages ${index * 2 + 1}-${index * 2 + 2})`;
        } else {
            const pageNum = index * 2 + (subId === 'left' ? 1 : 2);
            label = `Page ${pageNum}`;
        }

        return (
            <div
                key={fullId}
                className={`selection-card ${isSelected ? 'selected' : ''}`}
                onClick={() => onToggle(fullId)}
            >
                <div className="selection-thumbnail-wrapper">
                    {thumbnailUrl ? (
                        subId ? (
                            <div
                                className={`split-page-thumbnail split-${subId}`}
                                style={{ backgroundImage: `url(${thumbnailUrl})` }}
                                aria-label={label}
                                role="img"
                            />
                        ) : (
                            <img
                                src={thumbnailUrl}
                                alt={label}
                                className="selection-thumbnail"
                            />
                        )
                    ) : (
                        <div className="spread-thumbnail-placeholder" />
                    )}
                    {isSelected && <div className="selection-badge">✓</div>}
                </div>
                <div className="selection-card-label">{label}</div>
            </div>
        );
    };

    return (
        <div className="selection-grid-container">
            <div className="selection-controls">
                <button className="btn btn-ghost btn-sm" onClick={onSelectAll}>Select All</button>
                <button className="btn btn-ghost btn-sm" onClick={onSelectNone}>Deselect All</button>
            </div>

            <div className="selection-grid">
                {isLoading ? (
                    <div className="loading-spinner" style={{ gridColumn: '1 / -1', margin: '2rem auto' }} />
                ) : (
                    album.spreads.flatMap((spread, index) => {
                        if (exportUnit === 'page') {
                            return [
                                renderSelectionItem(spread.id, index, 'left'),
                                renderSelectionItem(spread.id, index, 'right')
                            ];
                        }
                        return [renderSelectionItem(spread.id, index)];
                    })
                )}
            </div>

            <p className="text-muted" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)' }}>
                {selectedIds.size} items selected for export
            </p>
        </div>
    );
};
