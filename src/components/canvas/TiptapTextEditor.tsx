/**
 * TiptapTextEditor — Overlay rich text editor that replaces Fabric's inline editing.
 *
 * Rendered as an absolute-positioned div within the canvas wrapper,
 * positioned directly over the text element. The canvas CSS zoom transform handles
 * scaling automatically.
 *
 * ## Lifecycle
 * 1. User double-clicks a text element in Fabric → Store updates editingTextElementId
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
import type { TextContent, PageElement, TextRun } from '../../types';

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
    /** Current text vertical alignment for the editor box. */
    verticalAlign: NonNullable<TextContent['placeholderVerticalAlign']>;
    /** Current canvas zoom percentage to scale layout values properly */
    canvasZoom: number;
    /** Monotonic nonce; increment means parent requests close+commit before unmount. */
    closeRequestNonce?: number;
    /** Called after close-request commit sequence finishes. */
    onRequestCloseCommitted?: () => void;
}

export const TiptapTextEditor: React.FC<TiptapTextEditorProps> = ({
    editor,
    elementId,
    canvasWidth,
    canvasHeight,
    textAlign,
    verticalAlign,
    canvasZoom,
    closeRequestNonce = 0,
    onRequestCloseCommitted,
}) => {
    const BASE_EDITOR_PADDING_PX = 8;

    const spreads = useAlbumSpreads();
    const currentSpreadIndex = useCurrentSpreadIndex();
    const updateElement = useUpdateElement();
    const overlayRef = useRef<HTMLDivElement | null>(null);
    const editorHostRef = useRef<HTMLDivElement | null>(null);

    // Find the element being edited
    const element = useMemo(() => {
        const spread = spreads[currentSpreadIndex];
        return spread?.elements.find(e => e.id === elementId) ?? null;
    }, [elementId, spreads, currentSpreadIndex]);

    // Keep refs for save logic
    const updateElementRef = useRef(updateElement);
    const elementRef = useRef(element);
    const canvasWidthRef = useRef(canvasWidth);
    const canvasHeightRef = useRef(canvasHeight);
    const canvasZoomRef = useRef(canvasZoom);
    const textAlignRef = useRef(textAlign);
    const verticalAlignRef = useRef(verticalAlign);
    const sessionSpreadIdRef = useRef<string | null>(null);
    const sessionGroupIdRef = useRef(crypto.randomUUID());
    const didManualCloseCommitRef = useRef(false);
    const lastCloseRequestNonceRef = useRef(closeRequestNonce);

    useEffect(() => {
        updateElementRef.current = updateElement;
        elementRef.current = element;
        canvasWidthRef.current = canvasWidth;
        canvasHeightRef.current = canvasHeight;
        canvasZoomRef.current = canvasZoom;
        textAlignRef.current = textAlign;
        verticalAlignRef.current = verticalAlign;
    }, [updateElement, element, canvasWidth, canvasHeight, canvasZoom, textAlign, verticalAlign]);

    const sessionSpreadId = useMemo(() => {
        const currentSpread = spreads[currentSpreadIndex];
        if (currentSpread?.elements.some(e => e.id === elementId)) {
            return currentSpread.id;
        }
        return spreads.find(s => s.elements.some(e => e.id === elementId))?.id ?? null;
    }, [spreads, currentSpreadIndex, elementId]);

    useEffect(() => {
        if (!sessionSpreadIdRef.current && sessionSpreadId) {
            sessionSpreadIdRef.current = sessionSpreadId;
        }
    }, [sessionSpreadId]);

    const buildSnapshot = useCallback(() => {
        if (!editor) return null;

        const spreadId = sessionSpreadIdRef.current;
        const currentElement = elementRef.current;
        if (!spreadId || !currentElement || !isTextElement(currentElement)) return null;

        const editorEl = editor.view.dom as HTMLElement;
        if (!editorEl || !editorEl.isConnected) return null;

        const doc = editor.getJSON();
        const runs: TextRun[] = extractLayoutFromDOM(
            editorEl,
            doc,
            (currentElement.content as TextContent).defaultStyle as Required<import('../../types').TextStyle>,
            canvasWidthRef.current,
            canvasZoomRef.current
        );

        // The editor content can be vertically aligned via flex on the host container.
        // extractLayoutFromDOM returns coordinates relative to the ProseMirror root,
        // so we need to add host->editor offsets to preserve final run positions.
        const hostEl = editorHostRef.current;
        if (hostEl) {
            const hostRect = hostEl.getBoundingClientRect();
            const editorRect = editorEl.getBoundingClientRect();
            const hostStyle = window.getComputedStyle(hostEl);
            const hostPaddingLeft = Number.parseFloat(hostStyle.paddingLeft) || 0;
            const hostPaddingTop = Number.parseFloat(hostStyle.paddingTop) || 0;
            const pxToPt = (px: number) => (px / (canvasZoomRef.current / 100)) * (72 / 96);
            const hostContentLeft = hostRect.left + hostEl.clientLeft + hostPaddingLeft;
            const hostContentTop = hostRect.top + hostEl.clientTop + hostPaddingTop;
            const offsetXPt = pxToPt(editorRect.left - hostContentLeft);
            const offsetYPt = pxToPt(editorRect.top - hostContentTop);

            for (const run of runs) {
                if (run.x !== undefined) run.x += offsetXPt;
                if (run.baselineY !== undefined) run.baselineY += offsetYPt;
            }
        }

        const updates = {
            content: {
                runs,
                textAlign: textAlignRef.current,
                placeholderVerticalAlign: verticalAlignRef.current,
            },
        } as unknown as Partial<PageElement>;

        const overlayEl = overlayRef.current;
        const finalWidthPx = overlayEl?.offsetWidth;
        const finalHeightPx = overlayEl?.offsetHeight;
        const zoomScaleAtSave = 100 / Math.max(1, canvasZoomRef.current);
        const editorPaddingAtSave = BASE_EDITOR_PADDING_PX * zoomScaleAtSave;
        const handleReservePaddingAtSave = 4 * zoomScaleAtSave + 2 * zoomScaleAtSave;
        if (
            canvasWidthRef.current > 0 &&
            canvasHeightRef.current > 0 &&
            finalWidthPx !== undefined &&
            finalHeightPx !== undefined &&
            finalWidthPx > 0 &&
            finalHeightPx > 0
        ) {
            const contentWidthPx = Math.max(
                1,
                finalWidthPx - (editorPaddingAtSave * 2 + handleReservePaddingAtSave)
            );
            const contentHeightPx = Math.max(1, finalHeightPx - editorPaddingAtSave * 2);
            updates.box = {
                ...currentElement.box,
                x2: currentElement.box.x1 + contentWidthPx / canvasWidthRef.current,
                y2: currentElement.box.y1 + contentHeightPx / canvasHeightRef.current,
            };
        }

        return { spreadId, elementId, updates };
    }, [editor, elementId]);

    const commitFinalSnapshot = useCallback(() => {
        const snapshot = buildSnapshot();
        if (!snapshot) return;
        updateElementRef.current(
            snapshot.spreadId,
            snapshot.elementId,
            snapshot.updates,
            sessionGroupIdRef.current
        );
    }, [buildSnapshot]);

    const commitAfterStableLayout = useCallback(() => {
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                commitFinalSnapshot();
                didManualCloseCommitRef.current = true;
                onRequestCloseCommitted?.();
            });
        });
    }, [commitFinalSnapshot, onRequestCloseCommitted]);

    // Parent-requested close/commit handshake (used by transition hook).
    useEffect(() => {
        if (closeRequestNonce === lastCloseRequestNonceRef.current) return;
        lastCloseRequestNonceRef.current = closeRequestNonce;
        commitAfterStableLayout();
    }, [closeRequestNonce, commitAfterStableLayout]);

    // Final commit on close/unmount (single history entry).
    useEffect(() => {
        return () => {
            if (!didManualCloseCommitRef.current) {
                commitFinalSnapshot();
            }
        };
    }, [commitFinalSnapshot]);

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        const startX = e.clientX;
        const startY = e.clientY;
        const currentElement = elementRef.current;
        if (!currentElement) return;

        const startWidth = (currentElement.box.x2 - currentElement.box.x1) * canvasWidth;
        const overlay = overlayRef.current;
        if (!overlay) return;
        const editorPadding = BASE_EDITOR_PADDING_PX * (100 / canvasZoom);
        const handleReservePadding = 4 * (100 / canvasZoom) + 2 * (100 / canvasZoom);
        const startOverlayHeight = overlay.offsetHeight;
        const minOverlayHeight = editorPadding * 2 + 24;

        const handlePointerMove = (moveEvent: PointerEvent) => {
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;
            const dxCanvas = dx / (canvasZoom / 100);
            const dyCanvas = dy / (canvasZoom / 100);
            const newWidth = Math.max(50, startWidth + dxCanvas);
            overlay.style.width = `${newWidth + editorPadding * 2 + handleReservePadding}px`;
            overlay.style.height = `${Math.max(minOverlayHeight, startOverlayHeight + dyCanvas)}px`;
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
        if (!content || !element) return 0;
        const fontSizePt = content.defaultStyle.fontSize || 24;
        const lineHeight = content.lineHeight || 1.2;
        const oneLineHeight = Math.ceil((fontSizePt * lineHeight * 96) / 72);
        const boxHeight = Math.ceil((element.box.y2 - element.box.y1) * canvasHeight);
        return Math.max(oneLineHeight, boxHeight);
    }, [content, element, canvasHeight]);

    useLayoutEffect(() => {
        if (!editor || !content) return;

        const editorEl = editor.view.dom as HTMLElement;
        const syncHeight = () => {
            const measured = Math.ceil(editorEl.scrollHeight || 0);
            const nextHeight = Math.max(minimumEditorHeight, measured);
            const safeHeight = nextHeight > 0 ? nextHeight : null;
            setOverlayHeight(safeHeight);
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
        const justifyContent = verticalAlign === 'center'
            ? 'center'
            : verticalAlign === 'bottom'
                ? 'flex-end'
                : 'flex-start';
        return {
            textAlign,
            fontFamily: content.defaultStyle.fontFamily,
            fontSize: `${content.defaultStyle.fontSize}pt`,
            fontWeight: content.defaultStyle.fontWeight,
            fontStyle: content.defaultStyle.fontStyle,
            color: content.defaultStyle.fill,
            lineHeight: String(content.lineHeight),
            margin: 0,
            height: '100%',
            display: 'flex',
            flexDirection: 'column' as const,
            justifyContent,
        };
    }, [content, textAlign, verticalAlign]);

    if (!element || !isTextElement(element)) return null;
    if (!editor) return null;

    const { box } = element;
    const left = box.x1 * canvasWidth;
    const top = box.y1 * canvasHeight;
    const width = (box.x2 - box.x1) * canvasWidth;
    const height = (box.y2 - box.y1) * canvasHeight;

    const zoomScale = 100 / canvasZoom;
    const editorPadding = BASE_EDITOR_PADDING_PX * zoomScale;
    const borderWidth = 2 * zoomScale;
    const handleWidth = 4 * zoomScale;
    const handleTouchArea = 24 * zoomScale;
    const handleReservePadding = handleWidth + 2 * zoomScale;

    // The singleton editor's DOM node (editor.view.dom) is moved into this local 
    // container whenever a text element enters edit mode.
    return (
        <div
            ref={overlayRef}
            className="tiptap-text-editor-overlay"
            data-testid="tiptap-text-editor"
            style={{
                position: 'absolute',
                left: left - editorPadding,
                top: top - editorPadding,
                width: width + editorPadding * 2 + handleReservePadding,
                height: (overlayHeight ?? height) + editorPadding * 2,
                zIndex: 100,
                boxSizing: 'border-box',
                background: 'rgba(255, 255, 255, 0.98)',
                border: `${borderWidth}px solid var(--color-accent, #4A90D9)`,
                borderRadius: `${6 * zoomScale}px`,
                boxShadow: `0 ${2 * zoomScale}px ${10 * zoomScale}px rgba(0, 0, 0, 0.16)`,
                overflow: 'visible',
                paddingTop: editorPadding,
                paddingBottom: editorPadding,
                paddingLeft: editorPadding,
                paddingRight: editorPadding + handleReservePadding,
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
                data-testid="tiptap-resize-handle"
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
                    border: 'none',
                    borderRadius: 0,
                    boxShadow: 'none',
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
