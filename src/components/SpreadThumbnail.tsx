import React from 'react';
import type { Spread, AlbumSettings } from '../types';
import { TrashIcon } from './icons/TrashIcon';

/**
 * Props for the SpreadThumbnail component.
 */
interface SpreadThumbnailProps {
    /** The spread to display. */
    spread: Spread;
    /** The index of the spread in the album. */
    spreadIndex: number;
    /** The ID of the album the spread belongs to. */
    albumId: string;
    /** The global album settings. */
    settings: AlbumSettings;
    /** Whether this spread is currently active (being edited). */
    isActive: boolean;
    /** Whether this spread is selected (for multi-select actions). */
    isSelected: boolean;
    /** Whether the spread can be deleted (must have at least one spread remaining). */
    canDelete: boolean;
    /** Whether to show the selection checkbox. */
    showCheckbox: boolean;
    /** Callback fired when the thumbnail is clicked. */
    onClick: (e: React.MouseEvent) => void;
    /** Callback fired when the selection checkbox is toggled. */
    onCheckboxChange: (checked: boolean) => void;
    /** Callback fired when the delete button is clicked. */
    onDelete: () => void;
}

/**
 * SpreadThumbnail component renders a preview of a spread for the PageNavigator.
 * It uses the useCanvasThumbnail hook to generate previews and caches them in IndexedDB.
 */
export const SpreadThumbnail: React.FC<SpreadThumbnailProps> = ({
    spread,
    spreadIndex,
    albumId,
    isActive,
    isSelected,
    canDelete,
    showCheckbox,
    onClick,
    onCheckboxChange,
    onDelete,
}) => {
    // Virtual URL for the Service Worker to intercept
    const thumbnailUrl = `/__local__/spreadThumbnails/${albumId}/${spread.id}/${spread.versionId}`;

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
                <img
                    src={thumbnailUrl}
                    alt={`Spread ${spreadIndex + 1}`}
                    className="spread-thumbnail-image"
                    loading="lazy"
                />
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
