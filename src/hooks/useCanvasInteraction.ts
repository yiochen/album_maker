import { useEffect, useCallback, useState, useRef } from 'react';
import * as fabric from 'fabric';
import type { Spread, PoolImage, PageElement } from '../types';
import { APP_CONFIG } from '../config';
import { calculateSnap, getActiveSnapLines } from '../utils/snapping';
import { CustomFabricObject } from './useCanvasRender';

interface UseCanvasInteractionProps {
    fabricCanvas: fabric.Canvas | null;
    canvasWidth: number;
    canvasHeight: number;
    spread: Spread;
    selectedElementId: string | null;
    isSnappingEnabled: boolean;
    zoom: number;
    toCanvasPx: (value: number) => number;
    toModelPx: (value: number) => number;
    snapLinesRef: React.RefObject<fabric.Line[]>;
    wrapperRef: React.RefObject<HTMLDivElement | null>;
    onElementSelect: (elementId: string | null) => void;
    onElementUpdate: (spreadId: string, elementId: string, updates: Partial<PageElement>) => void;
    onElementDelete: (spreadId: string, elementId: string) => void;
    onImageDrop: (spreadId: string, image: PoolImage, position: { x: number; y: number }) => void;
    onCanvasChange?: (dataUrl: string) => void;
}

