/**
 * TiptapTextEditor — Overlay rich text editor that replaces Fabric's inline editing.
 *
 * Rendered as an absolute-positioned div within the canvas wrapper,
 * positioned directly over the text element. The canvas CSS zoom transform handles
 * scaling automatically.
 *
 * ## Lifecycle
 * 1. Element is selected in Fabric → Store updates editingTextElementId
 * 2. Canvas renders TiptapTextEditor with elementId as key
 * 3. User edits with rich text capabilities
 * 4. User clicks away → Fabric selection cleared → Store editingTextElementId becomes null
 * 5. TiptapTextEditor unmounts → runs cleanup code to persist final content to store
 */
import React, { useEffect, useCallback, useMemo, useRef, useLayoutEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { extractLayoutFromDOM } from '../../utils/domLayoutExtractor';
import { useAlbumSpreads, useUpdateElement } from '../../states/albumStore';
import { useCurrentSpreadIndex } from '../../states/uiStore';
import { isTextElement } from '../../types';
import type { TextContent, PageElement } from '../../types';

/** Props for the overlay position and styling. */
interface TiptapTextEditorProps {
    /** The singleton Tiptap editor instance. */
    editor: Editor | null;
    /** The ID of the element being edited. */
    elementId: string;
    /** Canvas width in px (at canvas PPI). */
    canvasWidth: number;
    /** Canvas height in px (at canvas PPI). */
    canvasHeight: number;
    /** Current text alignment (controlled externally so toolbar can update it). */
    textAlign: TextContent['textAlign'];
    /** Current canvas zoom percentage to scale layout values properly */
    canvasZoom: number;
}

export const TiptapTextEditor: React.FC<TiptapTextEditorProps> = ({
    editor,
    elementId,
    canvasWidth,
    canvasHeight,
    textAlign,
    canvasZoom,
}) => {
    const spreads = useAlbumSpreads();
    const currentSpreadIndex = useCurrentSpreadIndex();
    const updateElement = useUpdateElement();
    const editorHostRef = useRef<HTMLDivElement | null>(null);

    // Find the element being edited
    const element = useMemo(() => {
        const spread = spreads[currentSpreadIndex];
        return spread?.elements.find(e => e.id === elementId) ?? null;
    }, [elementId, spreads, currentSpreadIndex]);

    // Keep refs for unmount logic
    const updateElementRef = useRef(updateElement);
    const elementRef = useRef(element);
    const textAlignRef = useRef(textAlign);
    const canvasWidthRef = useRef(canvasWidth);
    const canvasHeightRef = useRef(canvasHeight);
    const canvasZoomRef = useRef(canvasZoom);
    const spreadIdRef = useRef(spreads[currentSpreadIndex]?.id);

    useEffect(() => {
        updateElementRef.current = updateElement;
        elementRef.current = element;
        textAlignRef.current = textAlign;
        canvasWidthRef.current = canvasWidth;
        canvasHeightRef.current = canvasHeight;
        canvasZoomRef.current = canvasZoom;
        spreadIdRef.current = spreads[currentSpreadIndex]?.id;
    }, [updateElement, element, textAlign, canvasWidth, canvasHeight, canvasZoom, spreads, currentSpreadIndex]);

    // FINAL SAVE ON UNMOUNT
    // We utilize an empty dependency array to ensure the cleanup runs exactly once
    // when this component instance (keyed by elementId) unmounts.
    useEffect(() => {
        return () => {
            if (!editor) return;

            const doc = editor.getJSON();
            const editorEl = editor.view.dom as HTMLElement;
            const containerEl = editorEl.closest('.tiptap-text-editor-overlay') as HTMLElement;
            const finalWidthPx = containerEl?.offsetWidth;
            const finalHeightPx = containerEl?.offsetHeight;

            const currentElement = elementRef.current;
            if (!currentElement || !isTextElement(currentElement)) return;

            // Extract layout using the refs to have the most "stable" values at unmount time
            const runs = extractLayoutFromDOM(
                editorEl,
                doc,
                (currentElement.content as TextContent).defaultStyle as Required<import('../../types').TextStyle>,
                canvasWidthRef.current,
                canvasZoomRef.current
            );

            const spreadId = spreadIdRef.current;
            if (spreadId && elementId) {
                const updates: Partial<PageElement> = {
                    content: {
                        ...(currentElement.content as TextContent),
                        runs,
                        textAlign: textAlignRef.current,
                    }
                };

                // Update box if dimensions changed during editing
                if (canvasWidthRef.current > 0 && canvasHeightRef.current > 0) {
                    const newBox = { ...currentElement.box };
                    let changed = false;

                    if (finalWidthPx !== undefined && finalWidthPx > 0) {
                        newBox.x2 = currentElement.box.x1 + finalWidthPx / canvasWidthRef.current;
                        changed = true;
                    }

                    if (finalHeightPx !== undefined && finalHeightPx > 0) {
                        newBox.y2 = currentElement.box.y1 + finalHeightPx / canvasHeightRef.current;
                        changed = true;
                    }

                    if (changed) {
                        updates.box = newBox;
                    }
                }

                updateElementRef.current(spreadId, elementId, updates);
            }
        };
    }, [editor, elementId]);

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        const startX = e.clientX;
        const currentElement = elementRef.current;
        if (!currentElement) return;

        const startWidth = (currentElement.box.x2 - currentElement.box.x1) * canvasWidth;
        const overlay = e.currentTarget.closest('.tiptap-text-editor-overlay') as HTMLElement;
        if (!overlay) return;

        const handlePointerMove = (moveEvent: PointerEvent) => {
            const dx = moveEvent.clientX - startX;
            const dxCanvas = dx / (canvasZoom / 100);
            const newWidth = Math.max(50, startWidth + dxCanvas);
            overlay.style.width = `${newWidth}px`;
        };

        const handlePointerUp = () => {
            document.removeEventListener('pointermove', handlePointerMove);
            document.removeEventListener('pointerup', handlePointerUp);
        };

        document.addEventListener('pointermove', handlePointerMove);
        document.addEventListener('pointerup', handlePointerUp);

        e.preventDefault();
        e.stopPropagation();
    }, [canvasWidth, canvasZoom]);

    const content = element && isTextElement(element)
        ? element.content as TextContent
        : null;
    const [overlayHeight, setOverlayHeight] = useState<number | null>(null);
    const minimumEditorHeight = useMemo(() => {
        if (!content) return 0;
        const fontSizePt = content.defaultStyle.fontSize || 24;
        const lineHeight = content.lineHeight || 1.2;
        return Math.ceil((fontSizePt * lineHeight * 96) / 72);
    }, [content]);

    useLayoutEffect(() => {
        if (!editor || !content) return;

        const editorEl = editor.view.dom as HTMLElement;
        const syncHeight = () => {
            const measured = Math.ceil(editorEl.scrollHeight || 0);
            const nextHeight = Math.max(minimumEditorHeight, measured);
            setOverlayHeight(nextHeight > 0 ? nextHeight : null);
        };

        syncHeight();
        const observer = new ResizeObserver(syncHeight);
        observer.observe(editorEl);
        if (editorHostRef.current) {
            observer.observe(editorHostRef.current);
        }

        return () => observer.disconnect();
    }, [editor, content, minimumEditorHeight]);
    const editorContainerStyle = useMemo(() => {
        if (!content) return undefined;
        return {
            textAlign,
            fontFamily: content.defaultStyle.fontFamily,
            fontSize: `${content.defaultStyle.fontSize}pt`,
            fontWeight: content.defaultStyle.fontWeight,
            fontStyle: content.defaultStyle.fontStyle,
            color: content.defaultStyle.fill,
            lineHeight: String(content.lineHeight),
            margin: 0,
        };
    }, [content, textAlign]);

    if (!element || !isTextElement(element)) return null;
    if (!editor) return null;

    const { box } = element;
    const left = box.x1 * canvasWidth;
    const top = box.y1 * canvasHeight;
    const width = (box.x2 - box.x1) * canvasWidth;
    const height = (box.y2 - box.y1) * canvasHeight;

    const zoomScale = 100 / canvasZoom;
    const borderWidth = 2 * zoomScale;
    const handleWidth = 4 * zoomScale;
    const handleTouchArea = 24 * zoomScale;

    // The singleton editor's DOM node (editor.view.dom) is moved into this local 
    // container whenever a text element enters edit mode.
    return (
        <div
            className="tiptap-text-editor-overlay"
            data-testid="tiptap-text-editor"
            style={{
                position: 'absolute',
                left,
                top,
                width,
                height: overlayHeight ?? height,
                zIndex: 100,
                boxSizing: 'border-box',
                background: 'rgba(255, 255, 255, 0.98)',
                border: `${borderWidth}px solid var(--color-accent, #4A90D9)`,
                borderRadius: `${2 * zoomScale}px`,
                overflow: 'visible',
                paddingRight: handleWidth + 2 * zoomScale,
                transition: 'border-color 0.2s',
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
        >
            <div
                style={editorContainerStyle}
                ref={(node) => {
                    editorHostRef.current = node;
                    if (node && editor && editor.view.dom.parentNode !== node) {
                        node.appendChild(editor.view.dom);
                    }
                }}
            />

            <div
                className="resize-handle"
                onPointerDown={handlePointerDown}
                style={{
                    position: 'absolute',
                    right: 0,
                    bottom: 0,
                    width: handleTouchArea,
                    height: handleTouchArea,
                    cursor: 'nwse-resize',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'flex-end',
                    background: 'transparent',
                    zIndex: 10,
                    padding: 2 * zoomScale,
                }}
            >
                <svg
                    width={10 * zoomScale}
                    height={10 * zoomScale}
                    viewBox="0 0 10 10"
                    style={{ opacity: 0.5, pointerEvents: 'none', marginBottom: 2 * zoomScale, marginRight: 2 * zoomScale }}
                >
                    <line x1="10" y1="2" x2="2" y2="10" stroke="var(--color-accent, #4A90D9)" strokeWidth="1" />
                    <line x1="10" y1="5" x2="5" y2="10" stroke="var(--color-accent, #4A90D9)" strokeWidth="1" />
                    <line x1="10" y1="8" x2="8" y2="10" stroke="var(--color-accent, #4A90D9)" strokeWidth="1" />
                </svg>
            </div>
        </div>
    );
};
