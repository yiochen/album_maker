/**
 * CanvasTextElement - Fabric.js Textbox subclass for rendering text elements on the canvas.
 *
 * Extends fabric.Textbox directly. Handles:
 * - Box model ↔ pixel positioning (same normalized float system as CanvasImageElement)
 * - TextRun[] ↔ Fabric per-character style synchronization
 * - Font size pt → px conversion using PPI
 * - Text spills beyond box height (no vertical clipping)
 */
import * as fabric from 'fabric';
import type { PageElement, TextContent, TextStyle } from '../types';
import { runsToFabricStyles, fabricStylesToRuns } from '../utils/textStyleUtils';
import { calculateGaplessRect } from '../utils/imageUtils';

/**
 * Convert font size from points to canvas pixels.
 * 1 pt = 1/72 inch. Canvas pixels = inches × PPI.
 */
function ptToCanvasPx(pt: number, ppi: number): number {
    return pt * ppi / 72;
}

/**
 * Convert font size from canvas pixels back to points.
 */
function canvasPxToPt(px: number, ppi: number): number {
    return px * 72 / ppi;
}

/**
 * Convert a TextStyle (in pt) to Fabric-compatible style properties (in px).
 * Only converts fontSize; other properties pass through as-is.
 */
function textStyleToPx(style: Required<TextStyle>, ppi: number): Required<TextStyle> {
    return {
        ...style,
        fontSize: ptToCanvasPx(style.fontSize, ppi),
    };
}

export class CanvasTextElement extends fabric.Textbox {
    public pageElement: PageElement;
    private ppi: number;

    constructor(
        element: PageElement,
        ppi: number,
        options: Partial<fabric.FabricObjectProps> & {
            interactive?: boolean;
        } = {}
    ) {
        const textContent = element.content as TextContent;

        // Convert default style from pt → px for Fabric
        const defaultStylePx = textStyleToPx(textContent.defaultStyle, ppi);

        // Convert runs to Fabric format
        const { text, styles } = runsToFabricStyles(textContent.runs, textContent.defaultStyle);

        // Convert per-character fontSize overrides from pt → px
        const convertedStyles = convertStylesFontSize(styles, ppi, ptToCanvasPx);

        super(text, {
            ...options,
            originX: 'left',
            originY: 'top',
            // @ts-expect-error - data is available on FabricObject but missing in TextboxProps
            data: { id: element.id },
            fontFamily: defaultStylePx.fontFamily,
            fontSize: defaultStylePx.fontSize,
            fontWeight: defaultStylePx.fontWeight,
            fontStyle: defaultStylePx.fontStyle,
            fill: defaultStylePx.fill,
            underline: defaultStylePx.underline,
            textAlign: textContent.textAlign,
            lineHeight: textContent.lineHeight,
            styles: convertedStyles,
            lockRotation: true,
            splitByGrapheme: false,
            // Text elements are always freely resizable (no aspect lock)
            uniformScaling: false,
            lockUniScaling: false,
            selectable: options.interactive !== false,
            evented: options.interactive !== false,
        });

        this.pageElement = element;
        this.ppi = ppi;

        if (options.interactive !== false) {
            this.updateControlVisibility();
        }
    }

    /**
     * Position and size this textbox based on the normalized box model.
     * Width is set to constrain word wrapping. Height is not constrained (text spills).
     */
    applyLayout(canvasWidth: number = this.canvas?.width || 1, canvasHeight: number = this.canvas?.height || 1) {
        const rect = calculateGaplessRect(this.pageElement.box, canvasWidth, canvasHeight);

        this.set({
            left: rect.left,
            top: rect.top,
            width: rect.width,
            // Don't set height — Fabric.Textbox auto-sizes height based on content.
            // Text that exceeds the intended height will spill below.
            scaleX: 1,
            scaleY: 1,
        });

        this.setCoords();
    }

