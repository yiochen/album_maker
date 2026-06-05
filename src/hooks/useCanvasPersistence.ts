/**
 * useCanvasPersistence - Handles saving element changes (position, size) to the global store.
 *
 * This hook listens for the 'object:modified' event on the Fabric.js canvas
 * and persists the updated bounding box to the global Zustand store.
 */
import { useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import type { ImageContent, ShapeContent, TextContent } from '../types';
import { CanvasImageElement } from './CanvasImageElement';
import { CanvasShapeElement } from './CanvasShapeElement';
import { CanvasTextElement } from './CanvasTextElement';
import { useCurrentSpreadIndex } from '../states/uiStore';
import { useAlbumSpreads, useUpdateElement } from '../states/albumStore';
import { useTextResizeReflow } from './useTextResizeReflow';
import { normalizeRotation } from '../utils/rotatedBounds';

interface UseCanvasPersistenceProps {
    /** The Fabric.js canvas instance. */
    fabricCanvas: fabric.Canvas | null;
    /** Width of the canvas in pixels. */
    canvasWidth: number;
    /** Height of the canvas in pixels. */
    canvasHeight: number;
}

export const useCanvasPersistence = ({
    fabricCanvas,
    canvasWidth,
    canvasHeight,
}: UseCanvasPersistenceProps) => {
    const spreads = useAlbumSpreads();
    const currentSpreadIndex = useCurrentSpreadIndex();
    const onElementUpdate = useUpdateElement();
    const { requestReflowAfterResize } = useTextResizeReflow();

    const onElementUpdateRef = useRef(onElementUpdate);
    const spreadRef = useRef(spreads[currentSpreadIndex]);

    useEffect(() => {
        onElementUpdateRef.current = onElementUpdate;
        spreadRef.current = spreads[currentSpreadIndex];
    }, [onElementUpdate, spreads, currentSpreadIndex]);

    useEffect(() => {
        const canvas = fabricCanvas;
        if (!canvas) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleObjectModified = (e: { target?: fabric.Object; transform?: any }) => {
            const obj = e.target;
            if (!obj) return;
            const extendedObj = obj as import('./fabricTypes').ExtendedFabricObject;
            const interactionType = extendedObj.interactionType ?? null;

            const spread = spreadRef.current;
            if (!spread) return;

            // Handle image elements
            if (obj instanceof CanvasImageElement) {
                if (interactionType !== 'rotate') {
                    obj.updateLayoutFromPixels(canvasWidth, canvasHeight);
                }
                const imageContent = obj.pageElement.content as ImageContent;
                onElementUpdateRef.current(spread.id, obj.pageElement.id, {
                    ...(interactionType !== 'rotate' ? { box: obj.pageElement.box } : {}),
                    rotation: normalizeRotation(obj.angle ?? 0),
                    content: {
                        ...imageContent,
                        contentTransform: imageContent.contentTransform,
                    }
                });
            } else if (obj instanceof CanvasShapeElement) {
                if (interactionType !== 'rotate') {
                    obj.updateLayoutFromPixels(canvasWidth, canvasHeight);
                }
                const shapeContent = obj.pageElement.content as ShapeContent;
                onElementUpdateRef.current(spread.id, obj.pageElement.id, {
                    ...(interactionType !== 'rotate' ? { box: obj.pageElement.box } : {}),
                    rotation: normalizeRotation(obj.angle ?? 0),
                    content: shapeContent,
                });
            } else if (obj instanceof CanvasTextElement) {
                const previousBox = obj.pageElement.box;
                const previousWidth = previousBox.x2 - previousBox.x1;
                const previousHeight = previousBox.y2 - previousBox.y1;

                // For text, updateLayoutFromPixels handles coordinate conversion.
                if (interactionType !== 'rotate') {
                    obj.updateLayoutFromPixels(canvasWidth, canvasHeight);
                }
                const nextBox = obj.pageElement.box;
                const nextWidth = nextBox.x2 - nextBox.x1;
                const nextHeight = nextBox.y2 - nextBox.y1;

                const groupId = crypto.randomUUID();
                onElementUpdateRef.current(spread.id, obj.pageElement.id, {
                    ...(interactionType !== 'rotate' ? { box: obj.pageElement.box } : {}),
                    rotation: normalizeRotation(obj.angle ?? 0),
                }, groupId);

                const widthChanged = interactionType !== 'rotate' && Math.abs(nextWidth - previousWidth) > 1e-7;
                const heightChanged = interactionType !== 'rotate' && Math.abs(nextHeight - previousHeight) > 1e-7;
                if (widthChanged || heightChanged) {
                    const textContent = obj.pageElement.content as TextContent;
                    requestReflowAfterResize({
                        spreadId: spread.id,
                        elementId: obj.pageElement.id,
                        content: textContent,
                        boxWidthPx: nextWidth * canvasWidth,
                        boxHeightPx: nextHeight * canvasHeight,
                        groupId,
                    });
                }
            }

            extendedObj.interactionType = null;
        };

        canvas.on('object:modified', handleObjectModified);

        return () => {
            canvas.off('object:modified', handleObjectModified);
        };
    }, [fabricCanvas, canvasWidth, canvasHeight, requestReflowAfterResize]);
};
