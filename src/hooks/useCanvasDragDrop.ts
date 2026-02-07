/**
 * useCanvasDragDrop - Handles drag-and-drop of images onto the canvas.
 *
 * PIXEL COORDINATE SYSTEM:
 * - DOM event coordinates are in screen pixels
 * - Converts to CANVAS PIXELS (adjusting for zoom)
 * - Converts to MODEL PIXELS via toModelPx() before calling onImageDrop
 *
 * onImageDrop receives position in MODEL PIXELS (at PPI, e.g., 300 PPI).
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import type { PoolImage } from '../types';
import { toModelPx } from '../utils/imageUtils';

interface UseCanvasDragDropProps {
    spreadId: string;
    zoom: number;
    wrapperRef: React.RefObject<HTMLDivElement | null>;
    onImageDrop: (spreadId: string, image: PoolImage, position: { x: number; y: number }) => void;
}

export const useCanvasDragDrop = ({
    spreadId,
    zoom,
    wrapperRef,
    onImageDrop,
}: UseCanvasDragDropProps) => {
    const [isDragOver, setIsDragOver] = useState(false);

    const onImageDropRef = useRef(onImageDrop);
    const spreadIdRef = useRef(spreadId);

    useEffect(() => {
        onImageDropRef.current = onImageDrop;
        spreadIdRef.current = spreadId;
    }, [onImageDrop, spreadId]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const imageData = e.dataTransfer.getData('application/json');
        if (!imageData) return;

        try {
            const image: PoolImage = JSON.parse(imageData);
            const rect = wrapperRef.current?.getBoundingClientRect();
            if (!rect) return;

            const domX = e.clientX - rect.left;
            const domY = e.clientY - rect.top;

            const scale = zoom / 100;
            const canvasX = domX / scale;
            const canvasY = domY / scale;

            onImageDropRef.current(spreadIdRef.current, image, {
                x: toModelPx(canvasX),
                y: toModelPx(canvasY),
            });
        } catch (err) {
            console.error('Failed to parse drop', err);
        }
    }, [zoom, wrapperRef]);

    return {
        isDragOver,
        handleDragOver,
        handleDragLeave,
        handleDrop,
    };
};
