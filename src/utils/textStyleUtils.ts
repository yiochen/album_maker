/**
 * textStyleUtils - Pure conversion utilities between TextRun[] and Fabric.js style format.
 *
 * Fabric.js Textbox uses per-character styles indexed by line number and character index:
 *   { lineIndex: { charIndex: { fontWeight: 'bold', ... } } }
 *
 * Our data model uses consecutive "runs" of styled text:
 *   [{ text: "Hello ", style: { fontWeight: 'bold' } }, { text: "world" }]
 *
 * These utilities convert between the two formats without any PPI/pixel conversion.
 * Font size conversion (pt ↔ px) is handled by the caller (CanvasTextElement).
 */
import type { TextRun, TextStyle } from '../types';

/** Fabric.js per-character style map: { lineIndex: { charIndex: styleOverrides } } */
export type FabricStyleMap = Record<number, Record<number, Partial<TextStyle>>>;

/**
 * Convert font size from points to canvas pixels.
 * 1 pt = 1/72 inch. Canvas pixels = inches × PPI.
 */
export function ptToCanvasPx(pt: number, ppi: number): number {
    return (pt * ppi) / 72;
}

/**
 * Convert font size from canvas pixels back to points.
 */
export function canvasPxToPt(px: number, ppi: number): number {
    return (px * 72) / ppi;
}

/**
 * Convert a TextStyle (in pt) to Fabric-compatible style properties (in px).
 * Only converts fontSize; other properties pass through as-is.
 */
export function textStyleToPx(style: Required<TextStyle>, ppi: number): Required<TextStyle> {
    return {
        ...style,
        fontSize: ptToCanvasPx(style.fontSize, ppi),
    };
}

/**
 * Convert TextRun[] → plain text string + Fabric.js per-character style map.
 *
 * Only style properties that differ from `defaultStyle` are included in the output map,
 * since Fabric treats per-character styles as overrides over the Textbox defaults.
 */
export function runsToFabricStyles(
    runs: TextRun[],
    defaultStyle: Required<TextStyle>
): { text: string; styles: FabricStyleMap } {
    const fullText = runs.map(r => r.text).join('');
    const styles: FabricStyleMap = {};

    // Build a flat array of per-character style overrides
    const charStyles: (Partial<TextStyle> | undefined)[] = [];
    for (const run of runs) {
        const overrides = computeOverrides(run.style, defaultStyle);
        for (let i = 0; i < run.text.length; i++) {
            charStyles.push(overrides);
        }
    }

    // Map flat char index → (line, charInLine) using newline splits
    const lines = fullText.split('\n');
    let flatIndex = 0;

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const line = lines[lineIdx];
        for (let charIdx = 0; charIdx < line.length; charIdx++) {
            const style = charStyles[flatIndex];
            if (style && Object.keys(style).length > 0) {
                if (!styles[lineIdx]) styles[lineIdx] = {};
                styles[lineIdx][charIdx] = style;
            }
            flatIndex++;
        }
        flatIndex++; // skip the \n character itself
    }

    return { text: fullText, styles };
}

/**
 * Convert Fabric.js text + per-character styles → TextRun[].
 *
 * Merges consecutive characters with identical effective styles into a single run.
 * The output runs' styles only contain overrides vs. `defaultStyle`.
 */
export function fabricStylesToRuns(
    text: string,
    styles: FabricStyleMap,
    defaultStyle: Required<TextStyle>
): TextRun[] {
    if (text.length === 0) {
        return [{ text: '' }];
    }

    const runs: TextRun[] = [];
    const lines = text.split('\n');
    let currentRunText = '';
    let currentRunStyle: Partial<TextStyle> | undefined;

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        // Add newline separator between lines (not before first line)
        if (lineIdx > 0) {
            // The \n character inherits the style of the last character of the previous line
            currentRunText += '\n';
        }

        const line = lines[lineIdx];
        for (let charIdx = 0; charIdx < line.length; charIdx++) {
            const charStyle = styles[lineIdx]?.[charIdx];
            // Compute effective overrides vs default
            const overrides = computeOverrides(charStyle, defaultStyle);

            if (currentRunText.length === 0) {
                // First character
                currentRunStyle = overrides;
                currentRunText = line[charIdx];
            } else if (stylesEqual(currentRunStyle, overrides)) {
                // Same style as current run, append
                currentRunText += line[charIdx];
            } else {
                // Style changed — flush current run
                runs.push(buildRun(currentRunText, currentRunStyle));
                currentRunText = line[charIdx];
                currentRunStyle = overrides;
            }
        }
    }

    // Flush final run
    if (currentRunText.length > 0) {
        runs.push(buildRun(currentRunText, currentRunStyle));
    }

    return runs.length > 0 ? runs : [{ text: '' }];
}

