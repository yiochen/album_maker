import { useRef } from 'react';
import * as fabric from 'fabric';
import { CustomFabricObject, ExtendedFabricObject } from './fabricTypes';
import { useCanvasInitialization } from './useCanvasInitialization';
import { useCanvasZoom } from './useCanvasZoom';
import { useReactToFabricSync } from './useReactToFabricSync';
import { getZoomCompensatedSizes } from '../utils/fabricRenderer';
import { useAlbumSettings } from '../states/albumStore';
import { toCanvasPx } from '../utils/imageUtils';
import { APP_CONFIG } from '../config';

// Re-export types for backward compatibility (if needed by other files)
export type { CustomFabricObject, ExtendedFabricObject };
// Re-export util function if needed
export { getZoomCompensatedSizes };

/**
 * Props for useCanvasRender.
 */
interface UseCanvasRenderProps {
    /** Ref to the canvas HTML element. */
    canvasElRef: React.RefObject<HTMLCanvasElement | null>;
    /** Ref to the container div element. */
    containerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Hook that orchestrates the rendering of the canvas.
 *
 * It composes:
 * - Initialization (useCanvasInitialization)
 * - Zoom/Viewport management (useCanvasZoom)
 * - React-to-Fabric state synchronization (useReactToFabricSync)
 */
export const useCanvasRender = ({
    canvasElRef,
    containerRef,
}: UseCanvasRenderProps) => {
    const settings = useAlbumSettings();

    const ppi = APP_CONFIG.PPI;
    const modelWidth = settings ? settings.pageWidth * 2 * ppi : 0;
    const modelHeight = settings ? settings.pageHeight * ppi : 0;
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
    });

    useReactToFabricSync({
        fabricCanvas,
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
