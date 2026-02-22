/**
 * useCanvasPersistence - Handles saving element changes (position, size) to the global store.
 *
 * This hook listens for the 'object:modified' event on the Fabric.js canvas
 * and persists the updated bounding box to the global Zustand store.
 */
import { useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import type { ImageContent } from '../types';
import { CanvasImageElement } from './CanvasImageElement';
import { CanvasTextElement } from './CanvasTextElement';
import { useCurrentSpreadIndex } from '../states/uiStore';
import { useAlbumSpreads, useUpdateElement } from '../states/albumStore';

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
            } else if (obj instanceof CanvasTextElement) {
                // For text, updateLayoutFromPixels handles coordinate conversion
                obj.updateLayoutFromPixels(canvasWidth, canvasHeight);
                onElementUpdateRef.current(spread.id, obj.pageElement.id, {
                    box: obj.pageElement.box,
                });
            }
        };

        canvas.on('object:modified', handleObjectModified);

        return () => {
            canvas.off('object:modified', handleObjectModified);
        };
    }, [fabricCanvas, canvasWidth, canvasHeight]);
};
