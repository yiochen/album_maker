import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import * as fabric from 'fabric';
import type { PoolImage, TextContent } from '../types';
import { isTextElement } from '../types';
import { useCanvasRender } from '../hooks/useCanvasRender';
import { useCanvasInteraction } from '../hooks/useCanvasInteraction';
import { useTextEditing } from '../hooks/useTextEditing';
import { useTextEditingSelection } from '../hooks/useTextEditingSelection';
import { CanvasImageElement } from '../hooks/CanvasImageElement';
import { useCanvasViewportLayout } from '../hooks/useCanvasViewportLayout';
import { DroppableCanvas } from './DroppableCanvas';
import { TiptapTextEditor } from './canvas/TiptapTextEditor';
import { TextEditingToolbar } from './canvas/TextEditingToolbar';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { FitIcon } from './icons/FitIcon';
import { InsertAfterIcon } from './icons/InsertAfterIcon';
import { InsertBeforeIcon } from './icons/InsertBeforeIcon';
import { SkipBackIcon } from './icons/SkipBackIcon';
import { SkipForwardIcon } from './icons/SkipForwardIcon';
import { ZoomInIcon } from './icons/ZoomInIcon';
import { ZoomOutIcon } from './icons/ZoomOutIcon';
import { useAddSpreads, useAlbumSettings, useAlbumSpreads } from '../states/albumStore';
import {
    useCurrentSpreadIndex,
    useSelectedPageSide,
    useSetCurrentSpreadIndex,
    useSetSelectedPageSide,
    useSetSelectedPages,
} from '../states/uiStore';
import { useFabricCanvas, useTiptapEditor } from '../states/editorInfraStore';
import { useDndDropContext } from '../contexts/DndDropContext';
import { useTextEditorTransition } from '../hooks/useTextEditorTransition';

/**
 * Props for the Canvas component.
 */
interface CanvasProps {
    /** Callback fired when an image is dropped onto the canvas. */
    onImageDrop: (
        spreadId: string,
        image: PoolImage,
        position: { x: number; y: number },
        targetElementId?: string
    ) => void;
}

/**
 * Canvas component renders the interactive Fabric.js canvas for editing the album spread.
 * It handles rendering, interactions (selection, snapping), and drag-and-drop.
 */
