import { APP_CONFIG } from '../config';
import type { Unit, PageElement, ImageContent } from '../types';
import { applyCoverTransform } from './imageUtils';

/**
 * Converts pixels to the specified unit (inch or cm).
 * @param px - The value in pixels.
 * @param unit - The target unit ('inch' or 'cm').
 * @param ppi - The pixels per inch resolution (default from config).
 * @returns The value in the target unit.
 */
export const pxToUnit = (px: number, unit: Unit, ppi: number = APP_CONFIG.PPI): number => {
    const inches = px / ppi;
    if (unit === 'cm') {
        return inches * 2.54;
    }
    return inches;
};

/**
 * Converts a value in the specified unit to pixels.
 * @param unitVal - The value in the source unit.
 * @param unit - The source unit ('inch' or 'cm').
 * @param ppi - The pixels per inch resolution (default from config).
 * @returns The value in pixels.
 */
export const unitToPx = (unitVal: number, unit: Unit, ppi: number = APP_CONFIG.PPI): number => {
    let inches = unitVal;
    if (unit === 'cm') {
        inches = unitVal / 2.54;
    }
    return inches * ppi;
};

/**
 * Calculates the new box position after an X or Y change.
 * @param axis - The axis to update ('x' or 'y').
 * @param value - The new value in the current unit (as string).
 * @param currentBox - The current element box.
 * @param spreadWidth - The total width of the spread in pixels.
 * @param spreadHeight - The total height of the spread in pixels.
 * @param unit - The current unit setting.
 * @param ppi - The PPI setting.
 * @returns The updated box object.
 */
export const calculateNewBoxPosition = (
    axis: 'x' | 'y',
    value: string,
    currentBox: PageElement['box'],
    spreadWidth: number,
    spreadHeight: number,
    unit: Unit,
    ppi: number = APP_CONFIG.PPI
): PageElement['box'] => {
    const numValue = parseFloat(value) || 0;
    const pxValue = unitToPx(numValue, unit, ppi);

    const newBox = { ...currentBox };
    if (axis === 'x') {
        const width = newBox.x2 - newBox.x1;
        newBox.x1 = pxValue / spreadWidth;
        newBox.x2 = newBox.x1 + width;
    } else {
        const height = newBox.y2 - newBox.y1;
        newBox.y1 = pxValue / spreadHeight;
        newBox.y2 = newBox.y1 + height;
    }
    return newBox;
};

/**
 * Calculates the new box size after a width or height change, optionally maintaining aspect ratio.
 * @param dimension - The dimension to update ('width' or 'height').
 * @param value - The new value in the current unit (as string).
 * @param currentBox - The current element box.
 * @param spreadWidth - The total width of the spread in pixels.
 * @param spreadHeight - The total height of the spread in pixels.
 * @param unit - The current unit setting.
 * @param lockAspectRatio - Whether to lock aspect ratio.
 * @param ppi - The PPI setting.
 * @returns The updated box object.
 */
export const calculateNewBoxSize = (
    dimension: 'width' | 'height',
    value: string,
    currentBox: PageElement['box'],
    spreadWidth: number,
    spreadHeight: number,
    unit: Unit,
    lockAspectRatio: boolean | undefined,
    ppi: number = APP_CONFIG.PPI
): PageElement['box'] => {
    const numValue = parseFloat(value) || 0;
    const newPx = Math.max(1, unitToPx(numValue, unit, ppi));

    const newBox = { ...currentBox };
    if (dimension === 'width') {
        const oldWidth = (newBox.x2 - newBox.x1) * spreadWidth;
        const oldHeight = (newBox.y2 - newBox.y1) * spreadHeight;
        newBox.x2 = newBox.x1 + (newPx / spreadWidth);

        if (lockAspectRatio) {
            const ratio = oldWidth / oldHeight;
            const newHeightPx = newPx / ratio;
            newBox.y2 = newBox.y1 + (newHeightPx / spreadHeight);
        }
    } else {
        const oldWidth = (newBox.x2 - newBox.x1) * spreadWidth;
        const oldHeight = (newBox.y2 - newBox.y1) * spreadHeight;
        newBox.y2 = newBox.y1 + (newPx / spreadHeight);

        if (lockAspectRatio) {
            const ratio = oldWidth / oldHeight;
            const newWidthPx = newPx * ratio;
            newBox.x2 = newBox.x1 + (newWidthPx / spreadWidth);
        }
    }
    return newBox;
};

export const calculateNewZoomTransform = (
    value: number,
    currentTransform: Partial<ImageContent['contentTransform']> | undefined,
    currentWidthPx: number,
    currentHeightPx: number,
    sourceImageWidth: number | undefined,
    sourceImageHeight: number | undefined
) => {
    const defaults = {
        zoom: 1,
        panX: 0.5,
        panY: 0.5,
    };

    const nextZoom = Math.min(3, Math.max(1, Math.round(value * 10) / 10));
    let nextPanX = currentTransform?.panX ?? defaults.panX;
    let nextPanY = currentTransform?.panY ?? defaults.panY;

    if (nextZoom === 1) {
        if (!sourceImageWidth || !sourceImageHeight) {
            nextPanX = 0.5;
            nextPanY = 0.5;
        } else {
            const coverage = applyCoverTransform(
                currentWidthPx,
                currentHeightPx,
                sourceImageWidth,
                sourceImageHeight,
                {
                    zoom: nextZoom,
                    panX: nextPanX,
                    panY: nextPanY,
                }
            );
            if (!coverage.canPanX) nextPanX = 0.5;
            if (!coverage.canPanY) nextPanY = 0.5;
        }
    }
    const newTransform = {
        ...defaults,
        ...(currentTransform || {}),
        zoom: nextZoom,
        panX: nextPanX,
        panY: nextPanY,
    };
    return newTransform;
};
