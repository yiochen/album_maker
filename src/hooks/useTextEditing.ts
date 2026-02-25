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
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import { FontSize } from '../extensions/tiptapFontSize';
import { textContentToTiptapDoc } from '../utils/tiptapSerializer';

import { CanvasTextElement } from './CanvasTextElement';
import { useSetEditingTextElementId, useEditingTextElementId } from '../states/uiStore';
import { useUpdateElement, useAlbumSpreads } from '../states/albumStore';
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
    handleSave: () => void;
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
    const EDITOR_PADDING_SCREEN_PX = 8;

    const setEditingTextElementId = useSetEditingTextElementId();
    const editingTextElementId = useEditingTextElementId();
    const updateElement = useUpdateElement();
    const spreads = useAlbumSpreads();
    const currentSpreadIndex = useCurrentSpreadIndex();


    // Find the element being edited
    const editingElement = useMemo(() => {
        if (!editingTextElementId) return null;
        const spread = spreads[currentSpreadIndex];
        return spread?.elements.find(e => e.id === editingTextElementId) ?? null;
    }, [editingTextElementId, spreads, currentSpreadIndex]);

    // Initialize the singleton Editor
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: false,
                blockquote: false,
                codeBlock: false,
                code: false,
                bulletList: false,
                orderedList: false,
                listItem: false,
                horizontalRule: false,
            }),
            Underline,
            TextStyle,
            Color,
            FontFamily,
            FontSize,
        ],
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

    // Deriving current alignment directly from the editing element
    const currentTextAlign = useMemo(() => {
        if (editingElement && isTextElement(editingElement)) {
            return (editingElement.content as TextContent).textAlign;
        }
        return 'left';
    }, [editingElement]);

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

        const bound = textObj.getBoundingRect();
        const canvasEl = fabricCanvas.getElement();
        const canvasRect = canvasEl.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();

        const screenLeft = canvasRect.left + bound.left * (canvasRect.width / (fabricCanvas.width || 1));
        const screenTop = canvasRect.top + bound.top * (canvasRect.height / (fabricCanvas.height || 1));
        const screenWidth = bound.width * (canvasRect.width / (fabricCanvas.width || 1));

        setToolbarPosition({
            top: screenTop - containerRect.top - EDITOR_PADDING_SCREEN_PX,
            left: screenLeft - containerRect.left - EDITOR_PADDING_SCREEN_PX,
            width: screenWidth + EDITOR_PADDING_SCREEN_PX * 2,
        });
    }, [fabricCanvas, containerRef]);


    // Helper to restore Fabric selection back to the text element after editing
    const restoreSelection = useCallback((id: string) => {
        if (!fabricCanvas) return;

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

    // Text align change handler (persists immediately so Fabric re-renders)
    const handleTextAlignChange = useCallback((align: TextContent['textAlign']) => {
        const spread = spreads[currentSpreadIndex];
        if (spread && editingTextElementId) {
            const element = spread.elements.find(e => e.id === editingTextElementId);
            if (element) {
                const content = element.content as TextContent;
                updateElement(spread.id, editingTextElementId, {
                    content: { ...content, textAlign: align },
                });
            }
        }
    }, [editingTextElementId, spreads, currentSpreadIndex, updateElement]);

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
        editor,
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
