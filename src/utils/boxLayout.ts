import type { NormalizedRect } from '../types';
import { type ObjectGeometry, getFrameFromObjectGeometry } from './rotatedBounds';

export interface BoxPixels {
    left: number;
    top: number;
    width: number;
    height: number;
}

/**
 * Converts a pixel-space box into normalized coordinates.
 * If `activeCorner` is provided, applies anchor locking semantics
 * so the opposite edge remains stable during resize gestures.
 */
export function computeNormalizedBoxFromPixels(
    oldBox: NormalizedRect,
    boxPx: BoxPixels,
    canvasWidth: number,
    canvasHeight: number,
    activeCorner: string = ''
): NormalizedRect {
    const left = boxPx.left;
    const top = boxPx.top;
    const right = left + boxPx.width;
    const bottom = top + boxPx.height;

    const newX1 = left / canvasWidth;
    const newY1 = top / canvasHeight;
    const newX2 = right / canvasWidth;
    const newY2 = bottom / canvasHeight;

    const nextBox: NormalizedRect = { ...oldBox };
    const isResizing = activeCorner !== '';

    if (isResizing) {
        if (activeCorner.includes('r')) {
            nextBox.x1 = oldBox.x1;
            nextBox.x2 = newX2;
        }
        if (activeCorner.includes('l')) {
            nextBox.x2 = oldBox.x2;
            nextBox.x1 = newX1;
        }
        if (activeCorner.includes('b')) {
            nextBox.y1 = oldBox.y1;
            nextBox.y2 = newY2;
        }
        if (activeCorner.includes('t')) {
            nextBox.y2 = oldBox.y2;
            nextBox.y1 = newY1;
        }
    } else {
        nextBox.x1 = newX1;
        nextBox.y1 = newY1;
        nextBox.x2 = newX2;
        nextBox.y2 = newY2;
    }

    return nextBox;
}

export function createNormalizedBoxFromPixels(
    boxPx: BoxPixels,
    canvasWidth: number,
    canvasHeight: number
): NormalizedRect {
    const left = boxPx.left;
    const top = boxPx.top;
    const right = left + boxPx.width;
    const bottom = top + boxPx.height;

    return {
        x1: left / canvasWidth,
        y1: top / canvasHeight,
        x2: right / canvasWidth,
        y2: bottom / canvasHeight,
    };
}

export function computeNormalizedBoxFromObjectGeometry(
    geometry: ObjectGeometry,
    canvasWidth: number,
    canvasHeight: number
): NormalizedRect {
    const frame = getFrameFromObjectGeometry(geometry);
    return createNormalizedBoxFromPixels(
        {
            left: frame.left,
            top: frame.top,
            width: frame.width,
            height: frame.height,
        },
        canvasWidth,
        canvasHeight
    );
}
