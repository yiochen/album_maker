import { useState, useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import { CustomFabricObject } from './fabricTypes';
import { useSetSelectedElementId, useSetSelectedPageId, useCurrentSpreadIndex, useSetSelectedPages, useSetSelectedPageSide } from '../states/uiStore';
import { useAlbumSpreads } from '../states/albumStore';

/**
 * Props for useCanvasSelection.
 */
interface UseCanvasSelectionProps {
    /** The Fabric.js canvas instance. */
    fabricCanvas: fabric.Canvas | null;
}

/**
 * Hook to handle object selection events on the canvas.
 *
 * It syncs the selection state from Fabric.js to the global UI store (selectedElementId, selectedPageId).
 */
export const useCanvasSelection = ({
    fabricCanvas,
}: UseCanvasSelectionProps) => {
    const [hasSelection, setHasSelection] = useState(false);
    const setSelectedElementId = useSetSelectedElementId();
    const setSelectedPageId = useSetSelectedPageId();
    const setSelectedPages = useSetSelectedPages();
    const setSelectedPageSide = useSetSelectedPageSide();
    const isDragging = useRef(false);

    // We need the current spread ID to set it when an element is selected
    const currentSpreadIndex = useCurrentSpreadIndex();
    const spreads = useAlbumSpreads();
    const currentSpreadId = spreads[currentSpreadIndex]?.id;

    useEffect(() => {
        const canvas = fabricCanvas;
        if (!canvas) return;

        const handleSelection = (e: { selected: fabric.Object[] }) => {
            setHasSelection(true);
            const selected = e.selected || [];
            if (selected.length === 1) {
                const obj = selected[0] as CustomFabricObject;
                if (obj.data?.id) {
                    setSelectedElementId(obj.data.id);
                    if (currentSpreadId) {
                        setSelectedPageId(currentSpreadId);
                    }
                    // Sync canvas uniformScaling with the selected object's setting
                    canvas.uniformScaling = obj.get('uniformScaling') !== false;
                    // Switch active page side to whichever half the element's center is on
                    if (canvas.width) {
                        const objCenterX = obj.left + (obj.width ?? 0) * (obj.scaleX ?? 1) / 2;
                        const side = objCenterX < canvas.width / 2 ? 'left' : 'right';
                        setSelectedPageSide(side);
                        const newPageNum = currentSpreadIndex * 2 + (side === 'left' ? 1 : 2);
                        setSelectedPages(new Set([newPageNum]));
                    }
                }
            } else {
                setSelectedElementId(null);
                setSelectedPageId(null);
            }
        };

        const handleSelectionCleared = () => {
            setHasSelection(false);
            setSelectedElementId(null);
            setSelectedPageId(null);
            if (canvas) {
                canvas.uniformScaling = true;
            }
        };

        // When clicking on canvas background (no object), switch active page side to whichever half was clicked
        const handleMouseDown = (e: { target?: fabric.Object | null; pointer?: { x: number; y: number } }) => {
            if (!e.target && e.pointer && canvas.width) {
                const clickedSide = e.pointer.x < canvas.width / 2 ? 'left' : 'right';
                setSelectedPageSide(clickedSide);
                const newPageNum = currentSpreadIndex * 2 + (clickedSide === 'left' ? 1 : 2);
                setSelectedPages(new Set([newPageNum]));
            }
        };

        const handleObjectMoving = () => { isDragging.current = true; };

        // After a drag, switch active page side based on where the mouse was released
        const handleMouseUp = (e: { pointer?: { x: number; y: number } }) => {
            if (isDragging.current && e.pointer && canvas.width) {
                isDragging.current = false;
                const side = e.pointer.x < canvas.width / 2 ? 'left' : 'right';
                setSelectedPageSide(side);
                const newPageNum = currentSpreadIndex * 2 + (side === 'left' ? 1 : 2);
                setSelectedPages(new Set([newPageNum]));
            }
        };

        canvas.on('selection:created', handleSelection);
        canvas.on('selection:updated', handleSelection);
        canvas.on('selection:cleared', handleSelectionCleared);
        canvas.on('mouse:down', handleMouseDown);
        canvas.on('object:moving', handleObjectMoving);
        canvas.on('mouse:up', handleMouseUp);

        return () => {
            canvas.off('selection:created', handleSelection);
            canvas.off('selection:updated', handleSelection);
            canvas.off('selection:cleared', handleSelectionCleared);
            canvas.off('mouse:down', handleMouseDown);
            canvas.off('object:moving', handleObjectMoving);
            canvas.off('mouse:up', handleMouseUp);
        };
    }, [fabricCanvas, setSelectedElementId, setSelectedPageId, currentSpreadId, currentSpreadIndex, setSelectedPages, setSelectedPageSide]);

    return {
        hasSelection,
    };
};
