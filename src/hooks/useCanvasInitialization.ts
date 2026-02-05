import { useState, useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import { CustomFabricObject, ExtendedFabricObject } from './fabricTypes';
import { APP_CONFIG } from '../config';

interface UseCanvasInitializationProps {
    canvasElRef: React.RefObject<HTMLCanvasElement | null>;
    containerRef: React.RefObject<HTMLDivElement | null>;
    canvasWidth: number;
    canvasHeight: number;
    snapLinesRef: React.RefObject<fabric.Line[]>;
    onCanvasChange?: (dataUrl: string) => void;
}

export const useCanvasInitialization = ({
    canvasElRef,
    containerRef,
    canvasWidth,
    canvasHeight,
    snapLinesRef,
    onCanvasChange,
}: UseCanvasInitializationProps) => {
    const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null);
    const seamRef = useRef<fabric.Line | null>(null);

    // Stable ref for callback
    const onCanvasChangeRef = useRef(onCanvasChange);
    useEffect(() => {
        onCanvasChangeRef.current = onCanvasChange;
    }, [onCanvasChange]);

    useEffect(() => {
        if (!canvasElRef.current || fabricCanvas) return;

        const canvas = new fabric.Canvas(canvasElRef.current, {
            preserveObjectStacking: true,
            selection: true,
            backgroundColor: '#f0f0f0',
            width: canvasWidth,
            height: canvasHeight,
        });

        // Add Seam Line (Center of spread)
        const seam = new fabric.Line([canvasWidth / 2, 0, canvasWidth / 2, canvasHeight], {
            stroke: '#ccc',
            strokeWidth: 2,
            selectable: false,
            evented: false,
            strokeDashArray: [5, 5],
        });
        (seam as CustomFabricObject).data = { id: 'seam' };
        seamRef.current = seam;
        canvas.add(seam);
        canvas.sendObjectToBack(seam);

        // Helper to track moving state
        const setMoving = (e: { target?: fabric.Object }) => {
            if (e.target) (e.target as ExtendedFabricObject).isMoving = true;
        };
        canvas.on('object:moving', setMoving);
        canvas.on('object:rotating', setMoving);

        // Cleanup moved state on mouse up
        canvas.on('mouse:up', () => {
            canvas.getObjects().forEach(o => (o as ExtendedFabricObject).isMoving = false);
            if (snapLinesRef.current) {
                snapLinesRef.current.forEach(line => canvas.remove(line));
                snapLinesRef.current.length = 0;
            }
            canvas.requestRenderAll();

             if (onCanvasChangeRef.current) {
                const dataUrl = canvas.toDataURL({
                    format: 'jpeg',
                    quality: APP_CONFIG.THUMBNAIL_QUALITY,
                    multiplier: APP_CONFIG.THUMBNAIL_MULTIPLIER
                });
                onCanvasChangeRef.current(dataUrl);
            }
        });

        canvas.on('mouse:down', () => {
            containerRef.current?.focus();
        });

        setFabricCanvas(canvas);

        return () => {
            canvas.dispose();
            setFabricCanvas(null);
        };
    }, [canvasElRef, containerRef, canvasWidth, canvasHeight, snapLinesRef]);

    return { fabricCanvas, seamRef };
};
