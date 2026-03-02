/**
 * useTextEditing — Hook for managing the Tiptap text editing lifecycle.
 *
 * Responsibilities:
 * - Owns the Tiptap Editor singleton instance
 * - Computes overlay position for the Tiptap editor and toolbar
 * - Provides live alignment syncing for the toolbar
 * - Manages toolbar positioning relative to the canvas
 * - Synchronizes editor content with the selected element
 */
import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import * as fabric from 'fabric';
import { useEditor } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import { textContentToTiptapDoc } from '../utils/tiptapSerializer';
import { createTextEditorExtensions } from '../services/textEditorExtensions';

import { CanvasTextElement } from './CanvasTextElement';
import { findCanvasTextObjectByElementId, getTextToolbarPosition } from './canvasTextObject';
import { useTextEditingAlignmentState } from './useTextEditingAlignmentState';
import { useSetEditingTextElementId, useEditingTextElementId } from '../states/uiStore';
import { useAlbumSpreads } from '../states/albumStore';
import { useCurrentSpreadIndex } from '../states/uiStore';
import { isTextElement } from '../types';
import type { TextContent, PageElement } from '../types';

/** Position rectangle for the floating toolbar, in viewport-relative pixels. */
export interface TextToolbarPosition {
    top: number;
    left: number;
    width: number;
}

/** State exposed by this hook for the Canvas component to render the Tiptap overlay. */
export interface TextEditingState {
    /** The singleton Tiptap editor instance. */
    editor: Editor | null;
    /** The PageElement being edited (null if not editing). */
    editingElement: PageElement | null;
    /** Toolbar position in container-relative pixels. */
    toolbarPosition: TextToolbarPosition | null;
    /** Canvas width in px (for overlay positioning). */
    canvasWidth: number;
    /** Canvas height in px (for overlay positioning). */
    canvasHeight: number;
    /** Save edited content and exit editing. */
    handleSave: () => void;
    /** Cancel editing without saving. */
    handleCancel: () => void;
    /** Update text alignment during editing (persists immediately). */
    handleTextAlignChange: (align: TextContent['textAlign']) => void;
    /** Update text vertical alignment during editing (persists immediately). */
    handleVerticalAlignChange: (align: NonNullable<TextContent['placeholderVerticalAlign']>) => void;
    /** Current text alignment of the editing element. */
    currentTextAlign: TextContent['textAlign'];
    /** Current text vertical alignment of the editing element. */
    currentVerticalAlign: NonNullable<TextContent['placeholderVerticalAlign']>;
}