/**
 * Compute which style fields differ from the default.
 * Returns only the fields that differ, or undefined if all match.
 */
export function computeOverrides(
    style: Partial<TextStyle> | undefined,
    defaultStyle: Required<TextStyle>
): Partial<TextStyle> | undefined {
    if (!style) return undefined;

    const overrides: Partial<TextStyle> = {};
    let hasOverride = false;

    const keys: (keyof TextStyle)[] = ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'fill', 'underline'];
    for (const key of keys) {
        if (style[key] !== undefined && style[key] !== defaultStyle[key]) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (overrides as any)[key] = style[key];
            hasOverride = true;
        }
    }

    return hasOverride ? overrides : undefined;
}

/** Compare two style override objects for equality. */
export function stylesEqual(
    a: Partial<TextStyle> | undefined,
    b: Partial<TextStyle> | undefined
): boolean {
    if (a === b) return true;
    if (!a && !b) return true;
    if (!a || !b) return false;

    const keys: (keyof TextStyle)[] = ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'fill', 'underline'];
    return keys.every(k => a[k] === b[k]);
}

/** Build a TextRun, omitting the style field if there are no overrides. */
export function buildRun(text: string, style: Partial<TextStyle> | undefined): TextRun {
    return style ? { text, style } : { text };
}

/** Build a TextRun with layout coordinates, omitting style/coords when not needed. */
export function buildLayoutRun(
    text: string,
    style: Partial<TextStyle> | undefined,
    x: number,
    baselineY: number
): TextRun {
    const run: TextRun = { text, x, baselineY };
    if (style) run.style = style;
    return run;
}

/**
 * Convert Fabric.js visual lines + per-character styles → TextRun[] with layout coordinates.
 *
 * Unlike `fabricStylesToRuns`, this function is **line-aware**: it splits runs at every
 * visual line boundary (including soft word-wrap breaks). Each resulting run represents
 * a contiguous, single-line text fragment with its position relative to the text box
 * origin (in whatever units the coordinate callbacks provide — typically pt).
 *
 * @param textLines         Fabric's `_textLines` — array of grapheme arrays, one per visual line.
 * @param styles            Fabric's per-character style map (lineIndex → charIndex → overrides).
 * @param defaultStyle      The element's base style (in the caller's unit, e.g. pt).
 * @param getRunX           Returns the x offset for a character (lineIndex, charIndex) in the caller's unit.
 * @param getBaselineY      Returns the baseline Y offset for a visual line in the caller's unit.
 */
export function fabricLinesToRuns(
    textLines: string[][],
    styles: FabricStyleMap,
    defaultStyle: Required<TextStyle>,
    getRunX: (lineIndex: number, charIndex: number) => number,
    getBaselineY: (lineIndex: number) => number,
): TextRun[] {
    if (textLines.length === 0) {
        return [{ text: '' }];
    }

    const runs: TextRun[] = [];

    for (let lineIdx = 0; lineIdx < textLines.length; lineIdx++) {
        const line = textLines[lineIdx];
        const baselineY = getBaselineY(lineIdx);

        let currentRunText = '';
        let currentRunStyle: Partial<TextStyle> | undefined;
        let currentRunStartChar = 0;

        for (let charIdx = 0; charIdx < line.length; charIdx++) {
            const charStyle = styles[lineIdx]?.[charIdx];
            const overrides = computeOverrides(charStyle, defaultStyle);

            if (currentRunText.length === 0) {
                // First character on this line
                currentRunStyle = overrides;
                currentRunText = line[charIdx];
                currentRunStartChar = charIdx;
            } else if (stylesEqual(currentRunStyle, overrides)) {
                // Same style — extend run
                currentRunText += line[charIdx];
            } else {
                // Style changed — flush current run
                const x = getRunX(lineIdx, currentRunStartChar);
                runs.push(buildLayoutRun(currentRunText, currentRunStyle, x, baselineY));
                currentRunText = line[charIdx];
                currentRunStyle = overrides;
                currentRunStartChar = charIdx;
            }
        }

        // Flush remaining run for this line (even if empty — preserves empty lines)
        if (currentRunText.length > 0) {
            const x = getRunX(lineIdx, currentRunStartChar);
            runs.push(buildLayoutRun(currentRunText, currentRunStyle, x, baselineY));
        } else {
            // Empty visual line — still record it so the offscreen renderer can account for blank lines
            const x = getRunX(lineIdx, 0);
            runs.push(buildLayoutRun('', undefined, x, baselineY));
        }
    }

    return runs.length > 0 ? runs : [{ text: '' }];
}

