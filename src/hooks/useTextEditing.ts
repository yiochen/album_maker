/**
 * useTextEditing — Hook for managing the Tiptap text editing lifecycle.
 *
 * Responsibilities:
 * - Detects single-click on text elements via Fabric canvas events
 * - Manages editing state (which element is being edited)
 * - Computes overlay position for the Tiptap editor and toolbar
 * - Provides save/cancel callbacks that persist TextContent to the store
 * - Exposes registerSave so Canvas can wire up external save triggers
 */
import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import * as fabric from 'fabric';
import { CanvasTextElement } from './CanvasTextElement';
import { useSetEditingTextElementId, useEditingTextElementId } from '../states/uiStore';
import { useUpdateElement } from '../states/albumStore';
import { useCurrentSpreadIndex } from '../states/uiStore';
import { useAlbumSpreads } from '../states/albumStore';
import type { TextContent, PageElement } from '../types';

/** Position rectangle for the floating toolbar, in viewport-relative pixels. */
export interface TextToolbarPosition {
    top: number;
    left: number;
    width: number;
}

/** State exposed by this hook for the Canvas component to render the Tiptap overlay. */
export interface TextEditingState {
    /** Currently editing element ID (null if not editing). */
    editingTextElementId: string | null;
    /** The PageElement being edited (null if not editing). */
    editingElement: PageElement | null;
    /** Toolbar position in container-relative pixels. */
    toolbarPosition: TextToolbarPosition | null;
    /** Canvas width in px (for overlay positioning). */
    canvasWidth: number;
    /** Canvas height in px (for overlay positioning). */
    canvasHeight: number;
    /** Save edited content and exit editing. */
    handleSave: (content: TextContent) => void;
    /** Cancel editing without saving. */
    handleCancel: () => void;
    /** Update text alignment during editing (persists immediately). */
    handleTextAlignChange: (align: TextContent['textAlign']) => void;
    /** Current text alignment of the editing element. */
    currentTextAlign: TextContent['textAlign'];
    /**
     * Register an external save function.
     * Canvas wires this up so that clicking blank space or another element
     * triggers the Tiptap editor's own save path (which has access to content/DOM).
     */
    registerSave: (fn: (() => void) | null) => void;
}

interface UseTextEditingProps {
    fabricCanvas: fabric.Canvas | null;
    /** Ref to the canvas container element (used for toolbar coordinate conversion). */
    containerRef: React.RefObject<HTMLDivElement | null>;
    /** Current zoom level for toolbar repositioning. */
    zoom: number;
    /** Canvas width in px. */
    canvasWidth: number;
    /** Canvas height in px. */
    canvasHeight: number;
}

