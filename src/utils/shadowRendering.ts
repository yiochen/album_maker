import { resolveElementShadow, type ResolvedElementShadow } from './shadowPresets';

export interface ElementShadowContext {
    shadowColor: string;
    shadowBlur: number;
    shadowOffsetX: number;
    shadowOffsetY: number;
    fillStyle: string | object;
    save(): void;
    restore(): void;
    beginPath(): void;
    rect(x: number, y: number, width: number, height: number): void;
    clip(fillRule?: CanvasFillRule): void;
    fillRect(x: number, y: number, width: number, height: number): void;
}

export function applyElementShadowToContext(
    ctx: ElementShadowContext,
    shadow: ResolvedElementShadow,
): void {
    ctx.shadowColor = shadow.colorWithOpacity;
    ctx.shadowBlur = shadow.blurPx;
    ctx.shadowOffsetX = shadow.offsetXPx;
    ctx.shadowOffsetY = shadow.offsetYPx;
}

/**
 * Draws only the outside shadow of a rectangular frame. The even-odd clip removes
 * the opaque source rectangle while preserving the shadow beyond the frame.
 */
export function renderRectElementShadow(
    ctx: ElementShadowContext,
    presetId: string | undefined,
    rect: { left: number; top: number; width: number; height: number },
    ppi: number,
): void {
    const shadow = resolveElementShadow(presetId, ppi);
    if (!shadow || rect.width <= 0 || rect.height <= 0) return;

    const padding = shadow.blurPx * 3
        + Math.max(Math.abs(shadow.offsetXPx), Math.abs(shadow.offsetYPx))
        + 2;

    ctx.save();
    ctx.beginPath();
    ctx.rect(
        rect.left - padding,
        rect.top - padding,
        rect.width + padding * 2,
        rect.height + padding * 2,
    );
    ctx.rect(rect.left, rect.top, rect.width, rect.height);
    ctx.clip('evenodd');
    applyElementShadowToContext(ctx, shadow);
    ctx.fillStyle = '#000000';
    ctx.fillRect(rect.left, rect.top, rect.width, rect.height);
    ctx.restore();
}
