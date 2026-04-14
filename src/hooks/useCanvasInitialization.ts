import { useState, useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import { CustomFabricObject, ExtendedFabricObject } from './fabricTypes';
import { useSetFabricCanvas, useClearFabricCanvasIfMatch } from '../states/editorInfraStore';

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
    const setSharedFabricCanvas = useSetFabricCanvas();
    const clearSharedFabricCanvasIfMatch = useClearFabricCanvasIfMatch();

    useEffect(() => {
        if (!canvasElRef.current) return;

        const canvas = new fabric.Canvas(canvasElRef.current, {
            preserveObjectStacking: true,
            selection: true,
            backgroundColor: '#f0f0f0',
            width: canvasWidth,
            height: canvasHeight,
            selectionColor: 'rgba(99, 102, 241, 0.15)',
            selectionBorderColor: '#6366f1',
            selectionLineWidth: 2,
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

        // Hover preview: draw accent border when hovering over an unselected element.
        // We only clear+redraw the top canvas when the hover state actually changes,
        // so we don't wipe out Fabric's own drawings (rubber-band rect, selection controls).
        let hoveredObj: fabric.Object | null = null;
        let topContextDirty = false; // whether we need to clear+redraw

        canvas.on('mouse:over', (e: { target?: fabric.Object }) => {
            const target = e.target;
            if (!target || !target.selectable) return;
            if (canvas.getActiveObject() === target) return;
            if (hoveredObj === target) return;
            hoveredObj = target;
            topContextDirty = true;
            canvas.requestRenderAll();
        });
        canvas.on('mouse:out', (e: { target?: fabric.Object }) => {
            if (e.target && e.target === hoveredObj) {
                hoveredObj = null;
                topContextDirty = true;
                canvas.requestRenderAll();
            }
        });
        // Also mark dirty when selection changes — the hovered object may now be
        // the active object, so we need to remove the hover highlight.
        const markDirty = () => { topContextDirty = true; };
        canvas.on('selection:created', markDirty);
        canvas.on('selection:updated', markDirty);
        canvas.on('selection:cleared', markDirty);
        canvas.on('object:moving', markDirty);
        canvas.on('object:scaling', markDirty);
        canvas.on('object:resizing', markDirty);
        canvas.on('object:rotating', markDirty);
        canvas.on('object:modified', markDirty);

        canvas.on('after:render', () => {
            // Only clear+redraw the top context when the hover/selection state changed.
            // This avoids wiping Fabric's rubber-band rect and selection controls
            // on frames where only the objects (lower canvas) were re-rendered.
            const hasActiveObject = !!canvas.getActiveObject();
            if (!topContextDirty && !hasActiveObject) return;
            topContextDirty = false;

            const ctx = canvas.getTopContext();
            canvas.clearContext(ctx);
            canvas.drawControls(ctx);

            if (!hoveredObj || canvas.getActiveObject() === hoveredObj) return;
            const bound = hoveredObj.getBoundingRect();
            ctx.save();
            ctx.strokeStyle = '#6366f1';
            ctx.lineWidth = (hoveredObj as unknown as { borderLineWidth?: number }).borderLineWidth || 2;
            ctx.strokeRect(bound.left, bound.top, bound.width, bound.height);
            ctx.restore();
        });

        setFabricCanvas(canvas);
        setSharedFabricCanvas(canvas);

        // Expose for E2E tests — allows programmatic object selection on headless CI
        // where pixel-based Fabric hit-testing is unreliable.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).__FABRIC_CANVAS__ = canvas;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).__FABRIC_MODULE__ = fabric;

        return () => {
            canvas.dispose();
            setFabricCanvas(null);
            clearSharedFabricCanvasIfMatch(canvas);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (window as any).__FABRIC_CANVAS__;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (window as any).__FABRIC_MODULE__;
        };
    }, [
        canvasElRef,
        containerRef,
        canvasWidth,
        canvasHeight,
        wrapperRef,
        snapLinesRef,
        setSharedFabricCanvas,
        clearSharedFabricCanvasIfMatch,
    ]);

    return { fabricCanvas, seamRef };
};
