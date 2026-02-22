import type { JSONContent } from '@tiptap/core';
import type { TextRun, TextStyle } from '../types';

/**
 * Extracts raw text runs with exact pixel-perfect `x` and `baselineY` coordinates
 * directly from the DOM using `Range.getClientRects()`.
 *
 * It uses a baseline marker injection trick to accurately read the true alphabetic
 * baseline computed by the browser layout engine, bypassing the need for math heuristics.
 *
 * @param editorEl The Tiptap ProseMirror root DOM element.
 * @param doc The serialized Tiptap JSONContent.
 * @param defaultStyle The default text style from the `TextContent`.
 * @param canvasWidthPx The logical size of the canvas to compute the inverse scale.
 * @param canvasZoom The current view zoom multiplier (e.g. 100 = 100%).
 *                   Since the overlay is rendered zoomed, we must scale DOM rects
 *                   back down to the canvas' normalized `pt` coordinate space.
 */
export function extractLayoutFromDOM(
    editorEl: HTMLElement,
    doc: JSONContent,
    defaultStyle: Required<TextStyle>,
    canvasWidth: number,
    canvasZoom: number
): TextRun[] {
    // The editor DOM is scaled by canvasZoom. 100% zoom = 96 DPI pixels.
    // 1 internal canvas pixel = 72/96 points.
    const pxToPt = (px: number) => (px / (canvasZoom / 100)) * (72 / 96);

    const runs: TextRun[] = [];

    // Flatten style extraction helper
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

    const isStyleEqual = (a?: Partial<TextStyle>, b?: Partial<TextStyle>) => JSON.stringify(a || {}) === JSON.stringify(b || {});

    // Phase 1: Inject baseline markers into every leaf element (except empty ones)
    // ProseMirror structure: .ProseMirror > p > text nodes (sometimes wrapped in span/strong/em)
    const markerClass = '__baseline-marker';
    const paragraphsDom = Array.from(editorEl.querySelectorAll('p'));

    paragraphsDom.forEach(p => {
        // Inject a zero-width inline-block span at the START of the paragraph
        // This gives us the baseline of the first line
        const startMarker = document.createElement('span');
        startMarker.className = markerClass;
        startMarker.style.display = 'inline-block';
        startMarker.style.width = '0px';
        startMarker.style.verticalAlign = 'baseline';
        // Needs some content to register a baseline
        startMarker.innerHTML = '&#8203;'; // zero width space
        p.insertBefore(startMarker, p.firstChild);

        // We also need markers whenever a line wraps.
        // It's hard to predict where DOM wraps, so we inject a marker before EVERY
        // inline child element (e.g. before every styled <span> or DOM text node wrapper)
        // If it falls on a new line, it gives us that line's baseline.
        Array.from(p.childNodes).forEach(child => {
            if (child.nodeType === Node.ELEMENT_NODE && (child as Element).className !== markerClass) {
                const innerMarker = startMarker.cloneNode(true);
                p.insertBefore(innerMarker, child);
            }
        });
    });

    // Force synchronous layout recalculation so rects are accurate
    const editorRect = editorEl.getBoundingClientRect();

    // Store the baselines we found (top coordinate of the marker relative to editor top)
    // We map line bounded-tops to baselines
    const markers = Array.from(editorEl.querySelectorAll(`.${markerClass}`));
    const baselines: { topPx: number, baselineYPx: number }[] = [];

    markers.forEach(m => {
        const rect = m.getBoundingClientRect();
        const topPx = rect.top - editorRect.top;
        const baselineYPx = rect.bottom - editorRect.top;
        baselines.push({ topPx, baselineYPx });
    });

    // Helper: Find the closest baseline marker's Y coordinate for a given character rect top
    // Returns null if no marker is reasonably close (e.g., for dynamically wrapped lines)
    const findBaselineForTop = (charTopPx: number): number | null => {
        let nearest = baselines[0];
        let minDist = Infinity;
        for (const b of baselines) {
            const dist = Math.abs(b.topPx - charTopPx);
            if (dist < minDist) {
                minDist = dist;
                nearest = b;
            }
        }
        // If the closest marker is more than 10px away vertically, this character is on a
        // naturally wrapped line that didn't get an explicit paragraph-start marker.
        if (!nearest || minDist > 10) return null;
        return nearest.baselineYPx;
    };

    // Phase 2: Walk Tiptap JSON and map characters to DOM Ranges
    let domParaIdx = 0;
    const paragraphs = doc.content ?? [];

    paragraphs.forEach((para, paraIdx) => {
        const nodes = para.content ?? [];
        if (nodes.length === 0) {
            runs.push({ text: '\n' });
            domParaIdx++;
            return;
        }

        const pNode = paragraphsDom[domParaIdx];
        if (!pNode) return;

        // Extract sequential DOM text nodes from this paragraph
        // We must ignore the marker spans because they aren't in the JSON
        const walker = document.createTreeWalker(pNode, NodeFilter.SHOW_TEXT, null);
        const domTextNodes: Text[] = [];
        let currNode = walker.nextNode() as Text;
        while (currNode) {
            // Ignore the zero-width spaces inside our markers
            if (currNode.parentElement && currNode.parentElement.className === markerClass) {
                // skip
            } else {
                domTextNodes.push(currNode);
            }
            currNode = walker.nextNode() as Text;
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

                for (let i = 0; i < charsToRead; i++) {
                    const charIdxInDom = currentDomNodeOffset + i;
                    range.setStart(domNode, charIdxInDom);
                    range.setEnd(domNode, charIdxInDom + 1);

                    const charRects = range.getClientRects();
                    if (charRects.length === 0) continue;

                    const charRect = charRects[0];
                    const char = node.text[nodeTextOffset + i];

                    // Convert and calculate exactly for this character
                    const charTopPx = charRect.top - editorRect.top;
                    const charLeftPx = charRect.left - editorRect.left;
                    const charBottomPx = charRect.bottom - editorRect.top;

                    const xPt = pxToPt(charLeftPx);

                    // Characters on the same line typically share similar `charRect.bottom` values.
                    // We attempt to find an injected baseline marker for the current line using `findBaselineForTop`.
                    // However, wrapped lines within a single text node may lack a marker.
                    // In such cases, or if no marker is close, we fallback to estimating the baseline from `charRect.bottom`.

                    // We also track line breaks by monitoring significant changes in the character's top coordinate (`charTopPx`).
                    const lastRun = runs[runs.length - 1];
                    const isStyleEqualValues = isStyleEqual(lastRun?.style, styleKeysLength > 0 ? style : undefined);

                    const markerBaseline = findBaselineForTop(charTopPx);
                    // Standard fonts have a descent of ~10-20% of their size.
                    // We can estimate it as 3px for standard display sizes if the marker is missing.
                    const baselineYPx = markerBaseline !== null ? markerBaseline : charBottomPx - 3;
                    const baselineYPt = pxToPt(baselineYPx);

                    // A new line is detected if the current character's TOP is significantly lower than the last character's TOP
                    // Since we don't store topPx in TextRun natively, we can use baselineY for grouping, 
                    // BUT since baselineY might be incorrectly identical (due to missing marker), 
                    // we MUST check if `charRect.top` changed!
                    let sameLine = false;
                    if (lastRun && lastRun.text !== '\n') {
                        // We need to inject `_lastTopPx` loosely onto the run just for this loop to track lines
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const runLastTopPx = (lastRun as any)._lastTopPx ?? charTopPx;
                        sameLine = Math.abs(runLastTopPx - charTopPx) < 5; // 5px tolerance for same line
                    }

                    if (lastRun && sameLine && isStyleEqualValues && lastRun.text !== '\n') {
                        lastRun.text += char;
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (lastRun as any)._lastTopPx = charTopPx; // Keep updating
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
                    currentDomNodeIdx++;
                    currentDomNodeOffset = 0;
                }
            }
        }

        // Add soft paragraph break
        if (paraIdx < paragraphs.length - 1) {
            const lastRun = runs[runs.length - 1];
            if (lastRun && lastRun.text !== '\n') {
                lastRun.text += '\n';
            } else {
                runs.push({ text: '\n' });
            }
        }

        domParaIdx++;
    });

    // Phase 3: Cleanup internal properties and markers
    runs.forEach(run => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (run as any)._lastTopPx;
    });

    markers.forEach(m => m.remove());

    if (runs.length === 0) runs.push({ text: '' });
    return runs;
}
