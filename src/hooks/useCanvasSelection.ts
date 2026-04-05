import { useState, useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import { CustomFabricObject } from './fabricTypes';
import { useSetSelectedPageId, useCurrentSpreadIndex, useSelectedPageSide, useSetSelectedPages, useSetSelectedElementIds } from '../states/uiStore';
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
 */
export const useCanvasSelection = ({
    fabricCanvas,
}: UseCanvasSelectionProps) => {
    const [hasSelection, setHasSelection] = useState(false);
    const setSelectedElementIds = useSetSelectedElementIds();
    const setSelectedPageId = useSetSelectedPageId();
    const setSelectedPages = useSetSelectedPages();
    const selectedPageSide = useSelectedPageSide();

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

        // When clicking on canvas background (no object), reset page selection to just the current page
        const handleMouseDown = (e: { target?: fabric.Object | null }) => {
            if (!e.target) {
                const currentPageNum = currentSpreadIndex * 2 + (selectedPageSide === 'left' ? 1 : 2);
                setSelectedPages(new Set([currentPageNum]));
            }
        };

        canvas.on('selection:created', handleSelection);
        canvas.on('selection:updated', handleSelection);
        canvas.on('selection:cleared', handleSelectionCleared);
        canvas.on('mouse:down', handleMouseDown);

        return () => {
            canvas.off('selection:created', handleSelection);
            canvas.off('selection:updated', handleSelection);
            canvas.off('selection:cleared', handleSelectionCleared);
            canvas.off('mouse:down', handleMouseDown);
        };
    }, [fabricCanvas, setSelectedElementIds, setSelectedPageId, currentSpreadId, currentSpreadIndex, selectedPageSide, setSelectedPages]);

    return {
        hasSelection,
    };
};