    /**
     * Reverse: convert current pixel dimensions back to normalized box coordinates.
     * For text, we update the box based on the actual Fabric position/size.
     */
    updateLayoutFromPixels(
        activeCorner: string = '',
        canvasWidth: number = this.canvas?.width || 1,
        canvasHeight: number = this.canvas?.height || 1
    ) {
        const left = this.left;
        const top = this.top;
        const width = this.width * this.scaleX;
        const height = this.height * this.scaleY;
        const right = left + width;
        const bottom = top + height;

        const newX1 = left / canvasWidth;
        const newY1 = top / canvasHeight;
        const newX2 = right / canvasWidth;
        const newY2 = bottom / canvasHeight;

        const oldBox = this.pageElement.box;
        const newBox = { ...oldBox };

        const isResizing = activeCorner !== '';

        if (isResizing) {
            if (activeCorner.includes('r')) {
                newBox.x1 = oldBox.x1;
                newBox.x2 = newX2;
            }
            if (activeCorner.includes('l')) {
                newBox.x2 = oldBox.x2;
                newBox.x1 = newX1;
            }
            if (activeCorner.includes('b')) {
                newBox.y1 = oldBox.y1;
                newBox.y2 = newY2;
            }
            if (activeCorner.includes('t')) {
                newBox.y2 = oldBox.y2;
                newBox.y1 = newY1;
            }
        } else {
            newBox.x1 = newX1;
            newBox.y1 = newY1;
            newBox.x2 = newX2;
            newBox.y2 = newY2;
        }

        this.pageElement.box = newBox;
    }

    /**
     * Read current Fabric text + styles and convert back to TextRun[].
     * Font sizes are converted from px → pt for persistence.
     */
    syncToRuns(): TextContent {
        const textContent = this.pageElement.content as TextContent;

        // Convert Fabric styles (px font sizes) → pt
        const stylesInPt = convertStylesFontSize(
            this.styles as Record<number, Record<number, Partial<TextStyle>>>,
            this.ppi,
            canvasPxToPt
        );

        const runs = fabricStylesToRuns(this.text, stylesInPt, textContent.defaultStyle);

        return {
            ...textContent,
            runs,
            textAlign: this.textAlign as TextContent['textAlign'],
        };
    }

    /**
     * Update Fabric text and styles from TextRun[] data.
     * Called during React→Fabric sync when the element data changes.
     */
    syncFromRuns(content: TextContent) {
        const defaultStylePx = textStyleToPx(content.defaultStyle, this.ppi);
        const { text, styles } = runsToFabricStyles(content.runs, content.defaultStyle);
        const convertedStyles = convertStylesFontSize(styles, this.ppi, ptToCanvasPx);

        this.set({
            text,
            styles: convertedStyles,
            fontFamily: defaultStylePx.fontFamily,
            fontSize: defaultStylePx.fontSize,
            fontWeight: defaultStylePx.fontWeight,
            fontStyle: defaultStylePx.fontStyle,
            fill: defaultStylePx.fill,
            underline: defaultStylePx.underline,
            textAlign: content.textAlign,
            lineHeight: content.lineHeight,
        });
    }

    /**
     * Shows all resize handles for text (no aspect ratio lock).
     * Hides rotation handle.
     */
    updateControlVisibility() {
        this.setControlsVisibility({
            mt: true,
            mb: true,
            ml: true,
            mr: true,
            tl: true,
            tr: true,
            bl: true,
            br: true,
            mtr: false,
        });
    }
}

/**
 * Deep-clone a Fabric style map and convert all fontSize values using the given converter.
 */
function convertStylesFontSize(
    styles: Record<number, Record<number, Partial<TextStyle>>>,
    ppi: number,
    converter: (size: number, ppi: number) => number
): Record<number, Record<number, Partial<TextStyle>>> {
    const result: Record<number, Record<number, Partial<TextStyle>>> = {};
    for (const lineIdx of Object.keys(styles)) {
        const lineNum = Number(lineIdx);
        result[lineNum] = {};
        for (const charIdx of Object.keys(styles[lineNum])) {
            const charNum = Number(charIdx);
            const charStyle = { ...styles[lineNum][charNum] };
            if (charStyle.fontSize !== undefined) {
                charStyle.fontSize = converter(charStyle.fontSize, ppi);
            }
            result[lineNum][charNum] = charStyle;
        }
    }
    return result;
}
