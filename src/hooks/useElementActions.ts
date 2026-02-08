/**
 * useElementActions - Hook for element-level operations on the canvas.
 *
 * REFACTORED FOR GAPLESS LAYOUT:
 * - Creates new elements with normalized 'box' coordinates (0-1)
 * - Uses 'smartFrame' type
 * - Keeps legacy 'position'/'size' for potential backward compatibility during transition
 */
import { useCallback } from 'react';
import type { PageElement, PoolImage } from '../types';
import { APP_CONFIG } from '../config';
import { useAddElement, useUpdateElement, useDeleteElement, useAlbumSettings } from '../states/albumStore';
import { useSetSelectedElementId, useSetSelectedPageId } from '../states/uiStore';

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

    /**
     * Handles dropping an image from the pool onto a spread.
     * Converts the drop position (model pixels) into normalized box coordinates (0-1).
     */
    const handleImageDrop = useCallback(
        (spreadId: string, image: PoolImage, position: { x: number; y: number }) => {
            if (!settings) {
                console.error("Cannot add element: Album settings not loaded");
                return;
            }

            // Store original dimensions as model pixels (at PPI)
            // Position is the center point
            const imageWidth = image.width || 300;
            const imageHeight = image.height || 300;
            const aspectRatio = imageWidth / imageHeight;

            // Calculate normalized coordinates
            const ppi = APP_CONFIG.PPI;
            const modelSpreadWidth = settings.pageWidth * 2 * ppi;
            const modelPageHeight = settings.pageHeight * ppi;

            // Calculate edges from center position
            const halfW = imageWidth / 2;
            const halfH = imageHeight / 2;

            // Ensure we don't divide by zero (though width should be > 0)
            const safeWidth = modelSpreadWidth || 1;
            const safeHeight = modelPageHeight || 1;

            const x1 = Math.max(0, Math.min(1, (position.x - halfW) / safeWidth));
            const y1 = Math.max(0, Math.min(1, (position.y - halfH) / safeHeight));
            const x2 = Math.max(0, Math.min(1, (position.x + halfW) / safeWidth));
            const y2 = Math.max(0, Math.min(1, (position.y + halfH) / safeHeight));

            const newElement: PageElement = {
                id: crypto.randomUUID(),
                type: 'smartFrame',
                imageUrl: image.baseUrl,
                thumbnailUrl: image.thumbnailUrl || image.baseUrl,
                sourceId: image.sourceId,
                sourceImageId: image.sourceImageId,

                // New Gapless Layout
                box: { x1, y1, x2, y2 },
                contentTransform: {
                    zoom: 1,
                    panX: 0.5,
                    panY: 0.5,
                    rotation: 0
                },

                // Legacy fields (optional/deprecated)
                position: {
                    x: position.x,
                    y: position.y,
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
        [addElement, setSelectedElementId, setSelectedPageId, settings]
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
