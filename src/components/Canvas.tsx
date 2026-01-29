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

        // Get viewport dimensions (with some padding)
        const padding = 64; // 32px on each side
        const availableWidth = viewport.clientWidth - padding;
        const availableHeight = viewport.clientHeight - padding;

        // Get canvas natural size (at 100% zoom)
        const canvasWidth = canvas.offsetWidth;
        const canvasHeight = canvas.offsetHeight;

        // Calculate zoom to fit both dimensions
        const zoomToFitWidth = (availableWidth / canvasWidth) * 100;
        const zoomToFitHeight = (availableHeight / canvasHeight) * 100;

        // Use the smaller zoom to fit both dimensions
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
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;

            // Determine which page (left or right) based on x position
            const isRightPage = x > 50;
            const targetPage = pages[isRightPage ? 1 : 0];

            if (targetPage) {
                // Adjust x for the target page (0-100% within that page)
                const adjustedX = isRightPage ? (x - 50) * 2 : x * 2;
                onImageDrop(targetPage.id, image, { x: adjustedX, y });
            }
        } catch (error) {
            console.error('Failed to parse dropped image data:', error);
        }
    }, [onImageDrop, pages]);

    const handleCanvasClick = useCallback((e: React.MouseEvent) => {
        if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('spread-page')) {
            onElementSelect(null);
        }
    }, [onElementSelect]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (selectedElementId) {
                // Find which page contains this element
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
                    {/* Left page */}
                    <div className="spread-page spread-page-left">
                        {pages[0] && pages[0].elements.map(element => (
                            <CanvasElement
                                key={element.id}
                                element={element}
                                pageId={pages[0].id}
                                isSelected={element.id === selectedElementId}
                                isSnappingEnabled={isSnappingEnabled}
                                pageOffset={0}
                                onSelect={() => onElementSelect(element.id)}
                                onUpdate={(updates) => onElementUpdate(pages[0].id, element.id, updates)}
                                onSnapLinesChange={setActiveSnapLines}
                                onDragEnd={clearSnapLines}
                            />
                        ))}
                    </div>

                    {/* Center seam */}
                    <div className="spread-seam" />

                    {/* Right page */}
                    <div className="spread-page spread-page-right">
                        {pages[1] && pages[1].elements.map(element => (
                            <CanvasElement
                                key={element.id}
                                element={element}
                                pageId={pages[1].id}
                                isSelected={element.id === selectedElementId}
                                isSnappingEnabled={isSnappingEnabled}
                                pageOffset={50}
                                onSelect={() => onElementSelect(element.id)}
                                onUpdate={(updates) => onElementUpdate(pages[1].id, element.id, updates)}
                                onSnapLinesChange={setActiveSnapLines}
                                onDragEnd={clearSnapLines}
                            />
                        ))}
                    </div>

                    {/* Snap indicator lines */}
                    {activeSnapLines.map((edge, i) => (
                        <SnapIndicator key={`${edge}-${i}`} edge={edge} />
                    ))}

                    {/* Empty state placeholder */}
                    {pages.every(p => p.elements.length === 0) && (
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
    isSelected: boolean;
    isSnappingEnabled: boolean;
    pageOffset: number; // 0 for left page, 50 for right page
    onSelect: () => void;
    onUpdate: (updates: Partial<PageElement>) => void;
    onSnapLinesChange: (edges: SnapEdge[]) => void;
    onDragEnd: () => void;
}

const CanvasElement: React.FC<CanvasElementProps> = ({
    element,
    pageId,
    isSelected,
    isSnappingEnabled,
    pageOffset,
    onSelect,
    onUpdate,
    onSnapLinesChange,
    onDragEnd,
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0, elemX: 0, elemY: 0, elemW: 0, elemH: 0 });
    const elementRef = useRef<HTMLDivElement>(null);

    // Convert element position from page-relative to spread-relative for display
    const spreadX = pageOffset + (element.position.x / 2);
    const spreadWidth = element.size.width / 2;

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect();

        if ((e.target as HTMLElement).classList.contains('resize-handle')) {
            return; // Let resize handler handle this
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
        if (!elementRef.current?.parentElement?.parentElement) return;

        const spread = elementRef.current.parentElement.parentElement;
        const rect = spread.getBoundingClientRect();

        // Calculate movement in spread percentage
        const deltaXPercent = ((e.clientX - dragStart.x) / rect.width) * 100;
        const deltaYPercent = ((e.clientY - dragStart.y) / rect.height) * 100;

        if (isDragging) {
            // Convert to page-relative (multiply by 2 since spread is 2x page width)
            let newX = dragStart.elemX + deltaXPercent * 2;
            let newY = dragStart.elemY + deltaYPercent;

            // Clamp to page bounds (0-100%)
            newX = Math.max(0, Math.min(100 - element.size.width, newX));
            newY = Math.max(0, Math.min(100 - element.size.height, newY));

            // Apply snapping if enabled
            if (isSnappingEnabled) {
                // Convert to spread coordinates for snapping
                const spreadPos = {
                    x: pageOffset + newX / 2,
                    y: newY,
                };
                const spreadSize = {
                    width: element.size.width / 2,
                    height: element.size.height,
                };
                const snapResult = calculateSnap(spreadPos, spreadSize);

                if (snapResult.snappedEdges.length > 0) {
                    // Convert back to page coordinates
                    newX = (snapResult.position.x - pageOffset) * 2;
                    newY = snapResult.position.y;
                    onSnapLinesChange(snapResult.snappedEdges);
                } else {
                    onSnapLinesChange([]);
                }
            }

            onUpdate({
                position: { x: newX, y: newY },
                snapConstraints: undefined, // Clear constraints during drag
            });
        } else if (isResizing && resizeHandle) {
            let newX = dragStart.elemX;
            let newY = dragStart.elemY;
            let newWidth = dragStart.elemW;
            let newHeight = dragStart.elemH;

            // Handle resize based on which handle is being dragged
            if (resizeHandle.includes('e')) {
                newWidth = dragStart.elemW + deltaXPercent * 2;
            }
            if (resizeHandle.includes('w')) {
                const widthChange = deltaXPercent * 2;
                newX = dragStart.elemX + widthChange;
                newWidth = dragStart.elemW - widthChange;
            }
            if (resizeHandle.includes('s')) {
                newHeight = dragStart.elemH + deltaYPercent;
            }
            if (resizeHandle.includes('n')) {
                const heightChange = deltaYPercent;
                newY = dragStart.elemY + heightChange;
                newHeight = dragStart.elemH - heightChange;
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

            // Clamp to bounds
            newX = Math.max(0, newX);
            newY = Math.max(0, newY);
            if (newX + newWidth > 100) newWidth = 100 - newX;
            if (newY + newHeight > 100) newHeight = 100 - newY;

            onUpdate({
                position: { x: newX, y: newY },
                size: { width: newWidth, height: newHeight },
            });
        }
    }, [isDragging, isResizing, resizeHandle, dragStart, element, pageOffset, isSnappingEnabled, onUpdate, onSnapLinesChange]);

    const handleMouseUp = useCallback(() => {
        if (isDragging || isResizing) {
            onDragEnd();
        }
        setIsDragging(false);
        setIsResizing(false);
        setResizeHandle(null);
    }, [isDragging, isResizing, onDragEnd]);

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
                left: `${element.position.x}%`,
                top: `${element.position.y}%`,
                width: `${element.size.width}%`,
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
