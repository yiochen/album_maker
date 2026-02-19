/**
 * useTextEditing — Hook for managing text element inline-editing lifecycle.
 *
 * Responsibilities:
 * - Listens to Fabric.js `text:editing:entered` and `text:editing:exited` events
 * - Syncs editing state to uiStore (editingTextElementId)
 * - On exit, persists the edited text/styles back to React state via syncToRuns()
 * - Tracks the absolute position (px) of the active text box for toolbar placement
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import * as fabric from 'fabric';
import { CanvasTextElement } from './CanvasTextElement';
import { useSetEditingTextElementId, useEditingTextElementId } from '../states/uiStore';
import { useUpdateElement } from '../states/albumStore';
import { useCurrentSpreadIndex, useSelectedPageId } from '../states/uiStore';
import { useAlbumSpreads } from '../states/albumStore';

/**
 * Position rectangle for the floating toolbar, in viewport-relative pixels.
 */
export interface TextToolbarPosition {
    top: number;
    left: number;
    width: number;
}

interface UseTextEditingProps {
    fabricCanvas: fabric.Canvas | null;
    /** Ref to the canvas wrapper element (used for coordinate conversion). */
    wrapperRef: React.RefObject<HTMLDivElement | null>;
}

export const useTextEditing = ({ fabricCanvas, wrapperRef }: UseTextEditingProps) => {
    const setEditingTextElementId = useSetEditingTextElementId();
    const editingTextElementId = useEditingTextElementId();
    const updateElement = useUpdateElement();
    const selectedPageId = useSelectedPageId();
    const spreads = useAlbumSpreads();
    const currentSpreadIndex = useCurrentSpreadIndex();

    // Stable refs for use in event handlers
    const updateElementRef = useRef(updateElement);
    const selectedPageIdRef = useRef(selectedPageId);
    const spreadsRef = useRef(spreads);
    const currentSpreadIndexRef = useRef(currentSpreadIndex);

    useEffect(() => {
        updateElementRef.current = updateElement;
        selectedPageIdRef.current = selectedPageId;
        spreadsRef.current = spreads;
        currentSpreadIndexRef.current = currentSpreadIndex;
    }, [updateElement, selectedPageId, spreads, currentSpreadIndex]);

    // Toolbar position state (viewport-relative)
    const [toolbarPosition, setToolbarPosition] = useState<TextToolbarPosition | null>(null);

    /**
     * Compute the toolbar position above the text element.
     */
    const updateToolbarPosition = useCallback((textElement: CanvasTextElement) => {
        if (!fabricCanvas || !wrapperRef.current) return;

        // Get the bounding rect of the text element on the canvas (in viewport coords)
        const bound = textElement.getBoundingRect();
        const wrapperRect = wrapperRef.current.getBoundingClientRect();

        // Canvas element's position on screen
        const canvasEl = fabricCanvas.getElement();
        const canvasRect = canvasEl.getBoundingClientRect();

        // Convert Fabric canvas coordinates to screen coordinates
        const screenLeft = canvasRect.left + bound.left * (canvasRect.width / (fabricCanvas.width || 1));
        const screenTop = canvasRect.top + bound.top * (canvasRect.height / (fabricCanvas.height || 1));
        const screenWidth = bound.width * (canvasRect.width / (fabricCanvas.width || 1));

        // Convert to wrapper-relative coordinates
        setToolbarPosition({
            top: screenTop - wrapperRect.top,
            left: screenLeft - wrapperRect.left,
            width: screenWidth,
        });
    }, [fabricCanvas, wrapperRef]);

    /**
     * Listen for Fabric text editing enter/exit events.
     */
    useEffect(() => {
        if (!fabricCanvas) return;

        const handleEditingEntered = (e: { target: fabric.FabricObject }) => {
            const target = e.target;
            if (target instanceof CanvasTextElement) {
                const id = target.pageElement.id;
                setEditingTextElementId(id);
                updateToolbarPosition(target);
            }
        };

        const handleEditingExited = (e: { target: fabric.FabricObject }) => {
            const target = e.target;
            if (target instanceof CanvasTextElement) {
                // Persist edited text back to React state
                const spreadId = spreadsRef.current[currentSpreadIndexRef.current]?.id;
                if (spreadId) {
                    const updatedContent = target.syncToRuns();
                    updateElementRef.current(spreadId, target.pageElement.id, {
                        content: updatedContent,
                    });
                }
                setEditingTextElementId(null);
                setToolbarPosition(null);
            }
        };

        // Update toolbar position on object moving/scaling during editing
        const handleObjectMoving = (e: { target: fabric.FabricObject }) => {
            const target = e.target;
            if (target instanceof CanvasTextElement && editingTextElementId) {
                updateToolbarPosition(target);
            }
        };

        fabricCanvas.on('text:editing:entered', handleEditingEntered);
        fabricCanvas.on('text:editing:exited', handleEditingExited);
        fabricCanvas.on('object:moving', handleObjectMoving);
        fabricCanvas.on('object:scaling', handleObjectMoving);

        return () => {
            fabricCanvas.off('text:editing:entered', handleEditingEntered);
            fabricCanvas.off('text:editing:exited', handleEditingExited);
            fabricCanvas.off('object:moving', handleObjectMoving);
            fabricCanvas.off('object:scaling', handleObjectMoving);
        };
    }, [fabricCanvas, editingTextElementId, setEditingTextElementId, updateToolbarPosition]);

    /**
     * Get the currently-editing CanvasTextElement instance.
     */
    const getEditingTextElement = useCallback((): CanvasTextElement | null => {
        if (!fabricCanvas || !editingTextElementId) return null;
        const activeObj = fabricCanvas.getActiveObject();
        if (activeObj instanceof CanvasTextElement && activeObj.pageElement.id === editingTextElementId) {
            return activeObj;
        }
        return null;
    }, [fabricCanvas, editingTextElementId]);

    return {
        editingTextElementId,
        toolbarPosition,
        getEditingTextElement,
    };
};
