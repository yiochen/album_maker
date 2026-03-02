import type { JSONContent } from '@tiptap/core';
import type { TextRun, TextStyle } from '../types';
import { extractLayoutFromDOM } from '../utils/domLayoutExtractor';
import { normalizeRunsTopOverflow } from '../utils/textRunNormalization';

interface BuildTextRunsFromEditorDOMOptions {
    editorEl: HTMLElement;
    hostEl?: HTMLElement | null;
    doc: JSONContent;
    defaultStyle: Required<TextStyle>;
    canvasWidth: number;
    canvasZoom: number;
}

const pxToPt = (px: number, canvasZoom: number): number => (px / (canvasZoom / 100)) * (72 / 96);

/**
 * Builds final renderer-ready text runs from current editor DOM content.
 * This applies:
 * 1) layout extraction from ProseMirror DOM
 * 2) host/editor offset correction
 * 3) top-overflow normalization
 */
export function buildTextRunsFromEditorDOM({
    editorEl,
    hostEl,
    doc,
    defaultStyle,
    canvasWidth,
    canvasZoom,
}: BuildTextRunsFromEditorDOMOptions): TextRun[] {
    const runs = extractLayoutFromDOM(
        editorEl,
        doc,
        defaultStyle,
        canvasWidth,
        canvasZoom
    );

    if (hostEl) {
        const hostRect = hostEl.getBoundingClientRect();
        const editorRect = editorEl.getBoundingClientRect();
        const hostStyle = window.getComputedStyle(hostEl);
        const hostPaddingLeft = Number.parseFloat(hostStyle.paddingLeft) || 0;
        const hostPaddingTop = Number.parseFloat(hostStyle.paddingTop) || 0;
        const hostContentLeft = hostRect.left + hostEl.clientLeft + hostPaddingLeft;
        const hostContentTop = hostRect.top + hostEl.clientTop + hostPaddingTop;
        const offsetXPt = pxToPt(editorRect.left - hostContentLeft, canvasZoom);
        const offsetYPt = pxToPt(editorRect.top - hostContentTop, canvasZoom);

        for (const run of runs) {
            if (run.x !== undefined) run.x += offsetXPt;
            if (run.baselineY !== undefined) run.baselineY += offsetYPt;
        }
    }

    return normalizeRunsTopOverflow(runs, defaultStyle);
}
