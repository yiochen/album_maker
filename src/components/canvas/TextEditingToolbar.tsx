/**
 * TextEditingToolbar — Floating toolbar that appears above a text element
 * during inline editing. Provides B/I/U toggles, font size, and color.
 *
 * Positioned absolutely within the canvas wrapper, based on coordinates
 * provided by useTextEditing.
 */
import React, { useCallback, useState, useEffect, useRef } from 'react';
import { CanvasTextElement } from '../../hooks/CanvasTextElement';
import type { TextToolbarPosition } from '../../hooks/useTextEditing';
import type { TextStyle, TextContent } from '../../types';
import { APP_CONFIG } from '../../config';

/** Height of the toolbar + gap above the text element. */
const TOOLBAR_HEIGHT = 36;
const TOOLBAR_GAP = 8;

function ptToCanvasPx(pt: number): number {
    return pt * APP_CONFIG.PPI / 72;
}

function canvasPxToPt(px: number): number {
    return px * 72 / APP_CONFIG.PPI;
}

const FONT_OPTIONS = [
    { label: 'Inter', value: 'Inter, sans-serif' },
    { label: 'Arial', value: 'Arial, sans-serif' },
    { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Times New Roman', value: 'Times New Roman, serif' },
    { label: 'Courier New', value: 'Courier New, monospace' },
];

type TextAlign = TextContent['textAlign'];
type ToolbarStyle = Partial<TextStyle> & { textAlign?: TextAlign };

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

interface TextEditingToolbarProps {
    /** Absolute position of the text element (wrapper-relative). */
    position: TextToolbarPosition;
    /** Getter for the active CanvasTextElement (may return null if editing ended). */
    getEditingTextElement: () => CanvasTextElement | null;
}

/**
 * Reads the current style at the cursor / selection from the Fabric Textbox.
 */
function readCurrentStyle(element: CanvasTextElement): ToolbarStyle {
    // getSelectionStyles returns array of style objects for the selection
    const styles = element.getSelectionStyles();
    if (styles.length === 0) {
        return {
            fontWeight: element.fontWeight as TextStyle['fontWeight'],
            fontStyle: element.fontStyle as TextStyle['fontStyle'],
            underline: element.underline ?? false,
            fontFamily: element.fontFamily as string,
            fontSize: element.fontSize,
            fill: element.fill as string,
            textAlign: element.textAlign as TextAlign,
        };
    }
    // Use the first char of selection as representative
    const first = styles[0];
    return {
        fontWeight: (first.fontWeight ?? element.fontWeight) as TextStyle['fontWeight'],
        fontStyle: (first.fontStyle ?? element.fontStyle) as TextStyle['fontStyle'],
        underline: (first.underline as boolean | undefined) ?? element.underline ?? false,
        fontFamily: (first.fontFamily as string | undefined) ?? (element.fontFamily as string),
        fontSize: (first.fontSize as number | undefined) ?? element.fontSize,
        fill: (first.fill as string | undefined) ?? (element.fill as string),
        textAlign: element.textAlign as TextAlign,
    };
}

export const TextEditingToolbar: React.FC<TextEditingToolbarProps> = ({
    position,
    getEditingTextElement,
}) => {
    const [currentStyle, setCurrentStyle] = useState<ToolbarStyle>({});
    const [isFontMenuOpen, setIsFontMenuOpen] = useState(false);
    const fontMenuRef = useRef<HTMLDivElement>(null);

    // Refresh style info periodically and on interaction
    const refreshStyle = useCallback(() => {
        const el = getEditingTextElement();
        if (el) {
            setCurrentStyle(readCurrentStyle(el));
        }
    }, [getEditingTextElement]);

    // Refresh on mount and selection changes
    useEffect(() => {
        const el = getEditingTextElement();
        if (!el?.canvas) return;

        // Initial style read via microtask to avoid sync setState in effect
        const timer = setTimeout(() => {
            refreshStyle();
        }, 0);

        // Listen for selection change on specific events
        const handler = () => setTimeout(refreshStyle, 0);
        el.canvas.on('text:selection:changed', handler);
        el.canvas.on('text:changed', handler);

        return () => {
            clearTimeout(timer);
            el.canvas?.off('text:selection:changed', handler);
            el.canvas?.off('text:changed', handler);
        };
    }, [getEditingTextElement, refreshStyle]);

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

    /** Toggle a boolean style property (bold, italic, underline). */
    const toggleStyle = useCallback((prop: 'fontWeight' | 'fontStyle' | 'underline') => {
        const el = getEditingTextElement();
        if (!el) return;

        let newValue: string | boolean;
        if (prop === 'fontWeight') {
            newValue = currentStyle.fontWeight === 'bold' ? 'normal' : 'bold';
        } else if (prop === 'fontStyle') {
            newValue = currentStyle.fontStyle === 'italic' ? 'normal' : 'italic';
        } else {
            newValue = !currentStyle.underline;
        }

        // Apply to selection (or whole text if no selection)
        if (el.selectionStart !== el.selectionEnd) {
            el.setSelectionStyles({ [prop]: newValue });
        } else {
            // No selection — set as "next character" style
            el.setSelectionStyles({ [prop]: newValue });
            // Also update the element-level default to affect new typing
            el.set(prop, newValue);
        }

        el.set('dirty', true);
        el.canvas?.renderAll();
        refreshStyle();
    }, [getEditingTextElement, currentStyle, refreshStyle]);

    const handleFontChange = useCallback((fontFamily: string) => {
        const el = getEditingTextElement();
        if (!el) return;

        if (el.selectionStart !== el.selectionEnd) {
            el.setSelectionStyles({ fontFamily });
        } else {
            el.setSelectionStyles({ fontFamily });
            el.set('fontFamily', fontFamily);
        }

        el.set('dirty', true);
        el.canvas?.renderAll();
        setIsFontMenuOpen(false);
        refreshStyle();
    }, [getEditingTextElement, refreshStyle]);

    const handleAlignmentChange = useCallback((textAlign: TextAlign) => {
        const el = getEditingTextElement();
        if (!el) return;

        el.set('textAlign', textAlign);
        el.set('dirty', true);
        el.canvas?.renderAll();
        refreshStyle();
    }, [getEditingTextElement, refreshStyle]);

    /** Change font size in pt (display unit); Fabric still stores px. */
    const handleSizeChange = useCallback((deltaPt: number) => {
        const el = getEditingTextElement();
        if (!el) return;

        const currentSizePx = (currentStyle.fontSize as number) || el.fontSize || ptToCanvasPx(12);
        const currentSizePt = canvasPxToPt(currentSizePx);
        const newSizePt = Math.max(6, Math.min(200, currentSizePt + deltaPt));
        const newSizePx = ptToCanvasPx(newSizePt);

        if (el.selectionStart !== el.selectionEnd) {
            el.setSelectionStyles({ fontSize: newSizePx });
        } else {
            el.set('fontSize', newSizePx);
        }

        el.set('dirty', true);
        el.canvas?.renderAll();
        refreshStyle();
    }, [getEditingTextElement, currentStyle, refreshStyle]);

    /** Change text color. */
    const handleColorChange = useCallback((color: string) => {
        const el = getEditingTextElement();
        if (!el) return;

        if (el.selectionStart !== el.selectionEnd) {
            el.setSelectionStyles({ fill: color });
        } else {
            el.set('fill', color);
        }

        el.set('dirty', true);
        el.canvas?.renderAll();
        refreshStyle();
    }, [getEditingTextElement, refreshStyle]);

    const isBold = currentStyle.fontWeight === 'bold';
    const isItalic = currentStyle.fontStyle === 'italic';
    const isUnderline = !!currentStyle.underline;
    const textAlign = currentStyle.textAlign ?? 'left';
    const activeFontFamily = currentStyle.fontFamily || FONT_OPTIONS[0].value;
    const fontLabel = FONT_OPTIONS.find(opt => opt.value === activeFontFamily)?.label ?? activeFontFamily.split(',')[0];
    const fontSizePt = Math.round(canvasPxToPt((currentStyle.fontSize as number) || ptToCanvasPx(12)));
    const fillColor = (currentStyle.fill as string) || '#000000';

    return (
        <div
            className="text-editing-toolbar"
            data-testid="text-editing-toolbar"
            style={{
                position: 'absolute',
                top: Math.max(0, position.top - TOOLBAR_HEIGHT - TOOLBAR_GAP),
                left: position.left,
                minWidth: Math.min(position.width, 280),
                zIndex: 1000,
            }}
            // Prevent clicks on toolbar from deselecting the text
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
                onClick={() => toggleStyle('fontWeight')}
                title="Bold"
                data-testid="text-bold-btn"
            >
                <strong>B</strong>
            </button>
            <button
                className={`text-toolbar-btn ${isItalic ? 'active' : ''}`}
                onClick={() => toggleStyle('fontStyle')}
                title="Italic"
                data-testid="text-italic-btn"
            >
                <em>I</em>
            </button>
            <button
                className={`text-toolbar-btn ${isUnderline ? 'active' : ''}`}
                onClick={() => toggleStyle('underline')}
                title="Underline"
                data-testid="text-underline-btn"
            >
                <span style={{ textDecoration: 'underline' }}>U</span>
            </button>

            <span className="text-toolbar-separator" />

            <button
                className={`text-toolbar-btn ${textAlign === 'left' ? 'active' : ''}`}
                onClick={() => handleAlignmentChange('left')}
                title="Align left"
                data-testid="text-align-left-btn"
            >
                <AlignIcon align="left" />
            </button>
            <button
                className={`text-toolbar-btn ${textAlign === 'center' ? 'active' : ''}`}
                onClick={() => handleAlignmentChange('center')}
                title="Align center"
                data-testid="text-align-center-btn"
            >
                <AlignIcon align="center" />
            </button>
            <button
                className={`text-toolbar-btn ${textAlign === 'right' ? 'active' : ''}`}
                onClick={() => handleAlignmentChange('right')}
                title="Align right"
                data-testid="text-align-right-btn"
            >
                <AlignIcon align="right" />
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