export const Canvas: React.FC<CanvasProps> = ({
    onImageDrop,
}) => {
    const spreads = useAlbumSpreads();
    const settings = useAlbumSettings();
    const addSpreads = useAddSpreads();
    const currentSpreadIndex = useCurrentSpreadIndex();
    const selectedPageSide = useSelectedPageSide();
    const setCurrentSpreadIndex = useSetCurrentSpreadIndex();
    const setSelectedPageSide = useSetSelectedPageSide();
    const setSelectedPages = useSetSelectedPages();
    const fabricCanvas = useFabricCanvas();
    const tiptapEditor = useTiptapEditor();
    const {
        currentActiveEditorId,
        isCommitting,
        closeRequestNonce,
        handleCommitDone,
    } = useTextEditorTransition();
    const currentSpread = useMemo(() => spreads[currentSpreadIndex], [spreads, currentSpreadIndex]);
    const maxSpreads = settings ? settings.maxPages / 2 : 20;
    const canInsertSpread = spreads.length < maxSpreads;

    const { registerCanvasDropTarget } = useDndDropContext();

    const canvasElRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Initialize rendering and zoom logic
    const {
        canvasWidth,
        canvasHeight,
        zoom,
        setZoom,
        toggleFitMode,
        isFitMode,
        snapLinesRef,
    } = useCanvasRender({
        canvasElRef,
        containerRef,
        wrapperRef,
    });

    // Initialize interaction logic
    const {
        hasSelection,
    } = useCanvasInteraction({
        canvasWidth,
        canvasHeight,
        zoom,
        snapLinesRef,
    });

    // Text editing lifecycle — Tiptap-based overlay
    const {
        editingElement,
        toolbarPosition,
        handleTextAlignChange,
        handleVerticalAlignChange,
        currentTextAlign,
        currentVerticalAlign,
    } = useTextEditing({
        containerRef,
        activeEditorId: currentActiveEditorId,
        zoom,
        canvasWidth,
        canvasHeight,
    });

    // Synchronize Fabric selection with editingTextElementId in store
    useTextEditingSelection({});

    useEffect(() => {
        if (!currentSpread) return;

        const getDropTargetImageElementId = (canvasX: number, canvasY: number): string | null => {
            if (!fabricCanvas) return null;

            const point = new fabric.Point(canvasX, canvasY);
            const objects = fabricCanvas.getObjects();

            // Iterate from top-most object down to match visual hit testing.
            for (let i = objects.length - 1; i >= 0; i -= 1) {
                const obj = objects[i];
                if (!(obj instanceof CanvasImageElement)) continue;
                if (obj.containsPoint(point)) {
                    return obj.pageElement.id;
                }
            }

            return null;
        };

        registerCanvasDropTarget({
            wrapperRef,
            zoom,
            spreadId: currentSpread.id,
            getDropTargetImageElementId,
            onImageDrop,
        });

        return () => {
            registerCanvasDropTarget(null);
        };
    }, [registerCanvasDropTarget, wrapperRef, zoom, currentSpread?.id, onImageDrop, currentSpread, fabricCanvas]);

    const {
        zoomedWidth,
        zoomedHeight,
        marginLeft,
        marginTop,
    } = useCanvasViewportLayout({
        containerRef,
        canvasWidth,
        canvasHeight,
        zoom,
    });

    const canvasStyle = {
        width: `${canvasWidth}px`,
        height: `${canvasHeight}px`,
        position: 'relative' as const,
        transform: `scale(${zoom / 100})`,
        transformOrigin: '0 0', // Top-left origin for standard expansion
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15), 0 1px 6px rgba(0, 0, 0, 0.08)',
    };

    // Resolve editing element content for the overlay
    const editingContent = editingElement && isTextElement(editingElement)
        ? editingElement.content as TextContent
        : null;

    const navigateToPage = useCallback((spreadIndex: number, side: 'left' | 'right') => {
        const pageNumber = spreadIndex * 2 + (side === 'left' ? 1 : 2);
        setCurrentSpreadIndex(spreadIndex);
        setSelectedPageSide(side);
        setSelectedPages(new Set([pageNumber]));
    }, [setCurrentSpreadIndex, setSelectedPageSide, setSelectedPages]);

    const handlePrevSpread = useCallback(() => {
        if (currentSpreadIndex <= 0) return;
        navigateToPage(currentSpreadIndex - 1, selectedPageSide);
    }, [currentSpreadIndex, navigateToPage, selectedPageSide]);

    const handlePrevPage = useCallback(() => {
        if (currentSpreadIndex === 0 && selectedPageSide === 'left') return;
        if (selectedPageSide === 'right') {
            navigateToPage(currentSpreadIndex, 'left');
            return;
        }
        navigateToPage(currentSpreadIndex - 1, 'right');
    }, [currentSpreadIndex, navigateToPage, selectedPageSide]);

    const handleNextPage = useCallback(() => {
        if (currentSpreadIndex === spreads.length - 1 && selectedPageSide === 'right') return;
        if (selectedPageSide === 'left') {
            navigateToPage(currentSpreadIndex, 'right');
            return;
        }
        navigateToPage(currentSpreadIndex + 1, 'left');
    }, [currentSpreadIndex, navigateToPage, selectedPageSide, spreads.length]);

    const handleNextSpread = useCallback(() => {
        if (currentSpreadIndex >= spreads.length - 1) return;
        navigateToPage(currentSpreadIndex + 1, selectedPageSide);
    }, [currentSpreadIndex, navigateToPage, selectedPageSide, spreads.length]);

    const handleInsertSpreadBefore = useCallback(() => {
        if (!canInsertSpread) return;
        addSpreads(1, currentSpreadIndex);
        navigateToPage(currentSpreadIndex, 'left');
    }, [addSpreads, canInsertSpread, currentSpreadIndex, navigateToPage]);

    const handleInsertSpreadAfter = useCallback(() => {
        if (!canInsertSpread) return;
        const insertIndex = currentSpreadIndex + 1;
        addSpreads(1, insertIndex);
        navigateToPage(insertIndex, 'left');
    }, [addSpreads, canInsertSpread, currentSpreadIndex, navigateToPage]);

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
                    className={`canvas-page-highlight canvas-page-highlight-${selectedPageSide}`}
                    style={{
                        width: zoomedWidth,
                        height: zoomedHeight,
                        marginLeft,
                        marginTop,
                        position: 'relative',
                        flexShrink: 0,
                    }}
                >
                    <DroppableCanvas
                        id="canvas"
                        style={canvasStyle}
                        data-testid="interaction-layer"
                    >
                        <div
                            ref={wrapperRef}
                            style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}
                        >
                            <canvas ref={canvasElRef} data-testid="canvas-layer" style={{ position: 'relative', zIndex: 1 }} />
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
                            {/* Tiptap text editor overlay — inside canvas wrapper for zoom scaling */}
                            {currentActiveEditorId && (
                                <TiptapTextEditor
                                    key={currentActiveEditorId}
                                    elementId={currentActiveEditorId}
                                    canvasWidth={canvasWidth}
                                    canvasHeight={canvasHeight}
                                    textAlign={currentTextAlign}
                                    verticalAlign={currentVerticalAlign}
                                    canvasZoom={zoom}
                                    closeRequestNonce={closeRequestNonce}
                                    onRequestCloseCommitted={handleCommitDone}
                                />
                            )}
                        </div>
                    </DroppableCanvas>
                </div>
            </div>

            {/* Text editing toolbar — outside zoom container to prevent scaling */}
            {toolbarPosition && tiptapEditor && editingContent && !isCommitting && (
                <TextEditingToolbar
                    position={toolbarPosition}
                    defaultFontSizePt={editingContent.defaultStyle.fontSize}
                    onTextAlignChange={handleTextAlignChange}
                    onVerticalAlignChange={handleVerticalAlignChange}
                    textAlign={currentTextAlign}
                    verticalAlign={currentVerticalAlign}
                />
            )}

            <div className="canvas-controls">
                <div className="canvas-controls-section" aria-label="Navigation controls">
                    <button
                        className="btn btn-ghost btn-icon"
                        onClick={handlePrevSpread}
                        disabled={currentSpreadIndex <= 0}
                        title="Previous spread"
                        aria-label="Previous spread"
                        data-testid="canvas-control-prev-spread"
                    >
                        <SkipBackIcon />
                    </button>
                    <button
                        className="btn btn-ghost btn-icon"
                        onClick={handlePrevPage}
                        disabled={currentSpreadIndex === 0 && selectedPageSide === 'left'}
                        title="Previous page"
                        aria-label="Previous page"
                        data-testid="canvas-control-prev-page"
                    >
                        <ArrowLeftIcon width="18" height="18" />
                    </button>
                    <button
                        className="btn btn-ghost btn-icon"
                        onClick={handleNextPage}
                        disabled={currentSpreadIndex === spreads.length - 1 && selectedPageSide === 'right'}
                        title="Next page"
                        aria-label="Next page"
                        data-testid="canvas-control-next-page"
                    >
                        <ArrowRightIcon width="18" height="18" />
                    </button>
                    <button
                        className="btn btn-ghost btn-icon"
                        onClick={handleNextSpread}
                        disabled={currentSpreadIndex >= spreads.length - 1}
                        title="Next spread"
                        aria-label="Next spread"
                        data-testid="canvas-control-next-spread"
                    >
                        <SkipForwardIcon />
                    </button>
                </div>
                <div className="canvas-controls-divider" aria-hidden="true" />
                <div className="canvas-controls-section" aria-label="Insert spread controls">
                    <button
                        className="btn btn-ghost btn-icon"
                        onClick={handleInsertSpreadBefore}
                        disabled={!canInsertSpread}
                        title="Insert spread before"
                        aria-label="Insert spread before"
                        data-testid="canvas-control-insert-spread-before"
                    >
                        <InsertBeforeIcon />
                    </button>
                    <button
                        className="btn btn-ghost btn-icon"
                        onClick={handleInsertSpreadAfter}
                        disabled={!canInsertSpread}
                        title="Insert spread after"
                        aria-label="Insert spread after"
                        data-testid="canvas-control-insert-spread-after"
                    >
                        <InsertAfterIcon />
                    </button>
                </div>
                <div className="canvas-controls-divider" aria-hidden="true" />
                <div className="canvas-controls-section" aria-label="Zoom controls">
                    <button
                        className="btn btn-ghost btn-icon"
                        onClick={() => setZoom(z => Math.max(25, z - 25))}
                        disabled={zoom <= 25}
                        title="Zoom out"
                        aria-label="Zoom out"
                        data-testid="canvas-control-zoom-out"
                    >
                        <ZoomOutIcon />
                    </button>
                    <span className="zoom-display">{zoom}%</span>
                    <button
                        className="btn btn-ghost btn-icon"
                        onClick={() => setZoom(z => Math.min(200, z + 25))}
                        disabled={zoom >= 200}
                        title="Zoom in"
                        aria-label="Zoom in"
                        data-testid="canvas-control-zoom-in"
                    >
                        <ZoomInIcon />
                    </button>
                    <button
                        className={`btn btn-ghost btn-icon${isFitMode ? ' active' : ''}`}
                        onClick={toggleFitMode}
                        aria-pressed={isFitMode}
                        title={isFitMode ? 'Disable fit mode' : 'Enable fit mode'}
                        aria-label={isFitMode ? 'Disable fit mode' : 'Enable fit mode'}
                        data-testid="fit-zoom-button"
                    >
                        <FitIcon />
                    </button>
                </div>
            </div>
        </section>
    );
};
