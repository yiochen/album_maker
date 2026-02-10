import { useEffect, useRef, useMemo } from 'react';
import * as fabric from 'fabric';
import { CustomFabricObject } from './fabricTypes';
import { useCanvasSelection } from './useCanvasSelection';
import { useCanvasSnapping } from './useCanvasSnapping';
import { useCurrentSpreadIndex } from '../states/uiStore';
import { useAlbumSpreads, useDeleteElement } from '../states/albumStore';

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
    /** Optional callback when canvas content changes. */
    onCanvasChange?: (dataUrl: string) => void;
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
    onCanvasChange,
}: UseCanvasInteractionProps) => {
    const spreads = useAlbumSpreads();
    const currentSpreadIndex = useCurrentSpreadIndex();
    const spread = useMemo(() => spreads[currentSpreadIndex], [spreads, currentSpreadIndex]);

    const onElementDelete = useDeleteElement();

    const onElementDeleteRef = useRef(onElementDelete);
    const spreadRef = useRef(spread);

    useEffect(() => {
        onElementDeleteRef.current = onElementDelete;
        spreadRef.current = spread;
    }, [onElementDelete, spread]);

    // Keyboard Deletion
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (['INPUT', 'TEXTAREA'].includes(target.tagName) && !target.closest('.canvas-container')) {
                return;
            }

            if (e.key === 'Delete' || e.key === 'Backspace') {
                const canvas = fabricCanvas;
                if (!canvas) return;
                const activeObj = canvas.getActiveObject() as CustomFabricObject;

                // Handle single object selection
                if (activeObj && activeObj.data?.id) {
                    const id = activeObj.data.id;
                    canvas.discardActiveObject();
                    onElementDeleteRef.current(spreadRef.current.id, id);
                    canvas.requestRenderAll();
                    return;
                }

                // Handle active selection (multi-selection)
                if (activeObj && activeObj.type === 'activeSelection') {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const objects = (activeObj as any).getObjects() as CustomFabricObject[];
                    const idsToDelete = objects.map(o => o.data?.id).filter((id): id is string => !!id);

                    if (idsToDelete.length > 0) {
                        canvas.discardActiveObject();
                        // Delete each element
                        idsToDelete.forEach(id => {
                            onElementDeleteRef.current(spreadRef.current.id, id);
                        });
                        canvas.requestRenderAll();
                    }
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [fabricCanvas]);

    const { hasSelection } = useCanvasSelection({
        fabricCanvas,
    });

    useCanvasSnapping({
        fabricCanvas,
        canvasWidth,
        canvasHeight,
        zoom,
        snapLinesRef,
        onCanvasChange,
    });

    return {
        hasSelection,
    };
};
