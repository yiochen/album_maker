import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAlbumSpreads, useAlbumSettings, useAlbumId, useAddSpreads, useDeleteSpread, useDeletePages } from '../states/albumStore';
import {
    useCurrentSpreadIndex, useSelectedPageSide, useSetCurrentSpreadIndex, useSetSelectedPageSide,
    useSelectedPages, useTogglePageSelection, useSetSelectedPages, useClearPageSelection,
} from '../states/uiStore';
import { SpreadThumbnail } from './SpreadThumbnail';
import { Spread } from '../types';
import { PlusIcon } from './icons/PlusIcon';

interface MarqueeState {
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
}

function rectsIntersect(
    a: { left: number; top: number; right: number; bottom: number },
    b: { left: number; top: number; right: number; bottom: number },
): boolean {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

export const PageNavigator: React.FC = () => {
    const spreads = useAlbumSpreads();
    const settings = useAlbumSettings();
    const albumId = useAlbumId();
    const addSpreads = useAddSpreads();
    const deleteSpread = useDeleteSpread();
    const deletePages = useDeletePages();
    const currentSpreadIndex = useCurrentSpreadIndex();
    const selectedPageSide = useSelectedPageSide();
    const setCurrentSpreadIndex = useSetCurrentSpreadIndex();
    const setSelectedPageSide = useSetSelectedPageSide();
    const selectedPages = useSelectedPages();
    const togglePageSelection = useTogglePageSelection();
    const setSelectedPages = useSetSelectedPages();
    const clearPageSelection = useClearPageSelection();

    const pageListRef = useRef<HTMLDivElement>(null);
    const [marquee, setMarquee] = useState<MarqueeState | null>(null);

    const maxSpreads = settings ? settings.maxPages / 2 : 20;
    const canAddMore = spreads.length < maxSpreads;
    const pageAspectRatio = settings ? settings.pageWidth / settings.pageHeight : 1;
    const selectedSpreadIndexSafe = Math.max(0, Math.min(currentSpreadIndex, spreads.length - 1));

    const handleAddSpread = () => {
        const insertIndex = currentSpreadIndex + 1;
        addSpreads(1, insertIndex);
        setCurrentSpreadIndex(insertIndex);
        setSelectedPageSide('left');
    };

    const handlePageClick = useCallback((spreadIndex: number, side: 'left' | 'right', event: React.MouseEvent) => {
        const pageNum = spreadIndex * 2 + (side === 'left' ? 1 : 2);
        if (event.ctrlKey || event.metaKey) {
            togglePageSelection(pageNum);
        } else {
            clearPageSelection();
            setCurrentSpreadIndex(spreadIndex);
            setSelectedPageSide(side);
        }
    }, [setCurrentSpreadIndex, setSelectedPageSide, togglePageSelection, clearPageSelection]);

    // Compute pages intersecting the marquee rectangle
    const computeMarqueeSelection = useCallback((mx: MarqueeState) => {
        const container = pageListRef.current;
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        const scrollTop = container.scrollTop;

        // Marquee coords are relative to the container's content (including scroll)
        const mLeft = Math.min(mx.startX, mx.currentX);
        const mRight = Math.max(mx.startX, mx.currentX);
        const mTop = Math.min(mx.startY, mx.currentY);
        const mBottom = Math.max(mx.startY, mx.currentY);
        const marqueeRect = { left: mLeft, top: mTop, right: mRight, bottom: mBottom };

        const buttons = container.querySelectorAll<HTMLElement>('[data-page-number]');
        const next = new Set<number>();
        buttons.forEach((btn) => {
            const btnRect = btn.getBoundingClientRect();
            // Convert button rect to container-content-relative coords
            const btnRelative = {
                left: btnRect.left - containerRect.left,
                top: btnRect.top - containerRect.top + scrollTop,
                right: btnRect.right - containerRect.left,
                bottom: btnRect.bottom - containerRect.top + scrollTop,
            };
            if (rectsIntersect(marqueeRect, btnRelative)) {
                const pageNum = parseInt(btn.getAttribute('data-page-number')!, 10);
                if (!isNaN(pageNum)) next.add(pageNum);
            }
        });
        setSelectedPages(next);
    }, [setSelectedPages]);

    // Marquee mouse handlers
    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        // Only start marquee if clicking on the container background, not on a page button
        const target = e.target as HTMLElement;
        if (target.closest('.spread-page-button') || target.closest('.add-page-btn')) return;

        const container = pageListRef.current;
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        const x = e.clientX - containerRect.left;
        const y = e.clientY - containerRect.top + container.scrollTop;

        setMarquee({ startX: x, startY: y, currentX: x, currentY: y });
        // Clear existing selection when starting a new marquee (unless modifier held)
        if (!e.ctrlKey && !e.metaKey) {
            clearPageSelection();
        }
    }, [clearPageSelection]);

    useEffect(() => {
        if (!marquee) return;

        const container = pageListRef.current;
        if (!container) return;

        const handleMouseMove = (e: MouseEvent) => {
            const containerRect = container.getBoundingClientRect();
            const x = e.clientX - containerRect.left;
            const y = e.clientY - containerRect.top + container.scrollTop;
            const updated: MarqueeState = { startX: marquee.startX, startY: marquee.startY, currentX: x, currentY: y };
            setMarquee(updated);
            computeMarqueeSelection(updated);
        };

        const handleMouseUp = () => {
            setMarquee(null);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [marquee, computeMarqueeSelection]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Delete' && e.key !== 'Backspace') return;
            if (spreads.length <= 1 && selectedPages.size === 0) return;

            const target = e.target as HTMLElement | null;
            if (target && (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.tagName === 'SELECT' ||
                target.isContentEditable
            )) {
                return;
            }

            e.preventDefault();

            if (selectedPages.size > 0) {
                // Page-level deletion: delete selected pages and re-pair remaining
                const totalPages = spreads.length * 2;
                const remainingCount = totalPages - selectedPages.size;
                // Ensure at least 1 page (and thus 1 spread) remains
                if (remainingCount < 1) return;

                deletePages([...selectedPages]);
                clearPageSelection();
                // Clamp currentSpreadIndex to new spread count
                const newSpreadCount = Math.ceil(remainingCount / 2);
                if (currentSpreadIndex >= newSpreadCount) {
                    setCurrentSpreadIndex(Math.max(0, newSpreadCount - 1));
                }
            } else {
                // Fallback: delete entire spread (legacy behavior)
                if (spreads.length <= 1) return;
                const spread = spreads[selectedSpreadIndexSafe];
                if (!spread) return;
                deleteSpread(spread.id);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedSpreadIndexSafe, spreads, deleteSpread, deletePages, selectedPages, clearPageSelection, currentSpreadIndex, setCurrentSpreadIndex]);

    if (!settings) return null;

    // Compute marquee div style (relative to container content area)
    const marqueeStyle = marquee ? (() => {
        const container = pageListRef.current;
        if (!container) return undefined;
        const scrollTop = container.scrollTop;
        const left = Math.min(marquee.startX, marquee.currentX);
        const top = Math.min(marquee.startY, marquee.currentY) - scrollTop;
        const width = Math.abs(marquee.currentX - marquee.startX);
        const height = Math.abs(marquee.currentY - marquee.startY);
        // Position relative to the container's visible area using fixed positioning within the container
        return { left, top, width, height } as React.CSSProperties;
    })() : undefined;

    return (
        <aside className="page-navigator" data-testid="page-navigator">
            <div className="page-navigator-header">
                <span className="page-navigator-title" data-testid="page-navigator-title">Spreads</span>
                <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }} data-testid="page-count">
                    {spreads.length} / {maxSpreads} spreads
                </span>
            </div>

            <div
                className={`page-list ${marquee ? 'marquee-active' : ''}`}
                ref={pageListRef}
                onMouseDown={handleMouseDown}
            >
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
                        isLeftInSelection={selectedPages.has(spreadIndex * 2 + 1)}
                        isRightInSelection={selectedPages.has(spreadIndex * 2 + 2)}
                        onPageClick={(side, event) => handlePageClick(spreadIndex, side, event)}
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

                {marquee && marqueeStyle && (
                    <div className="marquee-rect" style={marqueeStyle} />
                )}
            </div>
        </aside>
    );
};
