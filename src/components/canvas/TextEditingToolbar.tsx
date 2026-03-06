/**
 * TextEditingToolbar — Floating toolbar for rich text editing.
 *
 * Renders above the text element during editing. Controls bold, italic, underline,
 * text alignment, font family, font size, and text color.
 *
 * Uses Tiptap editor commands instead of Fabric.js APIs.
 */
import React, { useCallback, useState, useEffect, useRef, useLayoutEffect } from 'react';
import type { Editor } from '@tiptap/react';
import type { TextContent } from '../../types';
import { useTiptapEditor } from '../../states/editorInfraStore';

/** Height of the toolbar + gap above the text element. */
const TOOLBAR_HEIGHT = 36;
const TOOLBAR_GAP = 8;

const FONT_OPTIONS = [
    { label: 'Inter', value: 'Inter, sans-serif' },
    { label: 'Arial', value: 'Arial, sans-serif' },
    { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Times New Roman', value: 'Times New Roman, serif' },
    { label: 'Courier New', value: 'Courier New, monospace' },
];

type TextAlign = TextContent['textAlign'];
type VerticalAlign = NonNullable<TextContent['placeholderVerticalAlign']>;

const AlignIcon: React.FC<{ align: TextAlign }> = ({ align }) => {
    const linesByAlign: Record<TextAlign, Array<[number, number, number]>> = {
        left: [
            [2, 14, 3],
            [2, 11, 7],
            [2, 14, 11],
            [2, 9, 15],
        ],
        center: [
            [2, 14, 3],
            [4, 12, 7],
            [2, 14, 11],
            [5, 11, 15],
        ],
        right: [
            [2, 14, 3],
            [5, 14, 7],
            [2, 14, 11],
            [8, 14, 15],
        ],
    };

    return (
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            {linesByAlign[align].map(([x1, x2, y], idx) => (
                <line
                    key={`${align}-${idx}-${x1}-${x2}-${y}`}
                    x1={x1}
                    y1={y}
                    x2={x2}
                    y2={y}
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                />
            ))}
        </svg>
    );
};

const VerticalAlignIcon: React.FC<{ align: VerticalAlign }> = ({ align }) => {
    if (align === 'top') {
        return (
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <line x1="2" y1="2.5" x2="14" y2="2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M8 12V5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M5.8 7.7L8 5.5L10.2 7.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }
    if (align === 'center') {
        return (
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M8 12.5V10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M6.2 10.7L8 12.5L9.8 10.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8 3.5V6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M6.2 5.3L8 3.5L9.8 5.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <line x1="2" y1="13.5" x2="14" y2="13.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M8 4V10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M5.8 8.3L8 10.5L10.2 8.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
};

/** Position rectangle for the floating toolbar, in viewport-relative pixels. */
export interface TextToolbarPosition {
    top: number;
    left: number;
    width: number;
}

interface TextEditingToolbarProps {
    /** Absolute position of the text element (container-relative). */
    position: TextToolbarPosition;
    /** Default font size in pt (for display). */
    defaultFontSizePt: number;
    /** Callback to update textAlign (stored on TextContent, not in Tiptap). */
    onTextAlignChange: (align: TextAlign) => void;
    /** Current text alignment. */
    textAlign: TextAlign;
    /** Callback to update vertical alignment in text content. */
    onVerticalAlignChange: (align: VerticalAlign) => void;
    /** Current vertical alignment. */
    verticalAlign: VerticalAlign;
}

/** Parse the font size from the editor's current textStyle mark attributes. */
function getEditorFontSizePt(editor: Editor | null, defaultSizePt: number): number {
    if (!editor) return Math.round(defaultSizePt);
    const attrs = editor.getAttributes('textStyle');
    if (attrs.fontSize) {
        const pt = parseFloat(attrs.fontSize);
        if (!isNaN(pt)) return Math.round(pt);
    }
    return Math.round(defaultSizePt);
}

export const TextEditingToolbar: React.FC<TextEditingToolbarProps> = ({
    position,
    defaultFontSizePt,
    onTextAlignChange,
    textAlign,
    onVerticalAlignChange,
    verticalAlign,
}) => {
    const editor = useTiptapEditor();
    const toolbarRef = useRef<HTMLDivElement>(null);
    const [isFontMenuOpen, setIsFontMenuOpen] = useState(false);
    const fontMenuRef = useRef<HTMLDivElement>(null);
    const [resolvedLeft, setResolvedLeft] = useState(position.left);

    // Reactive state from editor
    const [fontSizePt, setFontSizePt] = useState(Math.round(defaultFontSizePt));
    const [activeFontFamily, setActiveFontFamily] = useState('');

    // Sync state from editor on selection/content change
    const refreshState = useCallback(() => {
        if (!editor) {
            setFontSizePt(Math.round(defaultFontSizePt));
            setActiveFontFamily('');
            return;
        }
        setFontSizePt(getEditorFontSizePt(editor, defaultFontSizePt));
        const attrs = editor.getAttributes('textStyle');
        setActiveFontFamily(attrs.fontFamily || '');
    }, [editor, defaultFontSizePt]);

    useEffect(() => {
        if (!editor) return;
        const timer = setTimeout(refreshState, 0);
        editor.on('selectionUpdate', refreshState);
        editor.on('transaction', refreshState);
        return () => {
            clearTimeout(timer);
            editor.off('selectionUpdate', refreshState);
            editor.off('transaction', refreshState);
        };
    }, [editor, refreshState]);

    // Close font menu when clicking outside
    useEffect(() => {
        if (!isFontMenuOpen) return;
        const handlePointerDown = (event: MouseEvent) => {
            if (fontMenuRef.current && !fontMenuRef.current.contains(event.target as Node)) {
                setIsFontMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handlePointerDown);
        return () => document.removeEventListener('mousedown', handlePointerDown);
    }, [isFontMenuOpen]);

    useLayoutEffect(() => {
        const el = toolbarRef.current;
        if (!el) return;

        const updateLeft = () => {
            const parent = el.offsetParent as HTMLElement | null;
            if (!parent) {
                setResolvedLeft(position.left);
                return;
            }

            const maxLeft = Math.max(0, parent.clientWidth - el.offsetWidth);
            const clampedLeft = Math.min(Math.max(0, position.left), maxLeft);
            setResolvedLeft(clampedLeft);
        };

        updateLeft();
        window.addEventListener('resize', updateLeft);
        return () => window.removeEventListener('resize', updateLeft);
    }, [position.left, isFontMenuOpen, fontSizePt, activeFontFamily]);

    const handleFontChange = useCallback((fontFamily: string) => {
        if (!editor) return;
        editor.chain().focus().setFontFamily(fontFamily).run();
        setIsFontMenuOpen(false);
    }, [editor]);

    const handleSizeChange = useCallback((deltaPt: number) => {
        if (!editor) return;
        const newSize = Math.max(6, Math.min(200, fontSizePt + deltaPt));
        editor.chain().focus().setFontSize(`${newSize}pt`).run();
    }, [editor, fontSizePt]);

    const handleColorChange = useCallback((color: string) => {
        if (!editor) return;
        editor.chain().focus().setColor(color).run();
    }, [editor]);

    const isBold = editor?.isActive('bold') ?? false;
    const isItalic = editor?.isActive('italic') ?? false;
    const isUnderline = editor?.isActive('underline') ?? false;
    const fontLabel = FONT_OPTIONS.find(opt => opt.value === activeFontFamily)?.label
        ?? (activeFontFamily ? activeFontFamily.split(',')[0] : FONT_OPTIONS[0].label);
    const fillColor = editor?.getAttributes('textStyle').color || '#000000';

    if (!editor) return null;

    return (
        <div
            ref={toolbarRef}
            className="text-editing-toolbar"
            data-testid="text-editing-toolbar"
            style={{
                position: 'absolute',
                top: Math.max(0, position.top - TOOLBAR_HEIGHT - TOOLBAR_GAP),
                left: resolvedLeft,
                minWidth: Math.min(position.width, 280),
                zIndex: 1000,
            }}
            // Prevent clicks on toolbar from blurring the editor
            onMouseDown={(e) => e.preventDefault()}
        >
            <div className="text-toolbar-font" ref={fontMenuRef}>
                <button
                    className="text-toolbar-font-trigger"
                    onClick={() => setIsFontMenuOpen(v => !v)}
                    title="Font"
                    data-testid="text-font-trigger"
                >
                    <span className="text-toolbar-font-label">{fontLabel}</span>
                    <span className="text-toolbar-font-caret">{isFontMenuOpen ? '▾' : '▴'}</span>
                </button>
                {isFontMenuOpen && (
                    <div className="text-toolbar-font-menu" data-testid="text-font-menu">
                        {FONT_OPTIONS.map((font) => (
                            <button
                                key={font.value}
                                className={`text-toolbar-font-option ${font.value === activeFontFamily ? 'active' : ''}`}
                                style={{ fontFamily: font.value }}
                                onClick={() => handleFontChange(font.value)}
                                data-testid={`text-font-option-${font.label.toLowerCase().replace(/\s+/g, '-')}`}
                            >
                                {font.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <span className="text-toolbar-separator" />

            <button
                className={`text-toolbar-btn ${isBold ? 'active' : ''}`}
                onClick={() => editor.chain().focus().toggleBold().run()}
                title="Bold"
                data-testid="text-bold-btn"
            >
                <strong>B</strong>
            </button>
            <button
                className={`text-toolbar-btn ${isItalic ? 'active' : ''}`}
                onClick={() => editor.chain().focus().toggleItalic().run()}
                title="Italic"
                data-testid="text-italic-btn"
            >
                <em>I</em>
            </button>
            <button
                className={`text-toolbar-btn ${isUnderline ? 'active' : ''}`}
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                title="Underline"
                data-testid="text-underline-btn"
            >
                <span style={{ textDecoration: 'underline' }}>U</span>
            </button>

            <span className="text-toolbar-separator" />

            <button
                className={`text-toolbar-btn ${textAlign === 'left' ? 'active' : ''}`}
                onClick={() => onTextAlignChange('left')}
                title="Align left"
                data-testid="text-align-left-btn"
            >
                <AlignIcon align="left" />
            </button>
            <button
                className={`text-toolbar-btn ${textAlign === 'center' ? 'active' : ''}`}
                onClick={() => onTextAlignChange('center')}
                title="Align center"
                data-testid="text-align-center-btn"
            >
                <AlignIcon align="center" />
            </button>
            <button
                className={`text-toolbar-btn ${textAlign === 'right' ? 'active' : ''}`}
                onClick={() => onTextAlignChange('right')}
                title="Align right"
                data-testid="text-align-right-btn"
            >
                <AlignIcon align="right" />
            </button>

            <span className="text-toolbar-separator" />

            <button
                className={`text-toolbar-btn ${verticalAlign === 'top' ? 'active' : ''}`}
                onClick={() => onVerticalAlignChange('top')}
                title="Align top"
                data-testid="text-valign-top-btn"
            >
                <VerticalAlignIcon align="top" />
            </button>
            <button
                className={`text-toolbar-btn ${verticalAlign === 'center' ? 'active' : ''}`}
                onClick={() => onVerticalAlignChange('center')}
                title="Align middle"
                data-testid="text-valign-center-btn"
            >
                <VerticalAlignIcon align="center" />
            </button>
            <button
                className={`text-toolbar-btn ${verticalAlign === 'bottom' ? 'active' : ''}`}
                onClick={() => onVerticalAlignChange('bottom')}
                title="Align bottom"
                data-testid="text-valign-bottom-btn"
            >
                <VerticalAlignIcon align="bottom" />
            </button>

            <span className="text-toolbar-separator" />

            <button
                className="text-toolbar-btn"
                onClick={() => handleSizeChange(-1)}
                title="Decrease font size (pt)"
                data-testid="text-size-decrease"
            >
                −
            </button>
            <span className="text-toolbar-size" data-testid="text-size-display">
                {fontSizePt}pt
            </span>
            <button
                className="text-toolbar-btn"
                onClick={() => handleSizeChange(1)}
                title="Increase font size (pt)"
                data-testid="text-size-increase"
            >
                +
            </button>

            <span className="text-toolbar-separator" />

            <input
                type="color"
                className="text-toolbar-color"
                value={fillColor}
                onChange={(e) => handleColorChange(e.target.value)}
                title="Text color"
                data-testid="text-color-input"
            />
        </div>
    );
};
