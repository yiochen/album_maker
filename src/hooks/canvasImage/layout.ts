import type { ImageContent } from '../../types';
import { calculateGaplessRect, applyCoverTransform } from '../../utils/imageUtils';
import { IDENTITY, decomposeForRendering, getOrientedDimensions } from '../../utils/orientationMatrix';

export function computeFrameRect(box: { x1: number; y1: number; x2: number; y2: number }, canvasWidth: number, canvasHeight: number) {
    return calculateGaplessRect(box, canvasWidth, canvasHeight);
}

export function computeCoverPlacement(
    frameWidth: number,
    frameHeight: number,
    imageWidth: number,
    imageHeight: number,
    contentTransform: ImageContent['contentTransform'] | undefined,
) {
    const transform = {
        zoom: 1,
        panX: 0.5,
        panY: 0.5,
        ...(contentTransform || {}),
    };
    const orientation = transform.orientation ?? IDENTITY;
    const oriented = getOrientedDimensions(imageWidth, imageHeight, orientation);
    const cover = applyCoverTransform(frameWidth, frameHeight, oriented.width, oriented.height, transform);
    const decomposition = decomposeForRendering(orientation);
    return { transform, cover, decomposition };
}

