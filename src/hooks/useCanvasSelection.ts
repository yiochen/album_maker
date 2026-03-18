import { useState, useEffect } from 'react';
import * as fabric from 'fabric';
import { CustomFabricObject } from './fabricTypes';
import { useSetSelectedElementId, useSetSelectedPageId, useCurrentSpreadIndex, useSelectedPageSide, useSetSelectedPages } from '../states/uiStore';
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
    const selectedPageSide = useSelectedPageSide();

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
    }, [fabricCanvas, setSelectedElementId, setSelectedPageId, currentSpreadId, currentSpreadIndex, selectedPageSide, setSelectedPages]);

    return {
        hasSelection,
    };
};
