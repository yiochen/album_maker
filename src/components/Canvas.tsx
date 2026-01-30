import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { Page, PageElement, PoolImage, AlbumSettings, SnapEdge } from '../types';
import { useCanvasRender } from '../hooks/useCanvasRender';
import { useCanvasInteraction } from '../hooks/useCanvasInteraction';

interface CanvasProps {
    pages: Page[];
    pageIndex: number;
    settings: AlbumSettings;
    selectedElementId: string | null;
    isSnappingEnabled: boolean;
    onElementSelect: (elementId: string | null) => void;
    onElementUpdate: (pageId: string, elementId: string, updates: Partial<PageElement>) => void;
    onElementDelete: (pageId: string, elementId: string) => void;
    onImageDrop: (pageId: string, image: PoolImage, position: { x: number; y: number }) => void;
    onMoveElementToPage?: (fromPageId: string, toPageId: string, elementId: string) => void;
    onCanvasChange?: (dataUrl: string) => void;
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
    onCanvasChange,
}) => {
    const [zoom, setZoom] = useState(100);
    const [isDragOver, setIsDragOver] = useState(false);
    const [activeSnapLines, setActiveSnapLines] = useState<SnapEdge[]>([]);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);

    // Layout calculations
    const spreadAspectRatio = (settings.pageWidth * 2) / settings.pageHeight;
    // We need actual pixel dimensions for the canvas to avoid blurs
    // We'll calculate this based on the container size * Zoom
    const [renderSize, setRenderSize] = useState({ width: 800, height: 500 });

    // Interaction Hook
    const {
        isDragging,
        isResizing,
        handleMouseDown,
        handleDrop: handleInteractionDrop,
    } = useCanvasInteraction({
        pages,
        settings,
        isSnappingEnabled,
        onElementSelect,
        onElementUpdate,
        onElementDelete,
        onMoveElementToPage,
        onImageDrop,
        onSnapLinesChange: setActiveSnapLines,
        onInteractionEnd: () => {
            if (onCanvasChange && getCanvasDataUrl) {
                const dataUrl = getCanvasDataUrl();
                if (dataUrl) onCanvasChange(dataUrl);
            }
        }
    });

    // Render Hook
    const { getCanvasDataUrl } = useCanvasRender({
        canvasRef,
        pages,
        settings,
        zoom,
        width: renderSize.width,
        height: renderSize.height,
    });

    // Fit canvas to viewport
    const fitToViewport = useCallback(() => {
        if (!viewportRef.current) return;

        const padding = 64;
        const availableWidth = viewportRef.current.clientWidth - padding;
        const availableHeight = viewportRef.current.clientHeight - padding;

        // Target aspect ratio
        const targetWidth = availableWidth;
        const targetHeight = targetWidth / spreadAspectRatio;

        // Check if height fits
        if (targetHeight <= availableHeight) {
            setRenderSize({ width: targetWidth, height: targetHeight });
            // Zoom logic for UI display only - implementation simplifies zoom to just render size
            // But existing UI uses a zoom percentage number.
            // Let's approximate zoom relative to "100%" being some baseline (e.g. 1000px width?)
            // Or we just track separate state.
            setZoom(Math.round((availableWidth / (settings.pageWidth * 2)) * 100)); // assuming settings has pixels
        } else {
            // Limited by height
            const h = availableHeight;
            const w = h * spreadAspectRatio;
            setRenderSize({ width: w, height: h });
            setZoom(Math.round((h / settings.pageHeight) * 100));
        }
    }, [spreadAspectRatio, settings.pageWidth, settings.pageHeight]);

    // Initial fit
    useEffect(() => {
        fitToViewport();
        window.addEventListener('resize', fitToViewport);
        return () => window.removeEventListener('resize', fitToViewport);
    }, [fitToViewport]);

    // Zoom handling
    useEffect(() => {
        // When zoom changes manually, update renderSize
        // settings.pageWidth is "100%" (logical)
        const logicalWidth = settings.pageWidth * 2;
        const logicalHeight = settings.pageHeight;
        setRenderSize({
            width: logicalWidth * (zoom / 100),
            height: logicalHeight * (zoom / 100)
        });
    }, [zoom, settings.pageWidth, settings.pageHeight]);

    // Keyboard handling
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (selectedElementId) {
                // Determine page
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

    // Drag drop wrappers
    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setIsDragOver(true);
    }, []);

    const onDrop = useCallback((e: React.DragEvent) => {
        setIsDragOver(false);
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            handleInteractionDrop(e, rect);

            // Trigger update after drop
            // The hook's handleDrop calls onImageDrop, which updates state -> triggers render.
            // onCanvasChange should be called after render?
            // Since drop is "instant" and we want the thumbnail of the result,
            // the onImageDrop will cause a re-render of App -> Canvas -> useCanvasRender.
            // We might need an effect to capture that change?
            // For now rely on onInteractionEnd for moves, and maybe explicit call here?
            // But state update is async.

            // Let's rely on a separate specific debounced effect or the parent passing a "force capture" ref.
            // Or simpler: The user asked for "change handler".
            // We can add an effect on `pages` that calls `onCanvasChange`.
            // But `pages` changes often during drag (if we did realtime update).
            // We are doing realtime update. So that would be too frequent.
            // Debouncing is the key.
        }
    }, [handleInteractionDrop]);

    // Debounced canvas change notification
    useEffect(() => {
        const timer = setTimeout(() => {
            if (onCanvasChange && getCanvasDataUrl) {
                const dataUrl = getCanvasDataUrl();
                if (dataUrl) onCanvasChange(dataUrl);
            }
        }, 1000); // 1s debounce for final settling
        return () => clearTimeout(timer);
    }, [pages, onCanvasChange, getCanvasDataUrl]);


    // Find selected element for overlay
    const selectedElement = selectedElementId
        ? pages.flatMap(p => p.elements.map(e => ({ ...e, pageId: p.id, pageIndex: p.id === pages[0].id ? 0 : 1 }))).find(e => e.id === selectedElementId)
        : null;

    return (
        <section className="canvas-container" data-testid="canvas-container">
            <div
                ref={viewportRef}
                className="canvas-viewport"
                onKeyDown={handleKeyDown}
                tabIndex={0}
            >
                <div
                    className="canvas-wrapper"
                    style={{
                        position: 'relative',
                        width: renderSize.width,
                        height: renderSize.height,
                        margin: 'auto',
                        boxShadow: 'var(--shadow-lg)',
                    }}
                    data-testid="canvas"
                >
                    {/* Render Layer */}
                    <canvas
                        ref={canvasRef}
                        className={`canvas-layer ${isDragOver ? 'drop-active' : ''}`}
                        style={{ display: 'block' }}
                    />

                    {/* Interaction Layer */}
                    <div
                        ref={containerRef}
                        className="interaction-layer"
                        style={{
                            position: 'absolute',
                            inset: 0,
                            zIndex: 10,
                            width: '100%',
                            height: '100%',
                            cursor: isDragging || isResizing ? 'grabbing' : 'default',
                        }}
                        onMouseDown={(e) => {
                            if (containerRef.current) {
                                handleMouseDown(e, containerRef.current.getBoundingClientRect());
                            }
                        }}
                        onDragOver={onDragOver}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={onDrop}
                    >
                        {/* Selected Element Overlay */}
                        {selectedElement && (
                            <div
                                className="selection-overlay"
                                style={{
                                    position: 'absolute',
                                    left: `${(selectedElement.pageIndex === 0 ? 0 : 50) + (selectedElement.position.x / 100) * 50}%`,
                                    top: `${selectedElement.position.y}%`,
                                    width: `${(selectedElement.size.width / 100) * 50}%`,
                                    height: `${selectedElement.size.height}%`,
                                    border: '2px solid var(--color-accent)',
                                    pointerEvents: 'none', // Allow clicks to pass through to container (which handles them)
                                    // Actually, resize handles need pointer events.
                                    // So container handles selection click, but this overlay needs handles.
                                    // We need to enable pointer events on handles specifically.
                                }}
                            >
                                {/* Resize Handles */}
                                {RESIZE_HANDLES.map(handle => (
                                    <div
                                        key={handle}
                                        className={`resize-handle resize-handle-${handle}`}
                                        data-handle={handle}
                                        data-element-id={selectedElement.id}
                                        style={{ pointerEvents: 'auto' }}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Snap Lines */}
                        {activeSnapLines.map((edge, i) => (
                            <SnapIndicator key={i} edge={edge} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Controls (Zoom) - Keep existing */}
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

// ... SnapIndicator and Types ...
// Need to keep these helper components or imports
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

const RESIZE_HANDLES = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const;
