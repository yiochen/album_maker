/**
 * useElementActions - Hook for element-level operations on the canvas.
 *
 * PIXEL COORDINATE SYSTEM:
 * - All positions and sizes are stored in MODEL PIXELS (at PPI, e.g., 300 PPI)
 * - handleImageDrop expects position in MODEL PIXELS (provided by useCanvasDragDrop)
 * - image.width/height (from PoolImage) are in MODEL PIXELS (original camera resolution)
 *
 * Position represents the CENTER of the element (FabricJS uses center origin).
 */
import { useCallback } from 'react';
import type { PageElement, PoolImage } from '../types';
import { useAddElement, useUpdateElement, useDeleteElement } from '../states/albumStore';
import { useSetSelectedElementId, useSetSelectedPageId } from '../states/uiStore';

/**
 * Pixel Coordinate System Notes:
 * - PageElement stores dimensions in MODEL PIXELS (at APP_CONFIG.PPI resolution)
 * - position.x/y are the CENTER of the element (FabricJS uses originX/originY: 'center')
 * - size.width/height are in model pixels
 * - Conversion to canvas/screen pixels happens in useCanvasObjects during rendering
 */

/**
 * Hook for element-level operations on the canvas.
 * Handles creating, updating, and deleting elements within spreads.
 */
export const useElementActions = () => {
    const addElement = useAddElement();
    const updateElement = useUpdateElement();
    const deleteElement = useDeleteElement();
    const setSelectedElementId = useSetSelectedElementId();
    const setSelectedPageId = useSetSelectedPageId();

    /**
     * Handles dropping an image from the pool onto a spread.
     * Stores dimensions in model pixels (at PPI) - rendering converts to screen pixels.
     */
    const handleImageDrop = useCallback(
        (spreadId: string, image: PoolImage, position: { x: number; y: number }) => {
            // Store original dimensions as model pixels (at PPI)
            // Position is the center point - FabricJS will use originX/originY: 'center'
            const imageWidth = image.width || 300;
            const imageHeight = image.height || 300;
            const aspectRatio = imageWidth / imageHeight;

            const newElement: PageElement = {
                id: crypto.randomUUID(),
                type: 'image',
                imageUrl: image.baseUrl,
                thumbnailUrl: image.thumbnailUrl || image.baseUrl,
                sourceId: image.sourceId,
                sourceImageId: image.sourceImageId,
                position: {
                    x: position.x,  // center position
                    y: position.y,  // center position
                },
                size: {
                    width: imageWidth,
                    height: imageHeight,
                },
                originalAspectRatio: aspectRatio,
                lockAspectRatio: true,
            };

            addElement(spreadId, newElement);
            setSelectedElementId(newElement.id);
            setSelectedPageId(spreadId);
        },
        [addElement, setSelectedElementId, setSelectedPageId]
    );

    /**
     * Updates properties of an existing element.
     */
    const handleElementUpdate = useCallback(
        (
            spreadId: string,
            elementId: string,
            updates: Partial<PageElement>,
            groupId?: string
        ) => {
            updateElement(spreadId, elementId, updates, groupId);
        },
        [updateElement]
    );

    /**
     * Deletes an element and clears the selection.
     */
    const handleElementDelete = useCallback(
        (spreadId: string, elementId: string) => {
            deleteElement(spreadId, elementId);
            setSelectedElementId(null);
            setSelectedPageId(null);
        },
        [deleteElement, setSelectedElementId, setSelectedPageId]
    );

    return {
        handleImageDrop,
        handleElementUpdate,
        handleElementDelete,
    };
};
