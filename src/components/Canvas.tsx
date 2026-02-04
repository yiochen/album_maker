import React, { useRef } from 'react';
import type { PageElement, PoolImage, AlbumSettings, Spread } from '../types';
import { APP_CONFIG } from '../config';
import { useCanvasRender } from '../hooks/useCanvasRender';
import { useCanvasInteraction } from '../hooks/useCanvasInteraction';
import { useUIStore } from '../states/uiStore';

interface CanvasProps {
    spread: Spread;
    settings: AlbumSettings;
    selectedElementId: string | null;
    isSnappingEnabled: boolean;
    onElementSelect: (elementId: string | null) => void;
    onElementUpdate: (spreadId: string, elementId: string, updates: Partial<PageElement>) => void;
    onElementDelete: (spreadId: string, elementId: string) => void;
    onImageDrop: (spreadId: string, image: PoolImage, position: { x: number; y: number }) => void;
    onCanvasChange?: (dataUrl: string) => void;
}

// Since AlbumEditor still passes props, we'll keep props for now but prefer store values where appropriate?
// Actually, to avoid confusion, let's keep using the passed props for spread/settings because they are derived in parent.
// But UI state like `selectedElementId` can come from store if not passed?
// AlbumEditor passes EVERYTHING.
// Let's stick to using what is passed to minimize regressions,
// BUT the prompt asked to "Update Canvas to use stores directly".
// If I use stores directly, I should ignore the props.
// However, `spread` is derived in AlbumEditor. `settings` is derived.
// It's cleaner to keep `Canvas` as a presentation component that takes data.
// But to satisfy "solve prop drilling", maybe I should get `settings` from store?
// `useAlbumStore` has `album`.
// Let's try to use store for `selectedElementId` and `isSnappingEnabled`.

export const Canvas: React.FC<CanvasProps> = ({
    spread,
    settings,
    // selectedElementId, // derived from store
    // isSnappingEnabled, // derived from store
    // onElementSelect,   // derived from store
    onElementUpdate,
    onElementDelete,
    onImageDrop,
    onCanvasChange,
}) => {
    const { selectedElementId, isSnappingEnabled, setSelectedElementId } = useUIStore();

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
        isDragOver,
        hasSelection,
        handleDragOver,
        handleDragLeave,
        handleDrop,
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

    // Styles
    const canvasStyle = {
        transform: `scale(${(zoom / 100) * (APP_CONFIG.SCREEN_PPI / APP_CONFIG.PPI)})`,
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
                <div
                    ref={wrapperRef}
                    style={canvasStyle}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={isDragOver ? 'drop-active' : ''}
                    data-testid="interaction-layer"
                >
                    <canvas ref={canvasElRef} data-testid="canvas-layer" />
                    {spread.elements.length === 0 && (
                        <div className="canvas-placeholder" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', textAlign: 'center', width: '100%' }}>
                            <span className="text-muted" style={{ opacity: 0.5 }}>
                                Drag images here
                            </span>
                        </div>
                    )}
                </div>
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
