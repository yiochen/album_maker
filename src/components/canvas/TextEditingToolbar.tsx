/**
 * TextEditingToolbar — Floating toolbar that appears above a text element
 * during inline editing. Provides B/I/U toggles, font size, and color.
 *
 * Positioned absolutely within the canvas wrapper, based on coordinates
 * provided by useTextEditing.
 */
import React, { useCallback, useState, useEffect } from 'react';
import { CanvasTextElement } from '../../hooks/CanvasTextElement';
import type { TextToolbarPosition } from '../../hooks/useTextEditing';
import type { TextStyle } from '../../types';

/** Height of the toolbar + gap above the text element. */
const TOOLBAR_HEIGHT = 36;
const TOOLBAR_GAP = 8;

interface TextEditingToolbarProps {
    /** Absolute position of the text element (wrapper-relative). */
    position: TextToolbarPosition;
    /** Getter for the active CanvasTextElement (may return null if editing ended). */
    getEditingTextElement: () => CanvasTextElement | null;
}

/**
 * Reads the current style at the cursor / selection from the Fabric Textbox.
 */
function readCurrentStyle(element: CanvasTextElement): Partial<TextStyle> {
    // getSelectionStyles returns array of style objects for the selection
    const styles = element.getSelectionStyles();
    if (styles.length === 0) {
        return {
            fontWeight: element.fontWeight as TextStyle['fontWeight'],
            fontStyle: element.fontStyle as TextStyle['fontStyle'],
            underline: element.underline ?? false,
            fontSize: element.fontSize,
            fill: element.fill as string,
        };
    }
    // Use the first char of selection as representative
    const first = styles[0];
    return {
        fontWeight: (first.fontWeight ?? element.fontWeight) as TextStyle['fontWeight'],
        fontStyle: (first.fontStyle ?? element.fontStyle) as TextStyle['fontStyle'],
        underline: (first.underline as boolean | undefined) ?? element.underline ?? false,
        fontSize: (first.fontSize as number | undefined) ?? element.fontSize,
        fill: (first.fill as string | undefined) ?? (element.fill as string),
    };
}

export const TextEditingToolbar: React.FC<TextEditingToolbarProps> = ({
    position,
    getEditingTextElement,
}) => {
    const [currentStyle, setCurrentStyle] = useState<Partial<TextStyle>>({});

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

    /** Change font size. */
    const handleSizeChange = useCallback((delta: number) => {
        const el = getEditingTextElement();
        if (!el) return;

        const currentSize = (currentStyle.fontSize as number) || el.fontSize || 16;
        const newSize = Math.max(6, Math.min(200, currentSize + delta));

        if (el.selectionStart !== el.selectionEnd) {
            el.setSelectionStyles({ fontSize: newSize });
        } else {
            el.set('fontSize', newSize);
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
    const fontSize = Math.round((currentStyle.fontSize as number) || 16);
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
                className="text-toolbar-btn"
                onClick={() => handleSizeChange(-1)}
                title="Decrease font size"
                data-testid="text-size-decrease"
            >
                −
            </button>
            <span className="text-toolbar-size" data-testid="text-size-display">
                {fontSize}
            </span>
            <button
                className="text-toolbar-btn"
                onClick={() => handleSizeChange(1)}
                title="Increase font size"
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
