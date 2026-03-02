import * as fabric from 'fabric';
import { PageElement, TextContent } from '../types';

export class CanvasTextElement extends fabric.FabricObject {
    public pageElement: PageElement;
    public ppi: number;

    constructor(
        element: PageElement,
        ppi: number,
        options: Partial<fabric.FabricObjectProps> & {
            interactive?: boolean;
            opacity?: number;
        } = {}
    ) {
        super({
            ...options,
            originX: 'left',
            originY: 'top',
            // @ts-expect-error - data is available on FabricObject
            data: { id: element.id },
            selectable: options.interactive !== false,
            evented: options.interactive !== false,
            opacity: options.opacity ?? 1,
            // Disable native Fabric text editing features
            interactive: false,
            objectCaching: false, // Ensure no clipping on manual renders
        });

        this.pageElement = element;
        this.ppi = ppi;

        // Note: applyLayout will set width/height from the box
        if (options.interactive !== false) {
            this.updateControlVisibility();
        }
    }

    /**
     * Position and size this object based on the normalized box model.
     */
    applyLayout(canvasWidth: number = this.canvas?.width || 1, canvasHeight: number = this.canvas?.height || 1) {
        const box = this.pageElement.box;
        const targetLeft = box.x1 * canvasWidth;
        const targetTop = box.y1 * canvasHeight;
        const width = (box.x2 - box.x1) * canvasWidth;
        const height = (box.y2 - box.y1) * canvasHeight;

        this.set({
            left: targetLeft,
            top: targetTop,
            width: width,
            height: height,
        });

        this.setCoords();
    }

    /**
     * Read the pixel coordinates and save them back to the normalized box model.
     */
    updateLayoutFromPixels(
        canvasWidth: number = this.canvas?.width || 1,
        canvasHeight: number = this.canvas?.height || 1
    ) {
        const box = this.pageElement.box;

        const left = this.left ?? 0;
        const top = this.top ?? 0;
        const width = this.getScaledWidth();
        const height = this.getScaledHeight();

        this.pageElement.box = {
            ...box,
            x1: left / canvasWidth,
            y1: top / canvasHeight,
            x2: (left + width) / canvasWidth,
            y2: (top + height) / canvasHeight,
        };
    }

    /**
     * Manual render implementation for text runs.
     * Bypasses Fabric's IText logic completely for pixel-perfect DOM alignment.
     */
    _render(ctx: CanvasRenderingContext2D) {
        const content = this.pageElement.content as TextContent;
        if (!content || !content.runs) return;

        const pxPerPt = this.ppi / 72;
        const w = this.width || 0;
        const h = this.height || 0;

        ctx.save();
        // Fabric transforms ctx so 0,0 is the center. 
        // We translate to top-left to use box-relative run coordinates.
        ctx.translate(-w / 2, -h / 2);
        // Keep all text paint inside the text box bounds.
        ctx.beginPath();
        ctx.rect(0, 0, w, h);
        ctx.clip();

        const hasRenderableText = content.runs.some((run) => {
            const text = run.text ?? '';
            return text.replace(/\n/g, '').length > 0;
        });

        if (!hasRenderableText && content.placeholderText) {
            const style = content.defaultStyle;
            const fontSizePx = style.fontSize * pxPerPt;
            const paddingPx = 8 * pxPerPt;

            ctx.font = `${style.fontStyle || 'normal'} ${style.fontWeight || 'normal'} ${fontSizePx}px ${style.fontFamily}`;
            ctx.fillStyle = 'rgba(148, 163, 184, 0.9)';
            ctx.textBaseline = 'alphabetic';
            const metrics = ctx.measureText(content.placeholderText);
            const ascent = metrics.actualBoundingBoxAscent || fontSizePx * 0.8;
            const descent = metrics.actualBoundingBoxDescent || fontSizePx * 0.2;
            const verticalAlign = content.placeholderVerticalAlign ?? 'top';
            const baselineY = verticalAlign === 'center'
                ? (h + ascent - descent) / 2
                : verticalAlign === 'bottom'
                    ? Math.max(ascent, h - paddingPx - descent)
                    : Math.min(h - paddingPx - descent, ascent + paddingPx);

            if (content.textAlign === 'center') {
                ctx.textAlign = 'center';
                ctx.fillText(content.placeholderText, w / 2, baselineY);
            } else if (content.textAlign === 'right') {
                ctx.textAlign = 'right';
                ctx.fillText(content.placeholderText, Math.max(0, w - paddingPx), baselineY);
            } else {
                ctx.textAlign = 'left';
                ctx.fillText(content.placeholderText, paddingPx, baselineY);
            }

            ctx.restore();
            return;
        }

        ctx.textBaseline = 'alphabetic';

        for (const run of content.runs) {
            if (!run.text || run.text === '\n') continue;

            const style = { ...content.defaultStyle, ...run.style };
            const fontSizePx = style.fontSize * pxPerPt;

            ctx.font = `${style.fontStyle || 'normal'} ${style.fontWeight || 'normal'} ${fontSizePx}px ${style.fontFamily}`;
            ctx.fillStyle = style.fill;

            const x = (run.x ?? 0) * pxPerPt;
            const y = (run.baselineY ?? 0) * pxPerPt;

            ctx.fillText(run.text, x, y);

            if (style.underline) {
                const textWidth = ctx.measureText(run.text).width;
                const underlineThickness = Math.max(1, fontSizePx * 0.05);
                const underlineY = y + fontSizePx * 0.1;
                ctx.fillRect(x, underlineY, textWidth, underlineThickness);
            }
        }

        ctx.restore();
    }

    /**
     * No-op but kept for architectural compatibility with Phase 1/2 logic.
     */
    syncFromRuns() {
        // We don't need to do anything here because _render pulls directly from pageElement.content
        this.dirty = true;
        this.canvas?.requestRenderAll();
    }

    updateControlVisibility() {
        this.setControlsVisibility({
            bl: false,
            br: false,
            tl: false,
            tr: false,
            mb: false,
            mt: false,
            ml: false,
            mr: false,
            mtr: false,
        });
    }
}
