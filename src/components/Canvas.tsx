import React, { useRef, useEffect, useMemo } from 'react';
import type { PoolImage } from '../types';
import { useCanvasRender } from '../hooks/useCanvasRender';
import { useCanvasInteraction } from '../hooks/useCanvasInteraction';
import { DroppableCanvas } from './DroppableCanvas';
import { useAlbumSpreads } from '../states/albumStore';
import { useCurrentSpreadIndex } from '../states/uiStore';
import { useDndDropContext } from '../contexts/DndDropContext';

/**
 * Props for the Canvas component.
 */
interface CanvasProps {
    /** Callback fired when an image is dropped onto the canvas. */
    onImageDrop: (spreadId: string, image: PoolImage, position: { x: number; y: number }) => void;
    /** Optional callback fired when the canvas content changes (e.g., for thumbnail generation). */
    onCanvasChange?: (dataUrl: string) => void;
}

/**
 * Canvas component renders the interactive Fabric.js canvas for editing the album spread.
 * It handles rendering, interactions (selection, snapping), and drag-and-drop.
 */
export const Canvas: React.FC<CanvasProps> = ({
    onImageDrop,
    onCanvasChange,
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
        onCanvasChange,
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
        onCanvasChange,
    });

    // Ref to hold current state for the stable callback
    const dropStateRef = useRef({ zoom, spreadId: currentSpread?.id, onImageDrop });
    useEffect(() => {
        dropStateRef.current = { zoom, spreadId: currentSpread?.id, onImageDrop };
    }, [zoom, currentSpread?.id, onImageDrop]);

    // Register this canvas as a drop target for dnd-kit
    // We pass a stable object with a getter to avoid re-registering on every zoom change
    useEffect(() => {
        registerCanvasDropTarget({
            wrapperRef,
            getDropDetails: () => {
                const { zoom, spreadId, onImageDrop } = dropStateRef.current;
                if (!spreadId) throw new Error("Drop on invalid spread");
                return { zoom, spreadId, onImageDrop };
            }
        });

        return () => {
            registerCanvasDropTarget(null);
        };
    }, [registerCanvasDropTarget, wrapperRef]);

    // Styles
    const canvasStyle = {
        transform: `scale(${zoom / 100})`,
        transformOrigin: 'center center',
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
                style={{ outline: 'none', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            >
                <DroppableCanvas
                    id="canvas"
                    style={canvasStyle}
                    data-testid="interaction-layer"
                >
                    <div ref={wrapperRef}>
                        <canvas ref={canvasElRef} data-testid="canvas-layer" />
                        {currentSpread.elements.length === 0 && (
                            <div className="canvas-placeholder" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', textAlign: 'center', width: '100%' }}>
                                <span className="text-muted" style={{ opacity: 0.5 }}>
                                    Drag images here
                                </span>
                            </div>
                        )}
                    </div>
                </DroppableCanvas>
            </div>

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
