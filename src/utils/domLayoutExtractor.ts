import type { JSONContent } from '@tiptap/core';
import type { TextRun, TextStyle } from '../types';

/**
 * Extracts text runs with exact `x` and `baselineY` coordinates
 * from the current ProseMirror DOM layout.
 */
export function extractLayoutFromDOM(
    editorEl: HTMLElement,
    doc: JSONContent,
    defaultStyle: Required<TextStyle>,
    canvasZoom: number
): TextRun[] {
    const pxToPt = (px: number) => (px / (canvasZoom / 100)) * (72 / 96);
    const runs: TextRun[] = [];

    const mergeStyles = (marks: JSONContent[] = []): Partial<TextStyle> => {
        const result: Partial<TextStyle> = {};
        for (const mark of marks) {
            if (mark.type === 'bold') result.fontWeight = 'bold';
            if (mark.type === 'italic') result.fontStyle = 'italic';
            if (mark.type === 'underline') result.underline = true;
            if (mark.type === 'textStyle' && mark.attrs) {
                if (mark.attrs.fontFamily) result.fontFamily = mark.attrs.fontFamily;
                if (mark.attrs.fontSize) result.fontSize = parseFloat(mark.attrs.fontSize);
                if (mark.attrs.color) result.fill = mark.attrs.color;
            }
        }
        return result;
    };

    const isStyleEqual = (a?: Partial<TextStyle>, b?: Partial<TextStyle>) =>
        JSON.stringify(a || {}) === JSON.stringify(b || {});

    const editorRect = editorEl.getBoundingClientRect();
    const paragraphsDom = Array.from(editorEl.querySelectorAll('p'));
    const paragraphs = doc.content ?? [];

    let domParaIdx = 0;

    paragraphs.forEach((para, paraIdx) => {
        const nodes = para.content ?? [];
        if (nodes.length === 0) {
            if (paraIdx < paragraphs.length - 1) {
                runs.push({ text: '\n' });
            }
            domParaIdx += 1;
            return;
        }

        const pNode = paragraphsDom[domParaIdx];
        if (!pNode) {
            domParaIdx += 1;
            return;
        }

        const walker = document.createTreeWalker(pNode, NodeFilter.SHOW_TEXT, null);
        const domTextNodes: Text[] = [];
        let currentNode = walker.nextNode() as Text | null;
        while (currentNode) {
            domTextNodes.push(currentNode);
            currentNode = walker.nextNode() as Text | null;
        }

        let currentDomNodeIdx = 0;
        let currentDomNodeOffset = 0;

        for (const node of nodes) {
            if (node.type !== 'text' || !node.text) continue;

            const style = mergeStyles(node.marks);
            const styleKeysLength = Object.keys(style).length;

            let nodeTextOffset = 0;
            while (nodeTextOffset < node.text.length) {
                const domNode = domTextNodes[currentDomNodeIdx];
                if (!domNode) break;

                const domNodeText = domNode.nodeValue || '';
                const availableDomChars = domNodeText.length - currentDomNodeOffset;
                const charsToRead = Math.min(node.text.length - nodeTextOffset, availableDomChars);
                const range = document.createRange();

                for (let i = 0; i < charsToRead; i += 1) {
                    const charIdxInDom = currentDomNodeOffset + i;
                    range.setStart(domNode, charIdxInDom);
                    range.setEnd(domNode, charIdxInDom + 1);

                    const charRects = range.getClientRects();
                    if (charRects.length === 0) continue;

                    const charRect = charRects[0];
                    const char = node.text[nodeTextOffset + i];

                    const charTopPx = charRect.top - editorRect.top;
                    const charLeftPx = charRect.left - editorRect.left;
                    const charBottomPx = charRect.bottom - editorRect.top;

                    const xPt = pxToPt(charLeftPx);
                    const effectiveFontSizePt = style.fontSize ?? defaultStyle.fontSize;
                    const effectiveFontSizePx = (effectiveFontSizePt * 96) / 72;
                    const estimatedDescentPx = Math.max(2, effectiveFontSizePx * 0.2);
                    const baselineYPt = pxToPt(charBottomPx - estimatedDescentPx);

                    const lastRun = runs[runs.length - 1];
                    const isSameStyle = isStyleEqual(lastRun?.style, styleKeysLength > 0 ? style : undefined);

                    let sameLine = false;
                    if (lastRun && lastRun.text !== '\n') {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const runLastTopPx = (lastRun as any)._lastTopPx ?? charTopPx;
                        sameLine = Math.abs(runLastTopPx - charTopPx) < 1.5;
                    }

                    if (lastRun && sameLine && isSameStyle && lastRun.text !== '\n') {
                        lastRun.text += char;
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (lastRun as any)._lastTopPx = charTopPx;
                    } else {
                        const run: TextRun = {
                            text: char,
                            x: xPt,
                            baselineY: baselineYPt,
                        };
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (run as any)._lastTopPx = charTopPx;
                        if (styleKeysLength > 0) run.style = style;
                        runs.push(run);
                    }
                }

                nodeTextOffset += charsToRead;
                currentDomNodeOffset += charsToRead;

                if (currentDomNodeOffset >= domNodeText.length) {
                    currentDomNodeIdx += 1;
                    currentDomNodeOffset = 0;
                }
            }
        }

        if (paraIdx < paragraphs.length - 1) {
            const lastRun = runs[runs.length - 1];
            if (lastRun && lastRun.text !== '\n') {
                lastRun.text += '\n';
            } else {
                runs.push({ text: '\n' });
            }
        }

        domParaIdx += 1;
    });

    runs.forEach((run) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (run as any)._lastTopPx;
    });

    if (runs.length === 0) runs.push({ text: '' });
    return runs;
}
