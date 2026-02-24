/**
 * TiptapTextEditor — Overlay rich text editor that replaces Fabric's inline editing.
 *
 * Rendered as an absolute-positioned contenteditable div within the canvas wrapper,
 * positioned directly over the text element. The canvas CSS zoom transform handles
 * scaling automatically.
 *
 * ## Lifecycle
 * 1. Double-click text element → component mounts with Tiptap editor
 * 2. User edits with rich text capabilities
 * 3. On blur/Escape → persist TextRun[], unmount
 */
import React, { useEffect, useCallback, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import { FontSize } from '../../extensions/tiptapFontSize';
import { textContentToTiptapDoc } from '../../utils/tiptapSerializer';
import { extractLayoutFromDOM } from '../../utils/domLayoutExtractor';
import type { TextContent, NormalizedRect } from '../../types';

/** Props for the overlay position and styling. */
interface TiptapTextEditorProps {
    /** The TextContent to edit. */
    content: TextContent;
    /** Normalized box (0-1) of the text element. */
    box: NormalizedRect;
    /** Canvas width in px (at canvas PPI). */
    canvasWidth: number;
    /** Canvas height in px (at canvas PPI). */
    canvasHeight: number;
    /** Called when editing is complete with updated content. Optional width/height update for resizing. */
    onSave: (content: TextContent, newWidthPx?: number, newHeightPx?: number) => void;
    /** Called when the user cancels editing (Escape). */
    onCancel: () => void;
    /** Called with the editor instance once it's ready (for toolbar integration). */
    onEditorReady?: (editor: Editor) => void;
    /** Called when the editor is about to be destroyed. */
    onEditorDestroy?: () => void;
    /** Current text alignment (controlled externally so toolbar can update it). */
    textAlign: TextContent['textAlign'];
    /** Current canvas zoom percentage to scale layout values properly */
    canvasZoom: number;
}

export const TiptapTextEditor: React.FC<TiptapTextEditorProps> = ({
    content,
    box,
    canvasWidth,
    canvasHeight,
    onSave,
    onCancel,
    onEditorReady,
    onEditorDestroy,
    textAlign,
    canvasZoom,
}) => {
    const { defaultStyle } = content;

    // Convert normalized box to pixel position
    const left = box.x1 * canvasWidth;
    const top = box.y1 * canvasHeight;
    const width = (box.x2 - box.x1) * canvasWidth;
    const height = (box.y2 - box.y1) * canvasHeight;

    // Convert pt font size to px for CSS rendering (screen PPI = 96, 1pt = 96/72 px)
    const defaultFontSizePx = defaultStyle.fontSize * (96 / 72);

    // Initialize Tiptap doc from TextContent
    const initialDoc = useMemo(
        () => textContentToTiptapDoc(content),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [] // Only compute once on mount
    );

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
        content: initialDoc,
        autofocus: 'end',
        editorProps: {
            attributes: {
                style: [
                    `font-family: ${defaultStyle.fontFamily}`,
                    `font-size: ${defaultFontSizePx}px`,
                    `font-weight: ${defaultStyle.fontWeight}`,
                    `font-style: ${defaultStyle.fontStyle}`,
                    `color: ${defaultStyle.fill}`,
                    `line-height: ${content.lineHeight}`,
                    `text-align: ${textAlign}`,
                    'outline: none',
                    'white-space: pre-wrap',
                    'word-break: break-word',
                    'caret-color: currentColor',
                ].join('; '),
            },
        },
    });

    // Notify parent when editor is ready/destroyed
    useEffect(() => {
        if (editor) {
            onEditorReady?.(editor);
        }
        return () => {
            onEditorDestroy?.();
        };
    }, [editor, onEditorReady, onEditorDestroy]);

    // Update text-align when it changes externally (from toolbar)
    useEffect(() => {
        if (!editor) return;
        const el = editor.view.dom as HTMLElement;
        el.style.textAlign = textAlign;
    }, [editor, textAlign]);

    const handleSave = useCallback(() => {
        if (!editor) return;

        const doc = editor.getJSON();
        const editorEl = editor.view.dom as HTMLElement;
        const containerEl = editorEl.closest('.tiptap-text-editor-overlay') as HTMLElement;
        const finalWidthPx = containerEl?.offsetWidth;
        const finalHeightPx = containerEl?.offsetHeight;

        // Extract pixel-perfect layout from the DOM directly!
        const runs = extractLayoutFromDOM(
            editorEl,
            doc,
            defaultStyle as Required<import('../../types').TextStyle>,
            canvasWidth,
            canvasZoom
        );

        onSave({
            ...content,
            runs,
            textAlign,
        }, finalWidthPx, finalHeightPx);
    }, [editor, defaultStyle, content, textAlign, canvasWidth, canvasZoom, onSave]);

    // Handle Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                onCancel();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onCancel]);

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        const startX = e.clientX;
        const startWidth = width;
        const overlay = e.currentTarget.closest('.tiptap-text-editor-overlay') as HTMLElement;
        if (!overlay) return;

        const handlePointerMove = (moveEvent: PointerEvent) => {
            // Horizontal change in screen pixels
            const dx = moveEvent.clientX - startX;
            // Convert screen change to canvas-equivalent change
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
    }, [width, canvasZoom]);

    if (!editor) return null;

    // UI elements (border, handles) are inside the scaled wrapper,
    // so we must inversely scale them to keep them a constant physical size.
    const zoomScale = 100 / canvasZoom;
    const borderWidth = 2 * zoomScale;
    const handleWidth = 4 * zoomScale; // The visual bar
    const handleTouchArea = 24 * zoomScale; // Easy to grab

    return (
        <div
            className="tiptap-text-editor-overlay"
            data-testid="tiptap-text-editor"
            style={{
                position: 'absolute',
                left,
                top,
                width,
                minHeight: height,
                zIndex: 100,
                boxSizing: 'border-box',
                background: 'rgba(255, 255, 255, 0.98)',
                border: `${borderWidth}px solid var(--color-accent, #4A90D9)`,
                borderRadius: `${2 * zoomScale}px`,
                overflow: 'visible', // Allow handle to stick out slightly if needed
                paddingRight: handleWidth + 2 * zoomScale,
                transition: 'border-color 0.2s',
            }}
            // Prevent clicks from propagating to the canvas
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
        >
            <EditorContent editor={editor} />

            {/* Custom Resize Handle (Corner Style) */}
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
