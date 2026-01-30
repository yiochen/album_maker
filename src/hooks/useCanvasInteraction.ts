import { useState, useCallback, useRef } from 'react';
import type { Page, PageElement, SnapEdge, PoolImage } from '../types';
import { calculateSnap } from '../utils/snapping';

interface UseCanvasInteractionProps {
    pages: Page[];
    settings: any; // AlbumSettings
    isSnappingEnabled: boolean;
    onElementSelect: (id: string | null) => void;
    onElementUpdate: (pageId: string, elementId: string, updates: Partial<PageElement>) => void;
    onElementDelete: (pageId: string, elementId: string) => void;
    onMoveElementToPage?: (fromPageId: string, toPageId: string, elementId: string) => void;
    onImageDrop: (pageId: string, image: PoolImage, position: { x: number; y: number }) => void;
    onSnapLinesChange: (lines: SnapEdge[]) => void;
    onInteractionEnd?: () => void;
}

export function useCanvasInteraction({
    pages,
    settings,
    isSnappingEnabled,
    onElementSelect,
    onElementUpdate,
    onElementDelete,
    onMoveElementToPage,
    onImageDrop,
    onSnapLinesChange,
    onInteractionEnd,
}: UseCanvasInteractionProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [resizeHandle, setResizeHandle] = useState<string | null>(null);
    const [activeElementId, setActiveElementId] = useState<string | null>(null);

    // interaction start state
    const dragStartRef = useRef<{
        x: number;
        y: number;
        elemX: number;
        elemY: number;
        elemW: number;
        elemH: number;
        pageId: string;
        element: PageElement;
    } | null>(null);

    // Helper to get element under cursor
    const getElementAt = useCallback((x: number, y: number, rect: DOMRect) => {
        // Convert mouse to spread %
        const spreadX = ((x - rect.left) / rect.width) * 100;
        const spreadY = ((y - rect.top) / rect.height) * 100;

        // Iterate pages and elements to find hit
        // Check top-most (last rendered) first
        for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
            const page = pages[pageIdx];
            const pageOffset = pageIdx * 50; // 0 or 50

            // Check elements in reverse order (top to bottom)
            for (let i = page.elements.length - 1; i >= 0; i--) {
                const el = page.elements[i];

                // Convert element pos to spread %
                const elResultX = pageOffset + (el.position.x / 100) * 50;
                const elResultY = el.position.y;
                const elResultW = (el.size.width / 100) * 50;
                const elResultH = el.size.height;

                if (
                    spreadX >= elResultX &&
                    spreadX <= elResultX + elResultW &&
                    spreadY >= elResultY &&
                    spreadY <= elResultY + elResultH
                ) {
                    return { element: el, pageId: page.id, pageIdx };
                }
            }
        }
        return null;
    }, [pages]);

    const handleMouseDown = useCallback((e: React.MouseEvent, rect: DOMRect) => {
        // Check for resize handle click first (if selected)
        const target = e.target as HTMLElement;
        if (target.classList.contains('resize-handle')) {
            const handle = target.dataset.handle;
            const elementId = target.dataset.elementId;
            if (handle && elementId) {
                // Find element
                let found: { element: PageElement; pageId: string } | null = null;
                for (const p of pages) {
                    const el = p.elements.find(el => el.id === elementId);
                    if (el) {
                        found = { element: el, pageId: p.id };
                        break;
                    }
                }

                if (found) {
                    setIsResizing(true);
                    setResizeHandle(handle);
                    setActiveElementId(elementId);

                    dragStartRef.current = {
                        x: e.clientX,
                        y: e.clientY,
                        elemX: found.element.position.x,
                        elemY: found.element.position.y,
                        elemW: found.element.size.width,
                        elemH: found.element.size.height,
                        pageId: found.pageId,
                        element: found.element
                    };
                    return;
                }
            }
        }

        // Check for element click
        const hit = getElementAt(e.clientX, e.clientY, rect);
        if (hit) {
            onElementSelect(hit.element.id);
            setActiveElementId(hit.element.id);
            setIsDragging(true);

            dragStartRef.current = {
                x: e.clientX,
                y: e.clientY,
                elemX: hit.element.position.x,
                elemY: hit.element.position.y,
                elemW: hit.element.size.width,
                elemH: hit.element.size.height,
                pageId: hit.pageId,
                element: hit.element
            };
        } else {
            onElementSelect(null);
            setActiveElementId(null);
        }
    }, [pages, getElementAt, onElementSelect]);

    const handleMouseMove = useCallback((e: React.MouseEvent, rect: DOMRect) => {
        if (!isDragging && !isResizing) return;
        if (!dragStartRef.current) return;

        const start = dragStartRef.current;
        const deltaXSpread = ((e.clientX - start.x) / rect.width) * 100;
        const deltaYPercent = ((e.clientY - start.y) / rect.height) * 100;
        const deltaXPage = deltaXSpread * 2; // Convert to page coordinates

        if (isDragging) {
            let newX = start.elemX + deltaXPage;
            let newY = start.elemY + deltaYPercent;

            // Clamp Y
            newY = Math.max(0, Math.min(100 - start.elemH, newY));

            if (isSnappingEnabled) {
                // Find current page index for offset
                const pageIdx = pages.findIndex(p => p.id === start.pageId) || 0;
                const pageOffset = pageIdx * 50;

                const spreadPos = {
                    x: pageOffset + (newX / 2),
                    y: newY
                };
                const spreadSize = {
                    width: start.elemW / 2,
                    height: start.elemH
                };

                const snap = calculateSnap(spreadPos, spreadSize);

                if (snap.snappedEdges.length > 0) {
                    newX = (snap.position.x - pageOffset) * 2;
                    newY = snap.position.y;
                    onSnapLinesChange(snap.snappedEdges);
                } else {
                    onSnapLinesChange([]);
                }
            }

            onElementUpdate(start.pageId, start.element.id, {
                position: { x: newX, y: newY }
            });
        } else if (isResizing && resizeHandle) {
            let newX = start.elemX;
            let newY = start.elemY;
            let newWidth = start.elemW;
            let newHeight = start.elemH;

            if (resizeHandle.includes('e')) {
                newWidth = start.elemW + deltaXPage;
            }
            if (resizeHandle.includes('w')) {
                newX = start.elemX + deltaXPage;
                newWidth = start.elemW - deltaXPage;
            }
            if (resizeHandle.includes('s')) {
                newHeight = start.elemH + deltaYPercent;
            }
            if (resizeHandle.includes('n')) {
                newY = start.elemY + deltaYPercent;
                newHeight = start.elemH - deltaYPercent;
            }

            // Constraints
            newWidth = Math.max(5, newWidth);
            newHeight = Math.max(5, newHeight);

            // Aspect Ratio
            if (start.element.lockAspectRatio && start.element.originalAspectRatio) {
                if (resizeHandle.includes('e') || resizeHandle.includes('w')) {
                    newHeight = newWidth / start.element.originalAspectRatio;
                } else {
                    newWidth = newHeight * start.element.originalAspectRatio;
                }
            }

            onElementUpdate(start.pageId, start.element.id, {
                position: { x: newX, y: newY },
                size: { width: newWidth, height: newHeight }
            });
        }
    }, [isDragging, isResizing, resizeHandle, pages, isSnappingEnabled, onElementUpdate, onSnapLinesChange]);

    const handleMouseUp = useCallback(() => {
        if (isDragging && dragStartRef.current) {
            // Handle page transfer
            const start = dragStartRef.current;
            const pageIdx = pages.findIndex(p => p.id === start.pageId);
            const pageOffset = pageIdx * 50; // 0 or 50

            // Current center in spread %
            const currentSpreadX = pageOffset + (start.element.position.x / 100 * 50); // Need CURRENT position, not start
          
            // Let's find the current element in 'pages'
            const currentPage = pages.find(p => p.id === start.pageId);
            const currentElement = currentPage?.elements.find(e => e.id === start.element.id);

            if (currentElement) {
                const currentSpreadCenterX = pageOffset + ((currentElement.position.x + currentElement.size.width / 2) / 100 * 50);
                const shouldBeRight = currentSpreadCenterX >= 50;
                const isRight = pageIdx === 1;

                if (shouldBeRight !== isRight && onMoveElementToPage && pages.length === 2) {
                    const targetPageId = shouldBeRight ? pages[1].id : pages[0].id;

                    // Convert coords
                    let newX = currentElement.position.x;
                    if (shouldBeRight) { // Left -> Right : (X * 0.5 - 50) * 2
                        newX = ((currentElement.position.x / 100 * 50) - 50) * 2;
                    } else { // Right -> Left
                        newX = (((currentElement.position.x / 100 * 50) + 50) / 50) * 100;
                    }
                    // Actually the math is simpler:
                    // Spread % = PageOffset + (Page% * 0.5)
                    // Target Page% = (Spread% - TargetOffset) * 2

                    // Wait, my manual calculation in handleMouseMove blindly updated page-relative coords
                    // even if they went out of bounds (e.g. 150%).
                    // So we just need to re-normalize to the new page.

                    if (shouldBeRight) {
                        // currently on Left (Offset 0). Pos X might be 120%.
                        // New Page (Offset 50).
                        // Spread X = 0 + 120/2 = 60%.
                        // New Page X = (60 - 50) * 2 = 20%.
                        newX = (currentElement.position.x / 2 - 50) * 2;
                        // Simplified: currentElement.position.x - 100
                    } else {
                        // currently on Right (Offset 50). Pos X might be -20%.
                        // New Page (Offset 0).
                        // Spread X = 50 + (-20/2) = 40%.
                        // New Page X = (40 - 0) * 2 = 80%.
                        newX = (currentElement.position.x / 2 + 50) * 2;
                        // Simplified: currentElement.position.x + 100
                    }

                    onElementUpdate(start.pageId, start.element.id, { position: { x: newX, y: currentElement.position.y } });
                    onMoveElementToPage(start.pageId, targetPageId, start.element.id);
                }
            }
        }

        setIsDragging(false);
        setIsResizing(false);
        setResizeHandle(null);
        dragStartRef.current = null;
        onSnapLinesChange([]);

        if (onInteractionEnd) {
            onInteractionEnd();
        }
    }, [isDragging, isResizing, pages, onMoveElementToPage, onElementUpdate, onSnapLinesChange, onInteractionEnd]);


    // Handle Drop
    const handleDrop = useCallback((e: React.DragEvent, rect: DOMRect) => {
        e.preventDefault();
        const imageData = e.dataTransfer.getData('application/json');
        if (!imageData) return;

        try {
            const image: PoolImage = JSON.parse(imageData);
            const spreadX = ((e.clientX - rect.left) / rect.width) * 100;
            const spreadY = ((e.clientY - rect.top) / rect.height) * 100;

            const isRight = spreadX >= 50;
            const targetPage = pages[isRight ? 1 : 0];

            if (targetPage) {
                const pageX = isRight ? (spreadX - 50) * 2 : spreadX * 2;
                onImageDrop(targetPage.id, image, { x: pageX, y: spreadY });
            }
        } catch (err) {
            console.error(err);
        }
    }, [pages, onImageDrop]);

    return {
        isDragging,
        isResizing,
        activeElementId,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleDrop
    };
}
