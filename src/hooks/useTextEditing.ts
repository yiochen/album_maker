/**
 * useTextEditing — Hook for managing the Tiptap text editing lifecycle.
 *
 * Responsibilities:
 * - Detects double-click on text elements via Fabric canvas events
 * - Manages editing state (which element is being edited)
 * - Computes overlay position for the Tiptap editor and toolbar
 * - Provides save/cancel callbacks that persist TextContent to the store
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

    // Enter editing on double-click
    useEffect(() => {
        if (!fabricCanvas) return;

        const handleDblClick = (e: fabric.TPointerEventInfo) => {
            const target = fabricCanvas.findTarget(e.e);
            if (target instanceof CanvasTextElement) {
                const id = target.pageElement.id;
                const content = target.pageElement.content as TextContent;

                setEditingTextElementId(id);
                setCurrentTextAlign(content.textAlign);
                updateToolbarPosition(target);

                // Deselect the Fabric object so it doesn't interfere
                fabricCanvas.discardActiveObject();
                fabricCanvas.requestRenderAll();
            }
        };

        fabricCanvas.on('mouse:dblclick', handleDblClick);
        return () => {
            fabricCanvas.off('mouse:dblclick', handleDblClick);
        };
    }, [fabricCanvas, setEditingTextElementId, updateToolbarPosition]);

    // Save handler
    const handleSave = useCallback((content: TextContent) => {
        const spread = spreadsRef.current[currentSpreadIndexRef.current];
        if (spread && editingTextElementId) {
            updateElementRef.current(spread.id, editingTextElementId, { content });
        }
        setEditingTextElementId(null);
        setToolbarPosition(null);
    }, [editingTextElementId, setEditingTextElementId]);

    // Cancel handler
    const handleCancel = useCallback(() => {
        setEditingTextElementId(null);
        setToolbarPosition(null);
    }, [setEditingTextElementId]);

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

        const textObj = (fabricCanvas.getObjects() as fabric.FabricObject[])
            .find(o => o instanceof CanvasTextElement && o.pageElement.id === editingTextElementId) as CanvasTextElement | undefined;

        if (textObj) {
            updateToolbarPosition(textObj);
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
    };
};
