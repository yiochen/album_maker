import type { OrientationMatrix } from '../../utils/orientationMatrix';
import { IDENTITY, getOrientedDimensions } from '../../utils/orientationMatrix';

export function computeEffectivePrintPpi({
    sourceWidth,
    sourceHeight,
    frameWidthPx,
    frameHeightPx,
    zoom = 1,
    orientation = IDENTITY,
    screenPpi,
}: {
    sourceWidth?: number;
    sourceHeight?: number;
    frameWidthPx: number;
    frameHeightPx: number;
    zoom?: number;
    orientation?: OrientationMatrix;
    screenPpi: number;
}): number | null {
    if (!sourceWidth || !sourceHeight || sourceWidth <= 0 || sourceHeight <= 0) return null;
    if (frameWidthPx <= 0 || frameHeightPx <= 0) return null;

    const safeZoom = Math.max(0.01, zoom);
    const oriented = getOrientedDimensions(sourceWidth, sourceHeight, orientation);
    const frameWidthInches = frameWidthPx / screenPpi;
    const frameHeightInches = frameHeightPx / screenPpi;
    const ppiX = oriented.width / frameWidthInches;
    const ppiY = oriented.height / frameHeightInches;
    return Math.min(ppiX, ppiY) / safeZoom;
}

export function isFrameTooSmallForBadge(frameWidthScreenPx: number, frameHeightScreenPx: number): boolean {
    return frameWidthScreenPx < 38 || frameHeightScreenPx < 24;
}

