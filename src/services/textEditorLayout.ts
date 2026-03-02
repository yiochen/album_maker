import type { NormalizedRect } from '../types';

export const BASE_TEXT_EDITOR_PADDING_PX = 8;

export interface TextEditorLayoutMetrics {
    zoomScale: number;
    editorPadding: number;
    borderWidth: number;
    handleWidth: number;
    handleTouchArea: number;
    handleReservePadding: number;
}

export function getTextEditorLayoutMetrics(canvasZoom: number): TextEditorLayoutMetrics {
    const zoomScale = 100 / Math.max(1, canvasZoom);
    const handleWidth = 4 * zoomScale;

    return {
        zoomScale,
        editorPadding: BASE_TEXT_EDITOR_PADDING_PX * zoomScale,
        borderWidth: 2 * zoomScale,
        handleWidth,
        handleTouchArea: 24 * zoomScale,
        handleReservePadding: handleWidth + 2 * zoomScale,
    };
}

export function getTextContentSizeFromOverlaySize(
    overlayWidthPx: number,
    overlayHeightPx: number,
    canvasZoom: number
): { width: number; height: number } {
    const { editorPadding, handleReservePadding } = getTextEditorLayoutMetrics(canvasZoom);

    return {
        width: Math.max(1, overlayWidthPx - (editorPadding * 2 + handleReservePadding)),
        height: Math.max(1, overlayHeightPx - editorPadding * 2),
    };
}

export function buildTextBoxFromOverlaySize(
    currentBox: NormalizedRect,
    overlayWidthPx: number,
    overlayHeightPx: number,
    canvasWidth: number,
    canvasHeight: number,
    canvasZoom: number
): NormalizedRect {
    const contentSize = getTextContentSizeFromOverlaySize(overlayWidthPx, overlayHeightPx, canvasZoom);
    return {
        ...currentBox,
        x2: currentBox.x1 + contentSize.width / canvasWidth,
        y2: currentBox.y1 + contentSize.height / canvasHeight,
    };
}
