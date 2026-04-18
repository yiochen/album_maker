import { APP_CONFIG } from '../config';
import type {
    ShapeBorder,
    ShapeCommand,
    ShapeContent,
    ShapeSubpath,
} from '../types';

const DEFAULT_SHAPE_BORDER: ShapeBorder = {
    widthPt: 0,
    color: '#000000',
};

export const DEFAULT_SHAPE_FILL = '#9ca3af';
export const DEFAULT_SHAPE_FILL_RULE: NonNullable<ShapeContent['fillRule']> = 'nonzero';

function clampUnit(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(1, value));
}

export function getShapeBorder(content: ShapeContent): ShapeBorder {
    const widthPt = Math.min(72, Math.max(0, content.border?.widthPt ?? DEFAULT_SHAPE_BORDER.widthPt));
    const color = content.border?.color ?? DEFAULT_SHAPE_BORDER.color;
    return { widthPt, color };
}

export function ptToPx(pt: number, ppi: number = APP_CONFIG.PPI): number {
    return (pt * ppi) / 72;
}

export function borderPtToCanvasPx(pt: number): number {
    return ptToPx(pt, APP_CONFIG.SCREEN_PPI);
}

export function normalizeShapeCommand(command: ShapeCommand): ShapeCommand {
    switch (command.op) {
        case 'moveTo':
        case 'lineTo':
            return {
                op: command.op,
                x: clampUnit(command.x),
                y: clampUnit(command.y),
            };
        case 'curveTo':
            return {
                op: 'curveTo',
                c1x: clampUnit(command.c1x),
                c1y: clampUnit(command.c1y),
                c2x: clampUnit(command.c2x),
                c2y: clampUnit(command.c2y),
                x: clampUnit(command.x),
                y: clampUnit(command.y),
            };
        case 'ellipse':
            return {
                op: 'ellipse',
                cx: clampUnit(command.cx),
                cy: clampUnit(command.cy),
                rx: clampUnit(command.rx),
                ry: clampUnit(command.ry),
            };
        case 'closePath':
            return { op: 'closePath' };
    }
}

export function normalizeShapeSubpath(subpath: ShapeSubpath): ShapeSubpath {
    return {
        closed: subpath.closed,
        commands: subpath.commands.map(normalizeShapeCommand),
    };
}

export function normalizeShapeContent(content: ShapeContent): ShapeContent {
    return {
        subpaths: content.subpaths.map(normalizeShapeSubpath),
        fill: content.fill,
        fillRule: content.fillRule ?? DEFAULT_SHAPE_FILL_RULE,
        border: getShapeBorder(content),
    };
}

type ShapePathRect = {
    left: number;
    top: number;
    width: number;
    height: number;
};

type ShapeTraceContext = {
    moveTo: (x: number, y: number) => void;
    lineTo: (x: number, y: number) => void;
    bezierCurveTo: (cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number) => void;
    ellipse: (
        x: number,
        y: number,
        radiusX: number,
        radiusY: number,
        rotation: number,
        startAngle: number,
        endAngle: number,
    ) => void;
    closePath: () => void;
};

export function traceShapeSubpaths(
    ctx: ShapeTraceContext,
    subpaths: ShapeSubpath[],
    rect: ShapePathRect,
) {
    const mapX = (x: number) => rect.left + clampUnit(x) * rect.width;
    const mapY = (y: number) => rect.top + clampUnit(y) * rect.height;

    for (const rawSubpath of subpaths) {
        const subpath = normalizeShapeSubpath(rawSubpath);
        for (const command of subpath.commands) {
            switch (command.op) {
                case 'moveTo':
                    ctx.moveTo(mapX(command.x), mapY(command.y));
                    break;
                case 'lineTo':
                    ctx.lineTo(mapX(command.x), mapY(command.y));
                    break;
                case 'curveTo':
                    ctx.bezierCurveTo(
                        mapX(command.c1x),
                        mapY(command.c1y),
                        mapX(command.c2x),
                        mapY(command.c2y),
                        mapX(command.x),
                        mapY(command.y),
                    );
                    break;
                case 'ellipse':
                    ctx.ellipse(
                        mapX(command.cx),
                        mapY(command.cy),
                        Math.abs(command.rx) * rect.width,
                        Math.abs(command.ry) * rect.height,
                        0,
                        0,
                        Math.PI * 2,
                    );
                    break;
                case 'closePath':
                    ctx.closePath();
                    break;
            }
        }

        if (subpath.closed) {
            ctx.closePath();
        }
    }
}

export function getCanvasFillRule(fillRule: ShapeContent['fillRule']): CanvasFillRule {
    return fillRule === 'evenodd' ? 'evenodd' : 'nonzero';
}
