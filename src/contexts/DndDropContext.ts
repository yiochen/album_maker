/**
 * DndContext - Provides drag-and-drop context for coordinating drops between components.
 *
 * This context allows the Canvas component to register its drop target information
 * (ref, zoom, spreadId) so that the DndWrapper can properly calculate drop coordinates.
 */
import { createContext, useContext } from 'react';
import type { PoolImage } from '../types';

interface CanvasDropTarget {
    /** Ref to the canvas wrapper element for coordinate calculation */
    wrapperRef: React.RefObject<HTMLDivElement | null>;
    /** Current zoom level (percentage, e.g., 100 = 100%) */
    zoom: number;
    /** Current spread ID to receive the dropped image */
    spreadId: string;
    /** Resolve target image element ID under the drop point (canvas px), if any. */
    getDropTargetImageElementId: (canvasX: number, canvasY: number) => string | null;
    /** Handler to call when an image is dropped */
    onImageDrop: (
        spreadId: string,
        image: PoolImage,
        position: { x: number; y: number },
        targetElementId?: string
    ) => void;
}

interface DndContextValue {
    /** Register the canvas as a drop target */
    registerCanvasDropTarget: (target: CanvasDropTarget | null) => void;
    /** Get the current canvas drop target */
    canvasDropTarget: CanvasDropTarget | null;
}

const DndDropContext = createContext<DndContextValue | null>(null);

export function useDndDropContext(): DndContextValue {
    const ctx = useContext(DndDropContext);
    if (!ctx) {
        throw new Error('useDndDropContext must be used within a DndDropProvider');
    }
    return ctx;
}

export { DndDropContext };
export type { CanvasDropTarget, DndContextValue };
