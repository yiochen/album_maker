import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { Page, PageElement, PoolImage, AlbumSettings, SnapEdge } from '../types';
import { calculateSnap, calculateResizeSnap, getActiveSnapLines } from '../utils/snapping';

interface CanvasProps {
    pages: Page[];  // Two pages for a spread
    pageIndex: number;  // Index of left page in spread
    settings: AlbumSettings;
    selectedElementId: string | null;
    isSnappingEnabled: boolean;
    onElementSelect: (elementId: string | null) => void;
    onElementUpdate: (pageId: string, elementId: string, updates: Partial<PageElement>) => void;
    onElementDelete: (pageId: string, elementId: string) => void;
    onImageDrop: (pageId: string, image: PoolImage, position: { x: number; y: number }) => void;
    onMoveElementToPage?: (fromPageId: string, toPageId: string, elementId: string) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
    pages,
    pageIndex,
    settings,
    selectedElementId,
    isSnappingEnabled,
    onElementSelect,
    onElementUpdate,
    onElementDelete,
    onImageDrop,
    onMoveElementToPage,
}) => {
    const [zoom, setZoom] = useState(100);
    const [isDragOver, setIsDragOver] = useState(false);
    const [activeSnapLines, setActiveSnapLines] = useState<SnapEdge[]>([]);
    const canvasRef = useRef<HTMLDivElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);

    // Calculate aspect ratio for the spread (2x width, 1x height)
    const spreadAspectRatio = (settings.pageWidth * 2) / settings.pageHeight;

    // Fit canvas to viewport (both width and height)
    const fitToViewport = useCallback(() => {
        if (!viewportRef.current || !canvasRef.current) return;

        const viewport = viewportRef.current;
        const canvas = canvasRef.current;

        const padding = 64;
        const availableWidth = viewport.clientWidth - padding;
        const availableHeight = viewport.clientHeight - padding;

        const canvasWidth = canvas.offsetWidth;
        const canvasHeight = canvas.offsetHeight;

        const zoomToFitWidth = (availableWidth / canvasWidth) * 100;
        const zoomToFitHeight = (availableHeight / canvasHeight) * 100;

        const fitZoom = Math.min(zoomToFitWidth, zoomToFitHeight, 100);

        setZoom(Math.max(25, Math.round(fitZoom)));
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        const imageData = e.dataTransfer.getData('application/json');
        if (!imageData) return;

        try {
            const image: PoolImage = JSON.parse(imageData);
            const rect = canvasRef.current?.getBoundingClientRect();
            if (!rect) return;

            // Calculate drop position as percentage of spread
            const spreadX = ((e.clientX - rect.left) / rect.width) * 100;
            const spreadY = ((e.clientY - rect.top) / rect.height) * 100;

            // Determine which page based on spread position (< 50% = left page)
            const isRightPage = spreadX >= 50;
            const targetPage = pages[isRightPage ? 1 : 0];

            if (targetPage) {
                // Convert to page-relative coordinates (0-100% within that page)
                const pageX = isRightPage ? (spreadX - 50) * 2 : spreadX * 2;
                onImageDrop(targetPage.id, image, { x: pageX, y: spreadY });
            }
        } catch (error) {
            console.error('Failed to parse dropped image data:', error);
        }
    }, [onImageDrop, pages]);

    const handleCanvasClick = useCallback((e: React.MouseEvent) => {
        if (e.target === canvasRef.current ||
            (e.target as HTMLElement).classList.contains('spread-page') ||
            (e.target as HTMLElement).classList.contains('spread-canvas')) {
            onElementSelect(null);
        }
    }, [onElementSelect]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (selectedElementId) {
                for (const page of pages) {
                    if (page.elements.some(el => el.id === selectedElementId)) {
                        onElementDelete(page.id, selectedElementId);
                        break;
                    }
                }
            }
        } else if (e.key === 'Escape') {
            onElementSelect(null);
        }
    }, [selectedElementId, onElementSelect, onElementDelete, pages]);

    const clearSnapLines = useCallback(() => {
        setActiveSnapLines([]);
    }, []);

    // Collect all elements from both pages with their page info
    const allElements = pages.flatMap((page, idx) =>
        page.elements.map(element => ({
            element,
            pageId: page.id,
            pageIndex: idx,
        }))
    );

    return (
        <section className="canvas-container">
            <div
                ref={viewportRef}
                className="canvas-viewport"
                onKeyDown={handleKeyDown}
                tabIndex={0}
            >
                <div
                    ref={canvasRef}
                    className={`canvas spread-canvas ${isDragOver ? 'drop-active' : ''}`}
                    style={{
                        transform: `scale(${zoom / 100})`,
                        transformOrigin: 'center center',
                        aspectRatio: `${spreadAspectRatio}`,
                    }}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={handleCanvasClick}
                >
                    {/* Left page background */}
                    <div className="spread-page spread-page-left" />

                    {/* Right page background */}
                    <div className="spread-page spread-page-right" />

                    {/* Center seam */}
                    <div className="spread-seam" />

                    {/* All elements rendered directly in spread */}
                    {allElements.map(({ element, pageId, pageIndex: pIdx }) => (
                        <CanvasElement
                            key={element.id}
                            element={element}
                            pageId={pageId}
                            pageIndex={pIdx}
                            pages={pages}
                            isSelected={element.id === selectedElementId}
                            isSnappingEnabled={isSnappingEnabled}
                            onSelect={() => onElementSelect(element.id)}
                            onUpdate={(updates) => onElementUpdate(pageId, element.id, updates)}
                            onSnapLinesChange={setActiveSnapLines}
                            onDragEnd={clearSnapLines}
                            onMoveToPage={onMoveElementToPage}
                        />
                    ))}

                    {/* Snap indicator lines */}
                    {activeSnapLines.map((edge, i) => (
                        <SnapIndicator key={`${edge}-${i}`} edge={edge} />
                    ))}

                    {/* Empty state placeholder - centered across full spread */}
                    {allElements.length === 0 && (
                        <div className="canvas-placeholder">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
                                <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                                <path d="M21 15L16 10L11 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                            <span className="canvas-placeholder-text">
                                Drag images here from the image pool
                            </span>
                            <span className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
                                Pages {pageIndex + 1} - {pageIndex + 2}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <div className="canvas-controls">
                <button
                    className="btn btn-ghost btn-icon"
                    onClick={() => setZoom(z => Math.max(25, z - 25))}
                    disabled={zoom <= 25}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                        <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <path d="M8 11h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </button>
                <span className="zoom-display">{zoom}%</span>
                <button
                    className="btn btn-ghost btn-icon"
                    onClick={() => setZoom(z => Math.min(200, z + 25))}
                    disabled={zoom >= 200}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                        <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <path d="M11 8v6M8 11h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </button>
                <button
                    className="btn btn-ghost"
                    onClick={fitToViewport}
                    style={{ marginLeft: 'var(--space-2)' }}
                >
                    Fit
                </button>
            </div>
        </section>
    );
};

// Snap indicator line component
const SnapIndicator: React.FC<{ edge: SnapEdge }> = ({ edge }) => {
    const getStyle = (): React.CSSProperties => {
        switch (edge) {
            case 'left':
                return { left: 0, top: 0, width: '2px', height: '100%' };
            case 'right':
                return { right: 0, top: 0, width: '2px', height: '100%' };
            case 'top':
                return { left: 0, top: 0, height: '2px', width: '100%' };
            case 'bottom':
                return { left: 0, bottom: 0, height: '2px', width: '100%' };
            case 'seam':
                return { left: '50%', top: 0, width: '2px', height: '100%', transform: 'translateX(-50%)' };
            case 'left-center-v':
                return { left: '25%', top: 0, width: '2px', height: '100%', transform: 'translateX(-50%)' };
            case 'right-center-v':
                return { left: '75%', top: 0, width: '2px', height: '100%', transform: 'translateX(-50%)' };
            case 'left-center-h':
            case 'right-center-h':
                return { left: 0, top: '50%', height: '2px', width: '100%', transform: 'translateY(-50%)' };
            default:
                return {};
        }
    };

    return <div className="snap-indicator" style={getStyle()} />;
};

// Resize handle positions
const RESIZE_HANDLES = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const;
type ResizeHandle = typeof RESIZE_HANDLES[number];

interface CanvasElementProps {
    element: PageElement;
    pageId: string;
    pageIndex: number;  // 0 = left page, 1 = right page
    pages: Page[];
    isSelected: boolean;
    isSnappingEnabled: boolean;
    onSelect: () => void;
    onUpdate: (updates: Partial<PageElement>) => void;
    onSnapLinesChange: (edges: SnapEdge[]) => void;
    onDragEnd: () => void;
    onMoveToPage?: (fromPageId: string, toPageId: string, elementId: string) => void;
}

const CanvasElement: React.FC<CanvasElementProps> = ({
    element,
    pageId,
    pageIndex,
    pages,
    isSelected,
    isSnappingEnabled,
    onSelect,
    onUpdate,
    onSnapLinesChange,
    onDragEnd,
    onMoveToPage,
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0, elemX: 0, elemY: 0, elemW: 0, elemH: 0 });
    const elementRef = useRef<HTMLDivElement>(null);

    // Convert element position from page-relative (0-100% of page) to spread-relative (0-100% of spread)
    // Left page: 0-50% of spread, Right page: 50-100% of spread
    const pageOffset = pageIndex === 0 ? 0 : 50;
    const spreadX = pageOffset + (element.position.x / 100) * 50;  // Scale to half of spread
    const spreadWidth = (element.size.width / 100) * 50;  // Scale to half of spread

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect();

        if ((e.target as HTMLElement).classList.contains('resize-handle')) {
            return;
        }

        setIsDragging(true);
        setDragStart({
            x: e.clientX,
            y: e.clientY,
            elemX: element.position.x,
            elemY: element.position.y,
            elemW: element.size.width,
            elemH: element.size.height,
        });
    }, [element.position, element.size, onSelect]);

    const handleResizeStart = useCallback((e: React.MouseEvent, handle: ResizeHandle) => {
        e.stopPropagation();
        e.preventDefault();
        onSelect();
        setIsResizing(true);
        setResizeHandle(handle);
        setDragStart({
            x: e.clientX,
            y: e.clientY,
            elemX: element.position.x,
            elemY: element.position.y,
            elemW: element.size.width,
            elemH: element.size.height,
        });
    }, [element.position, element.size, onSelect]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!elementRef.current) return;

        // Find the spread canvas element
        const spread = elementRef.current.closest('.spread-canvas');
        if (!spread) return;

        const rect = spread.getBoundingClientRect();

        // Calculate movement in spread percentage (0-100)
        const deltaXSpread = ((e.clientX - dragStart.x) / rect.width) * 100;
        const deltaYPercent = ((e.clientY - dragStart.y) / rect.height) * 100;

        if (isDragging) {
            // Convert delta from spread % to page % (multiply by 2 since spread is 2x page width)
            const deltaXPage = deltaXSpread * 2;

            let newX = dragStart.elemX + deltaXPage;
            let newY = dragStart.elemY + deltaYPercent;

            // Allow moving beyond page bounds for cross-page drag
            // We'll clamp to spread bounds instead (0-200% in page terms = -100 to 200 for each page)
            newY = Math.max(0, Math.min(100 - element.size.height, newY));

            // Apply snapping if enabled
            if (isSnappingEnabled) {
                // Current page offset as spread %
                const currentPageOffset = pageIndex === 0 ? 0 : 50;

                // Convert to spread coordinates for snapping
                const spreadPos = {
                    x: currentPageOffset + (newX / 100) * 50,
                    y: newY,
                };
                const spreadSize = {
                    width: (element.size.width / 100) * 50,
                    height: element.size.height,
                };
                const snapResult = calculateSnap(spreadPos, spreadSize);

                if (snapResult.snappedEdges.length > 0) {
                    // Convert back to page coordinates
                    newX = ((snapResult.position.x - currentPageOffset) / 50) * 100;
                    newY = snapResult.position.y;
                    onSnapLinesChange(snapResult.snappedEdges);
                } else {
                    onSnapLinesChange([]);
                }
            }

            onUpdate({
                position: { x: newX, y: newY },
                snapConstraints: undefined,
            });
        } else if (isResizing && resizeHandle) {
            const deltaXPage = deltaXSpread * 2;

            let newX = dragStart.elemX;
            let newY = dragStart.elemY;
            let newWidth = dragStart.elemW;
            let newHeight = dragStart.elemH;

            if (resizeHandle.includes('e')) {
                newWidth = dragStart.elemW + deltaXPage;
            }
            if (resizeHandle.includes('w')) {
                newX = dragStart.elemX + deltaXPage;
                newWidth = dragStart.elemW - deltaXPage;
            }
            if (resizeHandle.includes('s')) {
                newHeight = dragStart.elemH + deltaYPercent;
            }
            if (resizeHandle.includes('n')) {
                newY = dragStart.elemY + deltaYPercent;
                newHeight = dragStart.elemH - deltaYPercent;
            }

            // Enforce minimum size
            newWidth = Math.max(5, newWidth);
            newHeight = Math.max(5, newHeight);

            // Keep aspect ratio if locked
            if (element.lockAspectRatio && element.originalAspectRatio) {
                if (resizeHandle.includes('e') || resizeHandle.includes('w')) {
                    newHeight = newWidth / element.originalAspectRatio;
                } else {
                    newWidth = newHeight * element.originalAspectRatio;
                }
            }

            // Clamp Y to bounds
            newY = Math.max(0, newY);
            if (newY + newHeight > 100) newHeight = 100 - newY;

            onUpdate({
                position: { x: newX, y: newY },
                size: { width: newWidth, height: newHeight },
            });
        }
    }, [isDragging, isResizing, resizeHandle, dragStart, element, pageIndex, isSnappingEnabled, onUpdate, onSnapLinesChange]);

    const handleMouseUp = useCallback(() => {
        if (isDragging) {
            // Check if element should move to other page
            const currentPageOffset = pageIndex === 0 ? 0 : 50;
            const elementCenter = currentPageOffset + ((element.position.x + element.size.width / 2) / 100) * 50;

            const shouldBeOnRightPage = elementCenter >= 50;
            const currentlyOnRightPage = pageIndex === 1;

            if (shouldBeOnRightPage !== currentlyOnRightPage && onMoveToPage && pages.length === 2) {
                const targetPageId = shouldBeOnRightPage ? pages[1].id : pages[0].id;

                // Convert position to new page's coordinate system
                if (shouldBeOnRightPage) {
                    // Moving from left to right page
                    const newX = ((element.position.x / 100) * 50 - 50) * 2;  // Shift and scale
                    onUpdate({ position: { x: newX, y: element.position.y } });
                } else {
                    // Moving from right to left page
                    const newX = (((element.position.x / 100) * 50 + 50) / 50) * 100;  // Shift and scale
                    onUpdate({ position: { x: newX, y: element.position.y } });
                }

                onMoveToPage(pageId, targetPageId, element.id);
            }

            onDragEnd();
        }
        if (isResizing) {
            onDragEnd();
        }
        setIsDragging(false);
        setIsResizing(false);
        setResizeHandle(null);
    }, [isDragging, isResizing, element, pageId, pageIndex, pages, onUpdate, onMoveToPage, onDragEnd]);

    // Attach global mouse listeners
    useEffect(() => {
        if (isDragging || isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

    return (
        <div
            ref={elementRef}
            className={`canvas-element ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
            style={{
                left: `${spreadX}%`,
                top: `${element.position.y}%`,
                width: `${spreadWidth}%`,
                height: `${element.size.height}%`,
            }}
            onMouseDown={handleMouseDown}
        >
            <img
                src={element.imageUrl}
                alt="Album element"
                draggable={false}
            />

            {/* Resize handles - only show when selected */}
            {isSelected && RESIZE_HANDLES.map(handle => (
                <div
                    key={handle}
                    className={`resize-handle resize-handle-${handle}`}
                    onMouseDown={(e) => handleResizeStart(e, handle)}
                />
            ))}
        </div>
    );
};