export const useCanvasInteraction = ({
    fabricCanvas,
    canvasWidth,
    canvasHeight,
    spread,
    isSnappingEnabled,
    zoom,
    toCanvasPx,
    toModelPx,
    snapLinesRef,
    wrapperRef,
    onElementSelect,
    onElementUpdate,
    onElementDelete,
    onImageDrop,
    onCanvasChange,
}: UseCanvasInteractionProps) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const [hasSelection, setHasSelection] = useState(false);

    // Refs for callbacks
    const onElementSelectRef = useRef(onElementSelect);
    const onElementUpdateRef = useRef(onElementUpdate);
    const onElementDeleteRef = useRef(onElementDelete);
    const onImageDropRef = useRef(onImageDrop);
    const onCanvasChangeRef = useRef(onCanvasChange);
    const spreadRef = useRef(spread);
    const isSnappingEnabledRef = useRef(isSnappingEnabled);

    useEffect(() => {
        onElementSelectRef.current = onElementSelect;
        onElementUpdateRef.current = onElementUpdate;
        onElementDeleteRef.current = onElementDelete;
        onImageDropRef.current = onImageDrop;
        onCanvasChangeRef.current = onCanvasChange;
        spreadRef.current = spread;
        isSnappingEnabledRef.current = isSnappingEnabled;
    }, [onElementSelect, onElementUpdate, onElementDelete, onImageDrop, onCanvasChange, spread, isSnappingEnabled]);

    // Keyboard Deletion
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (['INPUT', 'TEXTAREA'].includes(target.tagName) && !target.closest('.canvas-container')) {
                return;
            }

            if (e.key === 'Delete' || e.key === 'Backspace') {
                const canvas = fabricCanvas;
                if (!canvas) return;
                const activeObj = canvas.getActiveObject() as CustomFabricObject;
                if (activeObj && activeObj.data) {
                    onElementDeleteRef.current(spreadRef.current.id, activeObj.data.id);
                    canvas.discardActiveObject();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [fabricCanvas]);

    // Fabric Event Listeners
    useEffect(() => {
        const canvas = fabricCanvas;
        if (!canvas) return;

        // Selection
        const handleSelection = (e: { selected: fabric.Object[] }) => {
            setHasSelection(true);
            const selected = e.selected || [];
            if (selected.length === 1) {
                const obj = selected[0] as CustomFabricObject;
                if (obj.data?.id) {
                    onElementSelectRef.current(obj.data.id);
                }
            } else {
                onElementSelectRef.current(null);
            }
        };

        const handleSelectionCleared = () => {
            setHasSelection(false);
            onElementSelectRef.current(null);
        };

        canvas.on('selection:created', handleSelection);
        canvas.on('selection:updated', handleSelection);
        canvas.on('selection:cleared', handleSelectionCleared);

        // Movement with Snapping
        // object:moving and rotating are already attached in useCanvasRender for simple state tracking,
        // but we attach here for interaction logic (snapping). Fabric supports multiple listeners.

        canvas.on('object:moving', (e) => {
            const obj = e.target as CustomFabricObject;
            if (!obj || !obj.data) return;

            // Cache scaled dimensions - only compute once per move event
            const scaledWidth = obj.getScaledWidth();
            const scaledHeight = obj.getScaledHeight();
            let newLeft = obj.left!;
            let newTop = obj.top!;

            // Clear existing snap lines
            const snapLines = snapLinesRef.current;
            if (snapLines && snapLines.length > 0) {
                snapLines.forEach(line => canvas.remove(line));
                snapLines.length = 0;
            }

            // Only calculate snapping if enabled - skip expensive calculations otherwise
            if (isSnappingEnabledRef.current) {
                const percentX = (obj.left! / canvasWidth) * 100;
                const percentY = (obj.top! / canvasHeight) * 100;
                const percentW = (scaledWidth / canvasWidth) * 100;
                const percentH = (scaledHeight / canvasHeight) * 100;

                const snapResult = calculateSnap(
                    { x: percentX, y: percentY },
                    { width: percentW, height: percentH }
                );

                if (snapResult.snappedEdges.length > 0) {
                    newLeft = (snapResult.position.x / 100) * canvasWidth;
                    newTop = (snapResult.position.y / 100) * canvasHeight;

                    const activeLines = getActiveSnapLines(snapResult.snappedEdges);

                    activeLines.forEach(line => {
                        let x1 = 0, y1 = 0, x2 = 0, y2 = 0;
                        if (line.orientation === 'vertical') {
                            x1 = x2 = (line.position / 100) * canvasWidth;
                            y1 = 0;
                            y2 = canvasHeight;
                        } else {
                            y1 = y2 = (line.position / 100) * canvasHeight;
                            x1 = 0;
                            x2 = canvasWidth;
                        }

                        const fabricLine = new fabric.Line([x1, y1, x2, y2], {
                            stroke: '#ff00ff',
                            strokeWidth: 1,
                            selectable: false,
                            evented: false,
                            strokeDashArray: [4, 4],
                        });
                        canvas.add(fabricLine);
                        snapLines.push(fabricLine);
                    });
                }
            }

            // Only apply position changes if snapping modified the position
            // This lets FabricJS handle native dragging without interference
            if (isSnappingEnabledRef.current) {
                obj.left = newLeft;
                obj.top = newTop;
            }

            // Bleed constraints - only clamp if outside bounds
            const bleedMargin = toCanvasPx(APP_CONFIG.BLEED_MARGIN);
            const minX = -scaledWidth + bleedMargin;
            const maxX = canvasWidth - bleedMargin;
            const minY = -scaledHeight + bleedMargin;
            const maxY = canvasHeight - bleedMargin;

            // Only modify position if clamping is actually needed
            if (obj.left! < minX) obj.left = minX;
            else if (obj.left! > maxX) obj.left = maxX;
            if (obj.top! < minY) obj.top = minY;
            else if (obj.top! > maxY) obj.top = maxY;
        });

        // Modification
        canvas.on('object:modified', (e) => {
            const obj = e.target as CustomFabricObject;
            if (!obj || !obj.data) return;

            if (snapLinesRef.current) {
                snapLinesRef.current.forEach(line => canvas.remove(line));
                snapLinesRef.current.length = 0;
            }

            onElementUpdateRef.current(spreadRef.current.id, obj.data.id, {
                position: { x: toModelPx(obj.left!), y: toModelPx(obj.top!) },
                size: {
                    width: toModelPx(obj.getScaledWidth()),
                    height: toModelPx(obj.getScaledHeight()),
                },
            });

            if (onCanvasChangeRef.current) {
                const dataUrl = canvas.toDataURL({
                    format: 'jpeg',
                    quality: APP_CONFIG.THUMBNAIL_QUALITY,
                    multiplier: APP_CONFIG.THUMBNAIL_MULTIPLIER
                });
                onCanvasChangeRef.current(dataUrl);
            }
        });

        return () => {
            canvas.off('selection:created', handleSelection);
            canvas.off('selection:updated', handleSelection);
            canvas.off('selection:cleared', handleSelectionCleared);
        };
    }, [fabricCanvas, canvasWidth, canvasHeight, snapLinesRef, toCanvasPx, toModelPx]); // Re-run when canvas instance changes

    // Drag Drop Handlers
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

            onImageDropRef.current(spreadRef.current.id, image, {
                x: toModelPx(canvasX),
                y: toModelPx(canvasY),
            });
        } catch (err) {
            console.error('Failed to parse drop', err);
        }
    }, [zoom, wrapperRef, toModelPx]);

    return {
        isDragOver,
        hasSelection,
        handleDragOver,
        handleDragLeave,
        handleDrop,
    };
};
