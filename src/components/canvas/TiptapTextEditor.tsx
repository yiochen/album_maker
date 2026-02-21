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
import { textContentToTiptapDoc, tiptapDocToTextRuns } from '../../utils/tiptapSerializer';
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
    /** Called when editing is complete with updated content. */
    onSave: (content: TextContent) => void;
    /** Called when the user cancels editing (Escape). */
    onCancel: () => void;
    /** Called with the editor instance once it's ready (for toolbar integration). */
    onEditorReady?: (editor: Editor) => void;
    /** Called when the editor is about to be destroyed. */
    onEditorDestroy?: () => void;
    /** Current text alignment (controlled externally so toolbar can update it). */
    textAlign: TextContent['textAlign'];
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

    // Save handler — convert Tiptap doc back to TextRun[]
    const handleSave = useCallback(() => {
        if (!editor) return;

        const doc = editor.getJSON();
        const runs = tiptapDocToTextRuns(doc, defaultStyle);

        onSave({
            ...content,
            runs,
            textAlign,
        });
    }, [editor, defaultStyle, content, textAlign, onSave]);

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

    // Save on blur (click outside)
    useEffect(() => {
        if (!editor) return;

        const handleBlur = () => {
            // Small delay to allow toolbar clicks to process before blur
            setTimeout(() => {
                if (!editor.isFocused) {
                    handleSave();
                }
            }, 150);
        };

        editor.on('blur', handleBlur);
        return () => {
            editor.off('blur', handleBlur);
        };
    }, [editor, handleSave]);

    if (!editor) return null;

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
                background: 'rgba(255, 255, 255, 0.95)',
                border: '2px solid var(--color-accent, #4A90D9)',
                borderRadius: '2px',
            }}
            // Prevent clicks from propagating to the canvas
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
        >
            <EditorContent editor={editor} />
        </div>
    );
};
