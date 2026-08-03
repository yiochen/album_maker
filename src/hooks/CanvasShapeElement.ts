import * as fabric from 'fabric';
import type { ShapeContent, ShapePageElement } from '../types';
import { computeNormalizedBoxFromObjectGeometry } from '../utils/boxLayout';
import {
    borderPtToCanvasPx,
    getCanvasFillRule,
    getShapeBorder,
    normalizeShapeContent,
    traceShapeSubpaths,
} from '../utils/shapeUtils';
import { getObjectPositionForFrame, normalizeRotation } from '../utils/rotatedBounds';
import { APP_CONFIG } from '../config';
import { resolveElementShadow } from '../utils/shadowPresets';

export class CanvasShapeElement extends fabric.FabricObject {
    public pageElement: ShapePageElement;
    public data?: { id: string };

    constructor(
        element: ShapePageElement,
        options: Partial<fabric.FabricObjectProps> & {
            interactive?: boolean;
            opacity?: number;
            uniformScaling?: boolean;
        } = {}
    ) {
        super({
            ...options,
            originX: 'left',
            originY: 'top',
            centeredRotation: true,
            // @ts-expect-error - data is available on FabricObject
            data: { id: element.id },
            selectable: options.interactive !== false,
            evented: options.interactive !== false,
            opacity: options.opacity ?? 1,
            uniformScaling: false,
            objectCaching: false,
        });

        this.pageElement = {
            ...element,
            content: normalizeShapeContent(element.content),
        };
        this.data = { id: element.id };

        if (options.interactive !== false) {
            this.updateControlVisibility();
        }
    }

    applyLayout(canvasWidth: number = this.canvas?.width || 1, canvasHeight: number = this.canvas?.height || 1) {
        const box = this.pageElement.box;
        const width = (box.x2 - box.x1) * canvasWidth;
        const height = (box.y2 - box.y1) * canvasHeight;
        const objectPosition = getObjectPositionForFrame({
            left: box.x1 * canvasWidth,
            top: box.y1 * canvasHeight,
            width,
            height,
            angle: this.pageElement.rotation ?? 0,
        });
        this.set({
            left: objectPosition.x,
            top: objectPosition.y,
            width,
            height,
            scaleX: 1,
            scaleY: 1,
            angle: normalizeRotation(this.pageElement.rotation ?? 0),
            centeredRotation: true,
        });

        this.setCoords();
    }

    updateLayoutFromPixels(
        canvasWidth: number = this.canvas?.width || 1,
        canvasHeight: number = this.canvas?.height || 1
    ) {
        const width = (this.width ?? 0) * (this.scaleX ?? 1);
        const height = (this.height ?? 0) * (this.scaleY ?? 1);
        this.pageElement.box = computeNormalizedBoxFromObjectGeometry({
            left: this.left ?? 0,
            top: this.top ?? 0,
            width,
            height,
            angle: this.angle ?? 0,
        }, canvasWidth, canvasHeight);
        this.pageElement.rotation = normalizeRotation(this.angle ?? 0);
    }

    _render(ctx: CanvasRenderingContext2D) {
        const content = normalizeShapeContent(this.pageElement.content as ShapeContent);
        const width = this.width || 0;
        const height = this.height || 0;
        if (width <= 0 || height <= 0) return;

        const border = getShapeBorder(content);
        const shadow = resolveElementShadow(this.pageElement.shadowPreset, APP_CONFIG.SCREEN_PPI);

        ctx.save();
        ctx.translate(-width / 2, -height / 2);
        ctx.beginPath();
        traceShapeSubpaths(ctx, content.subpaths, {
            left: 0,
            top: 0,
            width,
            height,
        });

        if (shadow && (content.fill || border.widthPt > 0)) {
            ctx.save();
            ctx.shadowColor = shadow.colorWithOpacity;
            ctx.shadowBlur = shadow.blurPx;
            ctx.shadowOffsetX = shadow.offsetXPx;
            ctx.shadowOffsetY = shadow.offsetYPx;
            if (border.widthPt > 0) {
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = borderPtToCanvasPx(border.widthPt);
                ctx.stroke();
            } else {
                ctx.fillStyle = '#000000';
                ctx.fill(getCanvasFillRule(content.fillRule));
            }
            ctx.restore();
        }

        if (content.fill) {
            ctx.fillStyle = content.fill;
            ctx.fill(getCanvasFillRule(content.fillRule));
        }

        if (border.widthPt > 0) {
            ctx.strokeStyle = border.color;
            ctx.lineWidth = borderPtToCanvasPx(border.widthPt);
            ctx.stroke();
        }

        ctx.restore();
    }

    updateControlVisibility() {
        this.setControlsVisibility({
            bl: true,
            br: true,
            tl: true,
            tr: true,
            mb: true,
            mt: true,
            ml: true,
            mr: true,
            mtr: true,
        });
    }
}
