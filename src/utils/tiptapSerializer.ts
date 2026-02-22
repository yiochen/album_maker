/**
 * tiptapSerializer — Bidirectional conversion between TextRun[] and Tiptap JSON.
 *
 * Converts TextContent (our data model) to Tiptap's JSONContent for editing,
 * and back when the user finishes editing.
 *
 * ## Design
 * - Tiptap uses a ProseMirror doc with paragraphs and inline text nodes.
 * - Our TextRun[] is a flat list of styled text segments (including \n for line breaks).
 * - Conversion maps \n boundaries to paragraph breaks and TextStyle to Tiptap marks.
 */
import type { JSONContent } from '@tiptap/core';
import type { TextContent, TextRun, TextStyle } from '../types';

/**
 * Convert TextContent → Tiptap JSONContent document.
 *
 * Maps runs to Tiptap text nodes grouped by paragraphs (\n = paragraph break).
 * Style overrides become Tiptap marks (bold, italic, underline, textStyle).
 */
export function textContentToTiptapDoc(content: TextContent): JSONContent {
    const { runs, defaultStyle } = content;

    // Split runs at \n boundaries into paragraphs
    const paragraphs: JSONContent[] = [];
    let currentNodes: JSONContent[] = [];

    const flushParagraph = () => {
        paragraphs.push({
            type: 'paragraph',
            content: currentNodes.length > 0 ? currentNodes : undefined,
        });
        currentNodes = [];
    };

    for (const run of runs) {
        const mergedStyle = { ...defaultStyle, ...run.style };
        const marks = styleToMarks(mergedStyle, defaultStyle);

        // Split on newlines — each \n creates a new paragraph
        const parts = run.text.split('\n');

        parts.forEach((part, idx) => {
            if (part.length > 0) {
                const node: JSONContent = { type: 'text', text: part };
                if (marks.length > 0) node.marks = marks as Array<{ type: string; attrs?: Record<string, unknown> }>;
                currentNodes.push(node);
            }

            // Every \n creates a paragraph break (except at end of last part)
            if (idx < parts.length - 1) {
                flushParagraph();
            }
        });
    }

    // Flush remaining content as the last paragraph
    flushParagraph();

    return {
        type: 'doc',
        content: paragraphs,
    };
}

/**
 * Convert Tiptap JSONContent → TextContent (preserving existing defaultStyle/textAlign/lineHeight).
 *
 * It performs a simple structure conversion into flat text runs (without layout coordinates).
 *
 * Only updates `runs` — the caller should preserve other TextContent fields.
 */
export function tiptapDocToTextRuns(
    doc: JSONContent,
    defaultStyle: Required<TextStyle>
): TextRun[] {
    const runs: TextRun[] = [];
    const paragraphs = doc.content ?? [];

    paragraphs.forEach((para, paraIdx) => {
        const nodes = para.content ?? [];

        if (nodes.length === 0 && paraIdx < paragraphs.length - 1) {
            // Empty paragraph = just a newline
            runs.push({ text: '\n' });
            return;
        }

        for (const node of nodes) {
            if (node.type !== 'text' || !node.text) continue;

            const style = marksToStyle(node.marks ?? [], defaultStyle);
            const run: TextRun = { text: node.text };

            if (style && Object.keys(style).length > 0) {
                run.style = style;
            }

            runs.push(run);
        }

        // Add newline between paragraphs (but not after the last one)
        if (paraIdx < paragraphs.length - 1) {
            // Append \n to the last run of this paragraph if it exists, otherwise create one
            const lastRun = runs[runs.length - 1];
            if (lastRun && lastRun.text !== '\n') {
                lastRun.text += '\n';
            } else {
                runs.push({ text: '\n' });
            }
        }
    });

    // Ensure at least one run exists
    if (runs.length === 0) {
        runs.push({ text: '' });
    }

    return runs;
}

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Convert a merged TextStyle to an array of Tiptap marks.
 * Only includes marks that differ from the default (to keep things clean).
 */
function styleToMarks(
    style: Required<TextStyle>,
    defaultStyle: Required<TextStyle>,
): JSONContent[] {
    const marks: JSONContent[] = [];

    if (style.fontWeight === 'bold') {
        marks.push({ type: 'bold' });
    }
    if (style.fontStyle === 'italic') {
        marks.push({ type: 'italic' });
    }
    if (style.underline) {
        marks.push({ type: 'underline' });
    }

    // textStyle mark for font family, size, and color overrides
    const attrs: Record<string, string | null> = {};
    if (style.fontFamily !== defaultStyle.fontFamily) {
        attrs.fontFamily = style.fontFamily;
    }
    if (style.fontSize !== defaultStyle.fontSize) {
        attrs.fontSize = `${style.fontSize}pt`;
    }
    if (style.fill !== defaultStyle.fill) {
        attrs.color = style.fill;
    }

    if (Object.keys(attrs).length > 0) {
        marks.push({ type: 'textStyle', attrs });
    }

    return marks;
}

/**
 * Convert an array of Tiptap marks back to a TextStyle override object.
 * Returns only fields that differ from the default.
 */
function marksToStyle(
    marks: JSONContent[],
    defaultStyle: Required<TextStyle>,
): Partial<TextStyle> | undefined {
    const style: Partial<TextStyle> = {};

    for (const mark of marks) {
        switch (mark.type) {
            case 'bold':
                style.fontWeight = 'bold';
                break;
            case 'italic':
                style.fontStyle = 'italic';
                break;
            case 'underline':
                style.underline = true;
                break;
            case 'textStyle': {
                const attrs = mark.attrs ?? {};
                if (attrs.fontFamily && attrs.fontFamily !== defaultStyle.fontFamily) {
                    style.fontFamily = attrs.fontFamily;
                }
                if (attrs.fontSize) {
                    const pt = parseFloat(attrs.fontSize);
                    if (!isNaN(pt) && pt !== defaultStyle.fontSize) {
                        style.fontSize = pt;
                    }
                }
                if (attrs.color && attrs.color !== defaultStyle.fill) {
                    style.fill = attrs.color;
                }
                break;
            }
        }
    }

    // Filter out style fields that match defaults
    if (style.fontWeight === defaultStyle.fontWeight) delete style.fontWeight;
    if (style.fontStyle === defaultStyle.fontStyle) delete style.fontStyle;
    if (style.underline === defaultStyle.underline) delete style.underline;

    return Object.keys(style).length > 0 ? style : undefined;
}
