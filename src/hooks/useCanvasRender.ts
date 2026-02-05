import { useRef } from 'react';
import * as fabric from 'fabric';
import { CustomFabricObject, ExtendedFabricObject } from './fabricTypes';
import { useCanvasInitialization } from './useCanvasInitialization';
import { useCanvasZoom } from './useCanvasZoom';
import { useCanvasObjects, getZoomCompensatedSizes } from './useCanvasObjects';
import type { Spread, AlbumSettings } from '../types';

// Re-export types for backward compatibility (if needed by other files)
export type { CustomFabricObject, ExtendedFabricObject };
// Re-export util function if needed
export { getZoomCompensatedSizes };

interface UseCanvasRenderProps {
    canvasElRef: React.RefObject<HTMLCanvasElement | null>;
    containerRef: React.RefObject<HTMLDivElement | null>;
    spread: Spread;
    settings: AlbumSettings;
    ppi: number;
    toCanvasPx: (value: number) => number;
    selectedElementId: string | null;
    onCanvasChange?: (dataUrl: string) => void;
}

export const useCanvasRender = ({
    canvasElRef,
    containerRef,
    spread,
    settings,
    ppi,
    toCanvasPx,
    selectedElementId,
    onCanvasChange,
}: UseCanvasRenderProps) => {
    const modelWidth = settings.pageWidth * 2 * ppi;
    const modelHeight = settings.pageHeight * ppi;
    const canvasWidth = toCanvasPx(modelWidth);
    const canvasHeight = toCanvasPx(modelHeight);

    const { zoom, setZoom, fitToViewport } = useCanvasZoom({
        canvasWidth,
        canvasHeight,
        containerRef,
    });

    const snapLinesRef = useRef<fabric.Line[]>([]);

    const { fabricCanvas } = useCanvasInitialization({
        canvasElRef,
        containerRef,
        canvasWidth,
        canvasHeight,
        snapLinesRef,
        onCanvasChange,
    });

    useCanvasObjects({
        fabricCanvas,
        spread,
        settings,
        ppi,
        toCanvasPx,
        selectedElementId,
        zoom,
    });

    return {
        fabricCanvas,
        canvasWidth,
        canvasHeight,
        zoom,
        setZoom,
        fitToViewport,
        snapLinesRef,
    };
};