export const useTextEditing = ({
    fabricCanvas,
    containerRef,
    zoom,
    canvasWidth,
    canvasHeight,
}: UseTextEditingProps): TextEditingState => {
    const setEditingTextElementId = useSetEditingTextElementId();
    const editingTextElementId = useEditingTextElementId();
    const updateElement = useUpdateElement();
    const spreads = useAlbumSpreads();
    const currentSpreadIndex = useCurrentSpreadIndex();

    // Stable refs
    const updateElementRef = useRef(updateElement);
    const spreadsRef = useRef(spreads);
    const currentSpreadIndexRef = useRef(currentSpreadIndex);

    useEffect(() => {
        updateElementRef.current = updateElement;
        spreadsRef.current = spreads;
        currentSpreadIndexRef.current = currentSpreadIndex;
    }, [updateElement, spreads, currentSpreadIndex]);

    // Ref that always holds the current editingTextElementId for use inside event handlers
    const editingTextElementIdRef = useRef(editingTextElementId);
    useEffect(() => {
        editingTextElementIdRef.current = editingTextElementId;
    }, [editingTextElementId]);

    // Ref for the external save function registered by Canvas/TiptapTextEditor
    const externalSaveRef = useRef<(() => void) | null>(null);

    /** Register (or clear) the external save callback. */
    const registerSave = useCallback((fn: (() => void) | null) => {
        externalSaveRef.current = fn;
    }, []);

    // Toolbar position state
    const [toolbarPosition, setToolbarPosition] = useState<TextToolbarPosition | null>(null);
    // Text align state (live during editing, synced to store)
    const [currentTextAlign, setCurrentTextAlign] = useState<TextContent['textAlign']>('left');

    // Find the element being edited
    const editingElement = useMemo(() => {
        if (!editingTextElementId) return null;
        const spread = spreads[currentSpreadIndex];
        return spread?.elements.find(e => e.id === editingTextElementId) ?? null;
    }, [editingTextElementId, spreads, currentSpreadIndex]);

    // Compute toolbar position from the Fabric canvas object
    const updateToolbarPosition = useCallback((textObj: CanvasTextElement) => {
        if (!fabricCanvas || !containerRef.current) return;

        const bound = textObj.getBoundingRect();
        const canvasEl = fabricCanvas.getElement();
        const canvasRect = canvasEl.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();

        const screenLeft = canvasRect.left + bound.left * (canvasRect.width / (fabricCanvas.width || 1));
        const screenTop = canvasRect.top + bound.top * (canvasRect.height / (fabricCanvas.height || 1));
        const screenWidth = bound.width * (canvasRect.width / (fabricCanvas.width || 1));

        setToolbarPosition({
            top: screenTop - containerRect.top,
            left: screenLeft - containerRect.left,
            width: screenWidth,
        });
    }, [fabricCanvas, containerRef]);

    // Enter editing on single-click (clean click without dragging)
    useEffect(() => {
        if (!fabricCanvas) return;

        let pointerDownPos: { x: number, y: number } | null = null;
        let isEditingTarget: fabric.Object | null = null;

        const handleMouseDown = (e: fabric.TPointerEventInfo) => {
            if (e.target instanceof CanvasTextElement) {
                isEditingTarget = e.target;
                const pointer = fabricCanvas.getViewportPoint(e.e);
                pointerDownPos = { x: pointer.x, y: pointer.y };
            } else {
                pointerDownPos = null;
                isEditingTarget = null;
            }
        };

        const handleMouseUp = (e: fabric.TPointerEventInfo) => {
            if (isEditingTarget && pointerDownPos && e.target === isEditingTarget) {
                const pointer = fabricCanvas.getViewportPoint(e.e);
                const dx = pointer.x - pointerDownPos.x;
                const dy = pointer.y - pointerDownPos.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // If distance is very small, treat it as a click
                if (distance < 5) {
                    const id = (isEditingTarget as CanvasTextElement).pageElement.id;
                    const content = (isEditingTarget as CanvasTextElement).pageElement.content as TextContent;

                    // If already editing a different element, save the current one first
                    if (editingTextElementIdRef.current && editingTextElementIdRef.current !== id) {
                        externalSaveRef.current?.();
                    }

                    setEditingTextElementId(id);
                    setCurrentTextAlign(content.textAlign);
                    updateToolbarPosition(isEditingTarget as CanvasTextElement);

                    // Deselect the Fabric object so it doesn't interfere
                    fabricCanvas.discardActiveObject();
                    fabricCanvas.requestRenderAll();
                }
            } else if (editingTextElementIdRef.current) {
                // Clicked blank canvas space or a non-text element — trigger save
                externalSaveRef.current?.();
            }
            pointerDownPos = null;
            isEditingTarget = null;
        };

        fabricCanvas.on('mouse:down', handleMouseDown);
        fabricCanvas.on('mouse:up', handleMouseUp);

        return () => {
            fabricCanvas.off('mouse:down', handleMouseDown);
            fabricCanvas.off('mouse:up', handleMouseUp);
        };
    }, [fabricCanvas, setEditingTextElementId, updateToolbarPosition]);

    // Helper to restore Fabric selection back to the text element after editing
    const restoreSelection = useCallback((id: string) => {
        if (!fabricCanvas) return;

        // Small delay to ensure any concurrent Fabric selection events (from clicking another object)
        // have already processed.
        setTimeout(() => {
            if (!fabricCanvas.getActiveObject()) {
                const textObj = (fabricCanvas.getObjects() as fabric.FabricObject[])
                    .find(o => o instanceof CanvasTextElement && o.pageElement.id === id);

                if (textObj) {
                    fabricCanvas.setActiveObject(textObj);
                    fabricCanvas.requestRenderAll();
                }
            }
        }, 50);
    }, [fabricCanvas]);

    // Save handler — called by TiptapTextEditor with the final TextContent
    const handleSave = useCallback((newContent: TextContent, newWidthPx?: number, newHeightPx?: number) => {
        const spread = spreadsRef.current[currentSpreadIndexRef.current];
        if (spread && editingTextElementId) {
            const element = spread.elements.find(e => e.id === editingTextElementId);
            if (element) {
                const updates: Partial<PageElement> = { content: newContent };

                // Update the box with both width and height if provided
                if (canvasWidth > 0 && canvasHeight > 0) {
                    const newBox = { ...element.box };
                    let changed = false;

                    if (newWidthPx !== undefined && newWidthPx > 0) {
                        newBox.x2 = element.box.x1 + newWidthPx / canvasWidth;
                        changed = true;
                    }

                    if (newHeightPx !== undefined && newHeightPx > 0) {
                        newBox.y2 = element.box.y1 + newHeightPx / canvasHeight;
                        changed = true;
                    }

                    if (changed) {
                        updates.box = newBox;
                    }
                }

                updateElementRef.current(spread.id, editingTextElementId, updates);
            }
        }

        // Capture ID for restoration before clearing
        const idToRestore = editingTextElementId;
        setEditingTextElementId(null);
        setToolbarPosition(null);
        externalSaveRef.current = null;

        if (idToRestore) {
            restoreSelection(idToRestore);
        }
    }, [editingTextElementId, setEditingTextElementId, canvasWidth, canvasHeight, restoreSelection]);

    // Cancel handler
    const handleCancel = useCallback(() => {
        const idToRestore = editingTextElementId;
        setEditingTextElementId(null);
        setToolbarPosition(null);
        externalSaveRef.current = null;

        if (idToRestore) {
            restoreSelection(idToRestore);
        }
    }, [editingTextElementId, setEditingTextElementId, restoreSelection]);

    // Text align change handler (persists immediately so Fabric re-renders)
    const handleTextAlignChange = useCallback((align: TextContent['textAlign']) => {
        setCurrentTextAlign(align);

        const spread = spreadsRef.current[currentSpreadIndexRef.current];
        if (spread && editingTextElementId) {
            const element = spread.elements.find(e => e.id === editingTextElementId);
            if (element) {
                const content = element.content as TextContent;
                updateElementRef.current(spread.id, editingTextElementId, {
                    content: { ...content, textAlign: align },
                });
            }
        }
    }, [editingTextElementId]);

    // Reposition toolbar on zoom or scroll changes
    useEffect(() => {
        if (!editingTextElementId || !fabricCanvas) return;

        const findAndPosition = () => {
            const textObj = (fabricCanvas.getObjects() as fabric.FabricObject[])
                .find(o => o instanceof CanvasTextElement && o.pageElement.id === editingTextElementId) as CanvasTextElement | undefined;

            if (textObj) {
                updateToolbarPosition(textObj);
            }
            return !!textObj;
        };

        if (!findAndPosition()) {
            // If not found (e.g. just added), try again in next tick
            const timeout = setTimeout(findAndPosition, 50);
            return () => clearTimeout(timeout);
        }
    }, [zoom, editingTextElementId, fabricCanvas, updateToolbarPosition]);

    // Scroll-based toolbar repositioning
    useEffect(() => {
        const container = containerRef.current;
        if (!container || !editingTextElementId) return;

        const handleScroll = () => {
            if (!fabricCanvas) return;
            const textObj = (fabricCanvas.getObjects() as fabric.FabricObject[])
                .find(o => o instanceof CanvasTextElement && o.pageElement.id === editingTextElementId) as CanvasTextElement | undefined;
            if (textObj) {
                updateToolbarPosition(textObj);
            }
        };

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [containerRef, editingTextElementId, fabricCanvas, updateToolbarPosition]);

    return {
        editingTextElementId,
        editingElement,
        toolbarPosition,
        canvasWidth,
        canvasHeight,
        handleSave,
        handleCancel,
        handleTextAlignChange,
        currentTextAlign,
        registerSave,
    };
};
