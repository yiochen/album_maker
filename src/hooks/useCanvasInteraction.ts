import * as fabric from 'fabric';
import { useCanvasSelection } from './useCanvasSelection';
import { useCanvasSnapping } from './useCanvasSnapping';
import { useCanvasPersistence } from './useCanvasPersistence';
import { useCanvasKeyboardEvents } from './useCanvasKeyboardEvents';

/**
 * Props for useCanvasInteraction.
 */
interface UseCanvasInteractionProps {
    /** The Fabric.js canvas instance. */
    fabricCanvas: fabric.Canvas | null;
    /** Width of the canvas in pixels. */
    canvasWidth: number;
    /** Height of the canvas in pixels. */
    canvasHeight: number;
    /** Current zoom level percentage. */
    zoom: number;
    /** Ref to store active snap lines. */
    snapLinesRef: React.RefObject<fabric.Line[]>;
}

/**
 * Orchestrates canvas interaction behaviors.
 *
 * This hook coordinates:
 * - Keyboard shortcuts (delete key for removing elements)
 * - Selection handling (via useCanvasSelection)
 * - Snapping behavior (via useCanvasSnapping)
 *
 * Note: Drag-and-drop from ImagePool is now handled by @dnd-kit via DndWrapper.
 */
export const useCanvasInteraction = ({
    fabricCanvas,
    canvasWidth,
    canvasHeight,
    zoom,
    snapLinesRef,
}: UseCanvasInteractionProps) => {

    useCanvasKeyboardEvents({
        fabricCanvas
    });

    const { hasSelection } = useCanvasSelection({
        fabricCanvas,
    });

    useCanvasSnapping({
        fabricCanvas,
        canvasWidth,
        canvasHeight,
        zoom,
        snapLinesRef,
    });

    useCanvasPersistence({
        fabricCanvas,
        canvasWidth,
        canvasHeight,
    });

    return {
        hasSelection,
    };
};