interface UseTextEditingProps {
    fabricCanvas: fabric.Canvas | null;
    /** Ref to the canvas container element (used for toolbar coordinate conversion). */
    containerRef: React.RefObject<HTMLDivElement | null>;
    /** Active editor ID controlled by transition manager. */
    activeEditorId?: string | null;
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
    activeEditorId,
    zoom,
    canvasWidth,
    canvasHeight,
}: UseTextEditingProps): TextEditingState => {
    const setEditingTextElementId = useSetEditingTextElementId();
    const requestedEditingTextElementId = useEditingTextElementId();
    const editingTextElementId = activeEditorId ?? requestedEditingTextElementId;
    const spreads = useAlbumSpreads();
    const currentSpreadIndex = useCurrentSpreadIndex();
    const editorExtensions = useMemo(() => createTextEditorExtensions(), []);


    // Find the element being edited
    const editingElement = useMemo(() => {
        if (!editingTextElementId) return null;
        const spread = spreads[currentSpreadIndex];
        return spread?.elements.find(e => e.id === editingTextElementId) ?? null;
    }, [editingTextElementId, spreads, currentSpreadIndex]);

    // Initialize the singleton Editor
    const editor = useEditor({
        extensions: editorExtensions,
    });

    // Content sync effect: When the selected element changes, update the editor content.
    // This is done here in the hook so it only happens once when the ID switches.
    const lastLoadedIdRef = useRef<string | null>(null);
    useEffect(() => {
        if (editor && editingTextElementId && editingElement && isTextElement(editingElement)) {
            if (lastLoadedIdRef.current !== editingTextElementId) {
                const doc = textContentToTiptapDoc(editingElement.content as TextContent);
                editor.commands.setContent(doc, { emitUpdate: false }); // Do not emit update immediately
                editor.commands.focus('end');
                lastLoadedIdRef.current = editingTextElementId;
            }
        } else if (!editingTextElementId) {
            lastLoadedIdRef.current = null;
        }
    }, [editor, editingTextElementId, editingElement]);

    // Toolbar position state
    const [toolbarPosition, setToolbarPosition] = useState<TextToolbarPosition | null>(null);

    // Keep alignments local during an editing session; persist once on final commit.
    const {
        textAlign: currentTextAlign,
        verticalAlign: currentVerticalAlign,
        setTextAlign: setCurrentTextAlign,
        setVerticalAlign: setCurrentVerticalAlign,
    } = useTextEditingAlignmentState(editingElement);

    // Clear toolbar position when text editing exits.
    useEffect(() => {
        if (!editingTextElementId) {
            const frameId = requestAnimationFrame(() => {
                setToolbarPosition(null);
            });
            return () => cancelAnimationFrame(frameId);
        }
    }, [editingTextElementId]);

    // Compute toolbar position from the Fabric canvas object
    const updateToolbarPosition = useCallback((textObj: CanvasTextElement) => {
        if (!fabricCanvas || !containerRef.current) return;
        setToolbarPosition(getTextToolbarPosition(textObj, fabricCanvas, containerRef.current));
    }, [fabricCanvas, containerRef]);


    // Helper to restore Fabric selection back to the text element after editing
    const restoreSelection = useCallback((id: string) => {
        if (!fabricCanvas) return;

        setTimeout(() => {
            if (!fabricCanvas.getActiveObject()) {
                const textObj = findCanvasTextObjectByElementId(fabricCanvas, id);

                if (textObj) {
                    fabricCanvas.setActiveObject(textObj);
                    fabricCanvas.requestRenderAll();
                }
            }
        }, 50);
    }, [fabricCanvas]);

    const handleSave = useCallback(() => {
        const idToRestore = editingTextElementId;
        setEditingTextElementId(null);
        if (idToRestore) restoreSelection(idToRestore);
    }, [editingTextElementId, setEditingTextElementId, restoreSelection]);

    const handleCancel = useCallback(() => {
        const idToRestore = editingTextElementId;
        setEditingTextElementId(null);
        if (idToRestore) restoreSelection(idToRestore);
    }, [editingTextElementId, setEditingTextElementId, restoreSelection]);

    // Text align change handler (local editor-session state).
    const handleTextAlignChange = useCallback((align: TextContent['textAlign']) => {
        setCurrentTextAlign(align);
    }, [setCurrentTextAlign]);

    const handleVerticalAlignChange = useCallback((align: NonNullable<TextContent['placeholderVerticalAlign']>) => {
        setCurrentVerticalAlign(align);
    }, [setCurrentVerticalAlign]);

    // Reposition toolbar on zoom or scroll changes
    useEffect(() => {
        if (!editingTextElementId || !fabricCanvas) return;

        const findAndPosition = () => {
            const textObj = findCanvasTextObjectByElementId(fabricCanvas, editingTextElementId);

            if (textObj) {
                updateToolbarPosition(textObj);
            }
            return !!textObj;
        };

        if (!findAndPosition()) {
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
            const textObj = findCanvasTextObjectByElementId(fabricCanvas, editingTextElementId);
            if (textObj) {
                updateToolbarPosition(textObj);
            }
        };

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [containerRef, editingTextElementId, fabricCanvas, updateToolbarPosition]);

    return {
        editor,
        editingElement,
        toolbarPosition,
        canvasWidth,
        canvasHeight,
        handleSave,
        handleCancel,
        handleTextAlignChange,
        currentTextAlign,
        handleVerticalAlignChange,
        currentVerticalAlign,
    };
};
