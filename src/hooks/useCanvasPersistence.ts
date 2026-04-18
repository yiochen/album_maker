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

            const spread = spreadRef.current;
            if (!spread) return;

            // Handle image elements
            if (obj instanceof CanvasImageElement) {
                obj.updateLayoutFromPixels(e.transform?.corner || '', canvasWidth, canvasHeight);
                const imageContent = obj.pageElement.content as ImageContent;
                onElementUpdateRef.current(spread.id, obj.pageElement.id, {
                    box: obj.pageElement.box,
                    content: {
                        ...imageContent,
                        contentTransform: imageContent.contentTransform,
                    }
                });
            } else if (obj instanceof CanvasShapeElement) {
                obj.updateLayoutFromPixels(e.transform?.corner || '', canvasWidth, canvasHeight);
                const shapeContent = obj.pageElement.content as ShapeContent;
                onElementUpdateRef.current(spread.id, obj.pageElement.id, {
                    box: obj.pageElement.box,
                    content: shapeContent,
                });
            } else if (obj instanceof CanvasTextElement) {
                const previousBox = obj.pageElement.box;
                const previousWidth = previousBox.x2 - previousBox.x1;
                const previousHeight = previousBox.y2 - previousBox.y1;

                // For text, updateLayoutFromPixels handles coordinate conversion.
                obj.updateLayoutFromPixels(e.transform?.corner || '', canvasWidth, canvasHeight);
                const nextBox = obj.pageElement.box;
                const nextWidth = nextBox.x2 - nextBox.x1;
                const nextHeight = nextBox.y2 - nextBox.y1;

                const groupId = crypto.randomUUID();
                onElementUpdateRef.current(spread.id, obj.pageElement.id, {
                    box: obj.pageElement.box,
                }, groupId);

                const widthChanged = Math.abs(nextWidth - previousWidth) > 1e-7;
                const heightChanged = Math.abs(nextHeight - previousHeight) > 1e-7;
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
        };

        canvas.on('object:modified', handleObjectModified);

        return () => {
            canvas.off('object:modified', handleObjectModified);
        };
    }, [fabricCanvas, canvasWidth, canvasHeight, requestReflowAfterResize]);
};
