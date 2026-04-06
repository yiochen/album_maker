import { useState, useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import { CustomFabricObject } from './fabricTypes';
import { useSetSelectedPageId, useCurrentSpreadIndex, useSetSelectedPages, useSetSelectedPageSide, useSetSelectedElementIds, useClearPoolImageSelection } from '../states/uiStore';
import { useAlbumSpreads } from '../states/albumStore';

/**
 * Props for useCanvasSelection.
 */
interface UseCanvasSelectionProps {
    /** The Fabric.js canvas instance. */
    fabricCanvas: fabric.Canvas | null;
}

/**
 * Determines which page side a Fabric object belongs to based on its center x
 * relative to the canvas midpoint.
 */
function getObjectPageSide(obj: fabric.Object, canvasWidth: number): 'left' | 'right' {
    const center = obj.getCenterPoint();
    return center.x < canvasWidth / 2 ? 'left' : 'right';
}

/**
 * Hook to handle object selection events on the canvas.
 *
 * It syncs the selection state from Fabric.js to the global UI store (selectedElementIds, selectedPageId).
 * Multi-selection is constrained to a single page side (left or right).
 * Auto-switches the active page side based on element clicks, background clicks, and drags.
 */
export const useCanvasSelection = ({
    fabricCanvas,
}: UseCanvasSelectionProps) => {
    const [hasSelection, setHasSelection] = useState(false);
    const setSelectedElementIds = useSetSelectedElementIds();
    const setSelectedPageId = useSetSelectedPageId();
    const setSelectedPages = useSetSelectedPages();
    const setSelectedPageSide = useSetSelectedPageSide();
    const clearPoolImageSelection = useClearPoolImageSelection();
    const isDragging = useRef(false);
    const lastDragPointerX = useRef(0);

    // We need the current spread ID to set it when an element is selected
    const currentSpreadIndex = useCurrentSpreadIndex();
    const spreads = useAlbumSpreads();
    const currentSpreadId = spreads[currentSpreadIndex]?.id;

    // Guard to prevent re-entrant selection handler calls when we modify the
    // Fabric selection programmatically (e.g. enforcing same-page-side constraint).
    const isAdjustingSelectionRef = useRef(false);

    useEffect(() => {
        const canvas = fabricCanvas;
        if (!canvas) return;

        const handleSelection = (e: { selected: fabric.Object[] }) => {
            // Skip if we're programmatically adjusting selection
            if (isAdjustingSelectionRef.current) return;

            setHasSelection(true);
            const selected = e.selected || [];
            const canvasWidth = canvas.getWidth();

            // Filter to only selectable objects with data IDs
            const validObjects = selected.filter(obj => {
                const custom = obj as CustomFabricObject;
                return custom.data?.id;
            });

            if (validObjects.length === 0) {
                setSelectedElementIds([]);
                setSelectedPageId(null);
                return;
            }

            // Enforce single-page-side constraint:
            // Determine the page side of the last selected object (the one just clicked)
            const lastObj = validObjects[validObjects.length - 1];
            const targetSide = getObjectPageSide(lastObj, canvasWidth);

            // Keep only objects on the same page side
            const sameSideObjects = validObjects.filter(
                obj => getObjectPageSide(obj, canvasWidth) === targetSide
            );

            // If we had to filter out cross-page objects, update the Fabric selection
            if (sameSideObjects.length < selected.length) {
                // Defer the selection adjustment to avoid re-entrant event handling
                isAdjustingSelectionRef.current = true;
                queueMicrotask(() => {
                    try {
                        canvas.discardActiveObject();
                        if (sameSideObjects.length === 1) {
                            canvas.setActiveObject(sameSideObjects[0]);
                        } else if (sameSideObjects.length > 1) {
                            const sel = new fabric.ActiveSelection(sameSideObjects, { canvas });
                            canvas.setActiveObject(sel);
                        }
                        canvas.requestRenderAll();
                    } finally {
                        isAdjustingSelectionRef.current = false;
                    }
                });
            }

            const ids = sameSideObjects
                .map(obj => (obj as CustomFabricObject).data?.id)
                .filter((id): id is string => !!id);

            setSelectedElementIds(ids);

            if (ids.length >= 1 && currentSpreadId) {
                setSelectedPageId(currentSpreadId);
            }

            // Switch active page side to whichever half the selected elements are on
            setSelectedPageSide(targetSide);
            const newPageNum = currentSpreadIndex * 2 + (targetSide === 'left' ? 1 : 2);
            setSelectedPages(new Set([newPageNum]));

            // Sync canvas uniformScaling with the selected object's setting (single selection only)
            if (sameSideObjects.length === 1) {
                canvas.uniformScaling = sameSideObjects[0].get('uniformScaling') !== false;
            }
        };

        const handleSelectionCleared = () => {
            if (isAdjustingSelectionRef.current) return;

            setHasSelection(false);
            setSelectedElementIds([]);
            setSelectedPageId(null);
            if (canvas) {
                canvas.uniformScaling = true;
            }
        };

        // When clicking on canvas background (no object), switch active page side to whichever half was clicked.
        // Fabric v7 mouse:down may not expose pointer coords, so compute from the native event + canvas rect.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleMouseDown = (e: { target?: fabric.Object | null; e?: any }) => {
            clearPoolImageSelection();
            if (!e.target && e.e && canvas.width) {
                const canvasEl = canvas.getElement();
                const rect = canvasEl.getBoundingClientRect();
                const canvasPixelX = (e.e.clientX - rect.left) * (canvas.width / rect.width);
                const clickedSide = canvasPixelX < canvas.width / 2 ? 'left' : 'right';
                setSelectedPageSide(clickedSide);
                const newPageNum = currentSpreadIndex * 2 + (clickedSide === 'left' ? 1 : 2);
                setSelectedPages(new Set([newPageNum]));
            }
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleObjectMoving = (e: { target?: fabric.Object; e?: any }) => {
            isDragging.current = true;
            if (e.e && canvas.width) {
                const canvasEl = canvas.getElement();
                const rect = canvasEl.getBoundingClientRect();
                lastDragPointerX.current = (e.e.clientX - rect.left) * (canvas.width / rect.width);
            }
        };

        // After a drag, switch active page side based on the last pointer position during the drag.
        // mouse:up in Fabric v7 (TPointerEventInfo & { isClick }) does not expose pointer coords,
        // so we track them from object:moving and consume here.
        const handleMouseUp = () => {
            if (isDragging.current && canvas.width) {
                isDragging.current = false;
                const side = lastDragPointerX.current < canvas.width / 2 ? 'left' : 'right';
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
    }, [fabricCanvas, setSelectedElementIds, setSelectedPageId, currentSpreadId, currentSpreadIndex, setSelectedPages, setSelectedPageSide, clearPoolImageSelection]);

    return {
        hasSelection,
    };
};
