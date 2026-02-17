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
import { useAddElement, useUpdateElement, useDeleteElement, useAlbumSettings } from '../states/albumStore';
import { useSetSelectedElementId, useSetSelectedPageId } from '../states/uiStore';
import { calculateThumbnailSize } from '../utils/imageUtils';
import { APP_CONFIG } from '../config';

/**
 * Pixel Coordinate System Notes:
 * - PageElement stores dimensions in MODEL PIXELS (at APP_CONFIG.PPI resolution)
 * - position.x/y are the CENTER of the element (FabricJS uses originX/originY: 'center')
 * - size.width/height are in model pixels
 * - Conversion to canvas/screen pixels happens in useReactToFabricSync during rendering
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

    const settings = useAlbumSettings();
    const ppi = APP_CONFIG.PPI;

    /**
     * Handles dropping an image from the pool onto a spread.
     */
    const handleImageDrop = useCallback(
        (spreadId: string, image: PoolImage, position: { x: number; y: number }) => {
            if (!settings) return;

            const spreadWidth = settings.pageWidth * 2 * ppi;
            const spreadHeight = settings.pageHeight * ppi;

            // Determine initial size - fit within the spread
            const targetSize = calculateThumbnailSize(
                image.width,
                image.height,
                spreadWidth,
                spreadHeight
            );

            // Convert to normalized coordinates (0.0 to 1.0)
            const normWidth = targetSize.width / spreadWidth;
            const normHeight = targetSize.height / spreadHeight;
            const normCenterX = position.x / spreadWidth;
            const normCenterY = position.y / spreadHeight;

            const box = {
                x1: normCenterX - normWidth / 2,
                y1: normCenterY - normHeight / 2,
                x2: normCenterX + normWidth / 2,
                y2: normCenterY + normHeight / 2,
            };

            const newElement: PageElement = {
                id: crypto.randomUUID(),
                type: 'image',
                content: {
                    fullUrl: image.fullUrl,
                    previewUrl: image.previewUrl,
                    thumbnailUrl: image.thumbnailUrl,
                    sourceId: image.sourceId,
                    sourceImageId: image.sourceImageId,
                    contentTransform: {
                        zoom: 1,
                        panX: 0.5,
                        panY: 0.5,
                    },
                    originalAspectRatio: (image.width || 1) / (image.height || 1),
                    lockAspectRatio: true,
                },
                box,
            };

            addElement(spreadId, newElement);
            setSelectedElementId(newElement.id);
            setSelectedPageId(spreadId);
        },
        [addElement, setSelectedElementId, setSelectedPageId, settings, ppi]
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
