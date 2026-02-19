import { useState, useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import { CustomFabricObject, ExtendedFabricObject } from './fabricTypes';

/**
 * Props for useCanvasInitialization.
 */
interface UseCanvasInitializationProps {
    /** Ref to the canvas HTML element. */
    canvasElRef: React.RefObject<HTMLCanvasElement | null>;
    /** Ref to the container div element (for focus management). */
    containerRef: React.RefObject<HTMLDivElement | null>;
    /** Width of the canvas in pixels. */
    canvasWidth: number;
    /** Height of the canvas in pixels. */
    canvasHeight: number;
    /** Ref to the wrapper div element (for clipping hidden textarea). */
    wrapperRef: React.RefObject<HTMLDivElement | null>;
    /** Ref to store active snap lines. */
    snapLinesRef: React.RefObject<fabric.Line[]>;
}

/**
 * Hook to initialize the Fabric.js canvas instance.
 *
 * It sets up the canvas, background color, and default objects like the seam line.
 * It also handles basic event listeners for blocking React sync during interaction.
 */
export const useCanvasInitialization = ({
    canvasElRef,
    containerRef,
    canvasWidth,
    canvasHeight,
    wrapperRef,
    snapLinesRef,
}: UseCanvasInitializationProps) => {
    const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null);
    const seamRef = useRef<fabric.Line | null>(null);


    useEffect(() => {
        if (!canvasElRef.current) return;

        const canvas = new fabric.Canvas(canvasElRef.current, {
            preserveObjectStacking: true,
            selection: true,
            backgroundColor: '#f0f0f0',
            width: canvasWidth,
            height: canvasHeight,
            // Force hidden textarea to be inside our clipped wrapper
            // rather than appended to body, which prevents layout shifts.
            hiddenTextareaContainer: wrapperRef.current || undefined,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);

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

        // Helper to track active interactions that should block React layout synchronization
        const setPreventSync = (e: { target?: fabric.Object }) => {
            if (e.target) (e.target as ExtendedFabricObject).preventLayoutSync = true;
        };
        canvas.on('object:moving', setPreventSync);
        canvas.on('object:scaling', setPreventSync);
        canvas.on('object:resizing', setPreventSync);
        canvas.on('object:rotating', setPreventSync);

        // Cleanup interaction state on mouse up
        canvas.on('mouse:up', () => {
            canvas.getObjects().forEach(o => (o as ExtendedFabricObject).preventLayoutSync = false);
            if (snapLinesRef.current) {
                snapLinesRef.current.forEach(line => canvas.remove(line));
                snapLinesRef.current.length = 0;
            }
            canvas.requestRenderAll();
        });

        canvas.on('mouse:down', () => {
            containerRef.current?.focus();
        });

        setFabricCanvas(canvas);

        return () => {
            canvas.dispose();
            setFabricCanvas(null);
        };
    }, [canvasElRef, containerRef, canvasWidth, canvasHeight, wrapperRef, snapLinesRef]);

    return { fabricCanvas, seamRef };
};
