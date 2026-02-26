import React from 'react';
import type { Spread } from '../types';
import { PageHalfThumbnail } from './PageHalfThumbnail';

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
    /** Page aspect ratio (width / height). */
    pageAspectRatio: number;
    /** Whether this spread is currently shown on canvas. */
    isShowing: boolean;
    /** Whether left page is selected. */
    isLeftSelected: boolean;
    /** Whether right page is selected. */
    isRightSelected: boolean;
    /** Callback fired when a page is clicked. */
    onPageClick: (side: 'left' | 'right') => void;
}

/**
 * SpreadThumbnail component renders a preview of a spread for the PageNavigator.
 * It uses the useCanvasThumbnail hook to generate previews and caches them in IndexedDB.
 */
export const SpreadThumbnail: React.FC<SpreadThumbnailProps> = ({
    spread,
    spreadIndex,
    albumId,
    pageAspectRatio,
    isShowing,
    isLeftSelected,
    isRightSelected,
    onPageClick,
}) => {
    // Virtual URL for the Service Worker to intercept
    const thumbnailUrl = `/__local__/spreadThumbnails/${albumId}/${spread.id}/${spread.versionId}`;
    const safeAspectRatio = pageAspectRatio > 0 ? pageAspectRatio : 1;
    const maxThumbnailWidth = 96;
    const maxThumbnailHeight = 128;
    const pageThumbnailWidth = Math.round(
        Math.min(maxThumbnailWidth, maxThumbnailHeight * safeAspectRatio)
    );
    const pageThumbnailHeight = Math.round(
        Math.min(maxThumbnailHeight, maxThumbnailWidth / safeAspectRatio)
    );

    return (
        <div
            className={`spread-thumbnail ${isShowing ? 'showing' : ''}`}
            data-testid="spread-thumbnail"
        >
            <div className="spread-thumbnail-pages" data-testid="spread-thumbnail-pages">
                <button
                    type="button"
                    className={`spread-page-button ${isLeftSelected ? 'active' : ''}`}
                    onClick={() => onPageClick('left')}
                    data-testid="page-thumbnail-left"
                >
                    <PageHalfThumbnail
                        imageUrl={thumbnailUrl}
                        side="left"
                        width={pageThumbnailWidth}
                        height={pageThumbnailHeight}
                        alt={`Page ${spreadIndex * 2 + 1}`}
                    />
                    <span className="spread-page-number" data-testid="page-number">
                        {spreadIndex * 2 + 1}
                    </span>
                </button>

                <button
                    type="button"
                    className={`spread-page-button ${isRightSelected ? 'active' : ''}`}
                    onClick={() => onPageClick('right')}
                    data-testid="page-thumbnail-right"
                >
                    <PageHalfThumbnail
                        imageUrl={thumbnailUrl}
                        side="right"
                        width={pageThumbnailWidth}
                        height={pageThumbnailHeight}
                        alt={`Page ${spreadIndex * 2 + 2}`}
                    />
                    <span className="spread-page-number" data-testid="page-number">
                        {spreadIndex * 2 + 2}
                    </span>
                </button>
            </div>
        </div>
    );
};
