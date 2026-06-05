export interface Point {
    x: number;
    y: number;
}

export interface RotatedRectFrame {
    left: number;
    top: number;
    width: number;
    height: number;
    angle: number;
}

export interface ObjectGeometry {
    left: number;
    top: number;
    width: number;
    height: number;
    angle: number;
}

export interface RotatedRectBounds {
    left: number;
    right: number;
    top: number;
    bottom: number;
    centerX: number;
    centerY: number;
}

export type SnapBoundary = 'left' | 'right' | 'top' | 'bottom' | 'centerX' | 'centerY';

export function normalizeRotation(angle: number): number {
    if (!Number.isFinite(angle)) return 0;
    const normalized = angle % 360;
    return Object.is(normalized, -0) ? 0 : normalized;
}

export function getRectCenter(frame: Omit<RotatedRectFrame, 'angle'> | RotatedRectFrame): Point {
    return {
        x: frame.left + frame.width / 2,
        y: frame.top + frame.height / 2,
    };
}

function rotateOffset(x: number, y: number, angle: number): Point {
    const radians = (normalizeRotation(angle) * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    return {
        x: x * cos - y * sin,
        y: x * sin + y * cos,
    };
}

export function getObjectPositionForFrame(frame: RotatedRectFrame): Point {
    const center = getRectCenter(frame);
    const rotatedOffset = rotateOffset(-frame.width / 2, -frame.height / 2, frame.angle);
    return {
        x: center.x + rotatedOffset.x,
        y: center.y + rotatedOffset.y,
    };
}

export function getFrameFromObjectGeometry(geometry: ObjectGeometry): RotatedRectFrame {
    const centerOffset = rotateOffset(geometry.width / 2, geometry.height / 2, geometry.angle);
    const centerX = geometry.left + centerOffset.x;
    const centerY = geometry.top + centerOffset.y;
    return {
        left: centerX - geometry.width / 2,
        top: centerY - geometry.height / 2,
        width: geometry.width,
        height: geometry.height,
        angle: normalizeRotation(geometry.angle),
    };
}

export function getRotatedRectCorners(frame: RotatedRectFrame): Point[] {
    const { width, height } = frame;
    const { x: centerX, y: centerY } = getRectCenter(frame);
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const radians = (normalizeRotation(frame.angle) * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);

    const localCorners: Point[] = [
        { x: -halfWidth, y: -halfHeight },
        { x: halfWidth, y: -halfHeight },
        { x: halfWidth, y: halfHeight },
        { x: -halfWidth, y: halfHeight },
    ];

    return localCorners.map(({ x, y }) => ({
        x: centerX + x * cos - y * sin,
        y: centerY + x * sin + y * cos,
    }));
}

export function getRotatedRectBounds(frame: RotatedRectFrame): RotatedRectBounds {
    const corners = getRotatedRectCorners(frame);
    const xs = corners.map(point => point.x);
    const ys = corners.map(point => point.y);
    const { x: centerX, y: centerY } = getRectCenter(frame);

    return {
        left: Math.min(...xs),
        right: Math.max(...xs),
        top: Math.min(...ys),
        bottom: Math.max(...ys),
        centerX,
        centerY,
    };
}

export function getRotatedRectSnapDelta(
    frame: RotatedRectFrame,
    boundary: SnapBoundary,
    targetPosition: number
): { dx: number; dy: number } {
    const bounds = getRotatedRectBounds(frame);

    switch (boundary) {
        case 'left':
            return { dx: targetPosition - bounds.left, dy: 0 };
        case 'right':
            return { dx: targetPosition - bounds.right, dy: 0 };
        case 'centerX':
            return { dx: targetPosition - bounds.centerX, dy: 0 };
        case 'top':
            return { dx: 0, dy: targetPosition - bounds.top };
        case 'bottom':
            return { dx: 0, dy: targetPosition - bounds.bottom };
        case 'centerY':
            return { dx: 0, dy: targetPosition - bounds.centerY };
        default:
            return { dx: 0, dy: 0 };
    }
}
