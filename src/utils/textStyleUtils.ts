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
function computeOverrides(
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
function stylesEqual(
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
function buildRun(text: string, style: Partial<TextStyle> | undefined): TextRun {
    return style ? { text, style } : { text };
}
