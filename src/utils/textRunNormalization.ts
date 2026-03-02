import type { TextRun, TextStyle } from '../types';

/**
 * Shifts run baselineY values downward so the top of rendered glyph bounds
 * stays within the text box (runTop >= 0 in pt space).
 *
 * This is done once at save-time so all renderers can remain simple.
 */
export function normalizeRunsTopOverflow(
    runs: TextRun[],
    defaultStyle: Required<TextStyle>
): TextRun[] {
    if (runs.length === 0) return runs;

    const measureCanvas = document.createElement('canvas');
    const ctx = measureCanvas.getContext('2d');
    if (!ctx) return runs;

    let minTopPt = 0;
    for (const run of runs) {
        if (!run.text || run.text === '\n') continue;

        const style = { ...defaultStyle, ...run.style };
        const fontSizePx = (style.fontSize * 96) / 72;
        ctx.font = `${style.fontStyle || 'normal'} ${style.fontWeight || 'normal'} ${fontSizePx}px ${style.fontFamily}`;

        const metrics = ctx.measureText(run.text);
        const ascentPx = metrics.actualBoundingBoxAscent || fontSizePx * 0.8;
        const ascentPt = (ascentPx * 72) / 96;
        const baselineY = run.baselineY ?? 0;
        const runTopPt = baselineY - ascentPt;
        minTopPt = Math.min(minTopPt, runTopPt);
    }

    if (minTopPt >= 0) return runs;
    const shiftPt = -minTopPt;

    return runs.map((run) => (
        run.baselineY === undefined
            ? run
            : { ...run, baselineY: run.baselineY + shiftPt }
    ));
}
