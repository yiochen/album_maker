import React, { useRef, useEffect } from 'react';
import type { PageElement, PoolImage, Spread } from '../types';
import { useCanvasRender } from '../hooks/useCanvasRender';
import { useCanvasInteraction } from '../hooks/useCanvasInteraction';
import { DroppableCanvas } from './DroppableCanvas';
import { useSelectedElementId, useIsSnappingEnabled, useSetSelectedElementId } from '../states/uiStore';
import { useAlbumSettings } from '../states/albumStore';
import { useDndDropContext } from '../contexts/DndDropContext';

interface CanvasProps {
    spread: Spread;
    selectedElementId: string | null;
    isSnappingEnabled: boolean;
    onElementSelect: (elementId: string | null) => void;
    onElementUpdate: (spreadId: string, elementId: string, updates: Partial<PageElement>) => void;
    onElementDelete: (spreadId: string, elementId: string) => void;
    onImageDrop: (spreadId: string, image: PoolImage, position: { x: number; y: number }) => void;
    onCanvasChange?: (dataUrl: string) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
    spread,
    onElementUpdate,
    onElementDelete,
    onImageDrop,
    onCanvasChange,
}) => {
    const selectedElementId = useSelectedElementId();
    const isSnappingEnabled = useIsSnappingEnabled();
    const setSelectedElementId = useSetSelectedElementId();
    const settings = useAlbumSettings()!;
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
        spread,
        settings,
        selectedElementId,
        onCanvasChange,
    });

    // Initialize interaction logic
    const {
        hasSelection,
    } = useCanvasInteraction({
        fabricCanvas,
        canvasWidth,
        canvasHeight,
        spread,
        selectedElementId,
        isSnappingEnabled,
        zoom,
        snapLinesRef,
        wrapperRef,
        onElementSelect: (id) => setSelectedElementId(id),
        onElementUpdate,
        onElementDelete,
        onImageDrop,
        onCanvasChange,
    });

    // Register this canvas as a drop target for dnd-kit
    useEffect(() => {
        registerCanvasDropTarget({
            wrapperRef,
            zoom,
            spreadId: spread.id,
            onImageDrop,
        });

        return () => {
            registerCanvasDropTarget(null);
        };
    }, [registerCanvasDropTarget, wrapperRef, zoom, spread.id, onImageDrop]);

    // Styles
    const canvasStyle = {
        transform: `scale(${zoom / 100})`,
        transformOrigin: 'center center',
    };

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
                        {spread.elements.length === 0 && (
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
                <button className="btn btn-ghost btn-icon" onClick={() => setZoom(z => Math.max(25, z - 25))} disabled={zoom <= 25}>-</button>
                <span className="zoom-display">{zoom}%</span>
                <button className="btn btn-ghost btn-icon" onClick={() => setZoom(z => Math.min(200, z + 25))} disabled={zoom >= 200}>+</button>
                <button className="btn btn-ghost" onClick={fitToViewport}>Fit</button>
            </div>
        </section>
    );
};
