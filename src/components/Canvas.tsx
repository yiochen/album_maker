import React, { useRef, useEffect, useMemo, useState, useLayoutEffect } from 'react';
import type { PoolImage } from '../types';
import { useCanvasRender } from '../hooks/useCanvasRender';
import { useCanvasInteraction } from '../hooks/useCanvasInteraction';
import { useTextEditing } from '../hooks/useTextEditing';
import { DroppableCanvas } from './DroppableCanvas';
import { TextEditingToolbar } from './canvas/TextEditingToolbar';
import { useAlbumSpreads } from '../states/albumStore';
import { useCurrentSpreadIndex } from '../states/uiStore';
import { useDndDropContext } from '../contexts/DndDropContext';

/**
 * Props for the Canvas component.
 */
interface CanvasProps {
    /** Callback fired when an image is dropped onto the canvas. */
    onImageDrop: (spreadId: string, image: PoolImage, position: { x: number; y: number }) => void;
}

/**
 * Canvas component renders the interactive Fabric.js canvas for editing the album spread.
 * It handles rendering, interactions (selection, snapping), and drag-and-drop.
 */
export const Canvas: React.FC<CanvasProps> = ({
    onImageDrop,
}) => {
    const spreads = useAlbumSpreads();
    const currentSpreadIndex = useCurrentSpreadIndex();
    const currentSpread = useMemo(() => spreads[currentSpreadIndex], [spreads, currentSpreadIndex]);

    const { registerCanvasDropTarget } = useDndDropContext();

    const canvasElRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Initialize rendering and zoom logic
    const {
        fabricCanvas,
        canvasWidth,
        canvasHeight,
        zoom,
        setZoom,
        fitToViewport,
        snapLinesRef,
    } = useCanvasRender({
        canvasElRef,
        containerRef,
    });

    // Initialize interaction logic
    const {
        hasSelection,
    } = useCanvasInteraction({
        fabricCanvas,
        canvasWidth,
        canvasHeight,
        zoom,
        snapLinesRef,
    });

    // Text editing lifecycle — position relative to the viewport container (not zoomed)
    const {
        toolbarPosition,
        getEditingTextElement,
    } = useTextEditing({ fabricCanvas, wrapperRef: containerRef, zoom });

    // Register this canvas as a drop target for dnd-kit
    useEffect(() => {
        if (!currentSpread) return;

        registerCanvasDropTarget({
            wrapperRef,
            zoom,
            spreadId: currentSpread.id,
            onImageDrop,
        });

        return () => {
            registerCanvasDropTarget(null);
        };
    }, [registerCanvasDropTarget, wrapperRef, zoom, currentSpread?.id, onImageDrop, currentSpread]);

    // Styles for scrollable content
    const zoomedWidth = canvasWidth * (zoom / 100);
    const zoomedHeight = canvasHeight * (zoom / 100);

    const [viewportSize, setViewportSize] = useState({
        innerWidth: 0,
        innerHeight: 0,
        paddingLeft: 0,
        paddingTop: 0,
    });

    const getViewportMetrics = (viewport: HTMLDivElement) => {
        const styles = window.getComputedStyle(viewport);
        const paddingLeft = Number.parseFloat(styles.paddingLeft) || 0;
        const paddingRight = Number.parseFloat(styles.paddingRight) || 0;
        const paddingTop = Number.parseFloat(styles.paddingTop) || 0;
        const paddingBottom = Number.parseFloat(styles.paddingBottom) || 0;

        return {
            innerWidth: Math.max(0, viewport.clientWidth - paddingLeft - paddingRight),
            innerHeight: Math.max(0, viewport.clientHeight - paddingTop - paddingBottom),
            paddingLeft,
            paddingTop,
        };
    };

    // Track viewport size to calculate safe margins
    useEffect(() => {
        if (!containerRef.current) return;
        const viewport = containerRef.current;

        const updateSize = () => {
            setViewportSize(getViewportMetrics(viewport));
        };

        const resizeObserver = new ResizeObserver(updateSize);
        resizeObserver.observe(viewport);
        updateSize();

        return () => resizeObserver.disconnect();
    }, []);

    // Margins ensure the content is centered when smaller than viewport,
    // but starts at (0,0) when larger to avoid clipping overflow.
    const marginL = Math.max(0, (viewportSize.innerWidth - zoomedWidth) / 2);
    const marginT = Math.max(0, (viewportSize.innerHeight - zoomedHeight) / 2);

    // Keep current viewport position stable across zoom changes.
    // This prevents "jump to center" and preserves where the user is looking.
    const previousZoomRef = useRef(zoom);
    useLayoutEffect(() => {
        const viewport = containerRef.current;
        if (!viewport) return;

        const previousZoom = previousZoomRef.current;
        if (previousZoom === zoom) return;

        const viewportWidth = viewport.clientWidth;
        const viewportHeight = viewport.clientHeight;
        const {
            innerWidth,
            innerHeight,
            paddingLeft,
            paddingTop,
        } = getViewportMetrics(viewport);

        const previousZoomedWidth = canvasWidth * (previousZoom / 100);
        const previousZoomedHeight = canvasHeight * (previousZoom / 100);
        const previousMarginL = Math.max(0, (innerWidth - previousZoomedWidth) / 2);
        const previousMarginT = Math.max(0, (innerHeight - previousZoomedHeight) / 2);

        // Preserve the viewport's top-left point in canvas space.
        const prevContentX = Math.max(0, viewport.scrollLeft - (paddingLeft + previousMarginL));
        const prevContentY = Math.max(0, viewport.scrollTop - (paddingTop + previousMarginT));
        const ratio = zoom / previousZoom;
        const nextContentX = prevContentX * ratio;
        const nextContentY = prevContentY * ratio;

        const nextScrollLeft = nextContentX + paddingLeft + marginL;
        const nextScrollTop = nextContentY + paddingTop + marginT;

        const maxScrollLeft = Math.max(0, viewport.scrollWidth - viewportWidth);
        const maxScrollTop = Math.max(0, viewport.scrollHeight - viewportHeight);

        viewport.scrollLeft = Math.min(maxScrollLeft, Math.max(0, nextScrollLeft));
        viewport.scrollTop = Math.min(maxScrollTop, Math.max(0, nextScrollTop));

        previousZoomRef.current = zoom;
    }, [zoom, canvasWidth, canvasHeight, marginL, marginT, zoomedWidth, zoomedHeight]);

    const canvasStyle = {
        width: `${canvasWidth}px`,
        height: `${canvasHeight}px`,
        position: 'relative' as const,
        transform: `scale(${zoom / 100})`,
        transformOrigin: '0 0', // Top-left origin for standard expansion
    };

    if (!currentSpread) return null;

    return (
        <section
            className="canvas-container"
            data-testid="canvas-container"
            data-has-selection={hasSelection}
        >
            <div
                ref={containerRef}
                className="canvas-viewport"
                data-testid="canvas-viewport"
                tabIndex={0}
                style={{
                    outline: 'none',
                    overflow: 'auto',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start',
                }}
            >
                {/* Scroller content wrapper ensures the viewport has content to scroll */}
                <div
                    style={{
                        width: zoomedWidth,
                        height: zoomedHeight,
                        marginLeft: marginL,
                        marginTop: marginT,
                        position: 'relative',
                        flexShrink: 0,
                    }}
                >
                    <DroppableCanvas
                        id="canvas"
                        style={canvasStyle}
                        data-testid="interaction-layer"
                    >
                        <div ref={wrapperRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
                            <canvas ref={canvasElRef} data-testid="canvas-layer" />
                            {currentSpread.elements.length === 0 && (
                                <div
                                    className="canvas-placeholder"
                                    style={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        transform: `translate(-50%, -50%) scale(${100 / zoom})`,
                                        pointerEvents: 'none',
                                        textAlign: 'center',
                                        width: '100%',
                                    }}
                                >
                                    <span className="text-muted" style={{ opacity: 0.5 }}>
                                        Drag images here
                                    </span>
                                </div>
                            )}
                        </div>
                    </DroppableCanvas>
                </div>
            </div>

            {/* Text editing toolbar — outside zoom container to prevent scaling */}
            {toolbarPosition && (
                <TextEditingToolbar
                    position={toolbarPosition}
                    getEditingTextElement={getEditingTextElement}
                />
            )}

            <div className="canvas-controls">
                <button
                    className="btn btn-ghost btn-icon"
                    onClick={() => setZoom(z => Math.max(25, z - 25))}
                    disabled={zoom <= 25}
                    title="Zoom out"
                >
                    -
                </button>
                <span className="zoom-display">{zoom}%</span>
                <button
                    className="btn btn-ghost btn-icon"
                    onClick={() => setZoom(z => Math.min(200, z + 25))}
                    disabled={zoom >= 200}
                    title="Zoom in"
                >
                    +
                </button>
                <button className="btn btn-ghost" onClick={fitToViewport}>Fit</button>
            </div>
        </section>
    );
};
