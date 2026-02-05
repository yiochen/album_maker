import { useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import { calculateSnap, getActiveSnapLines } from '../utils/snapping';
import { CustomFabricObject } from './fabricTypes';
import { APP_CONFIG } from '../config';
import type { Spread, PageElement } from '../types';

interface UseCanvasSnappingProps {
    fabricCanvas: fabric.Canvas | null;
    canvasWidth: number;
    canvasHeight: number;
    spread: Spread;
    isSnappingEnabled: boolean;
    toCanvasPx: (value: number) => number;
    toModelPx: (value: number) => number;
    snapLinesRef: React.RefObject<fabric.Line[]>;
    onElementUpdate: (spreadId: string, elementId: string, updates: Partial<PageElement>) => void;
    onCanvasChange?: (dataUrl: string) => void;
}

export const useCanvasSnapping = ({
    fabricCanvas,
    canvasWidth,
    canvasHeight,
    spread,
    isSnappingEnabled,
    toCanvasPx,
    toModelPx,
    snapLinesRef,
    onElementUpdate,
    onCanvasChange,
}: UseCanvasSnappingProps) => {

    const onElementUpdateRef = useRef(onElementUpdate);
    const onCanvasChangeRef = useRef(onCanvasChange);
    const spreadRef = useRef(spread);
    const isSnappingEnabledRef = useRef(isSnappingEnabled);

    useEffect(() => {
        onElementUpdateRef.current = onElementUpdate;
        onCanvasChangeRef.current = onCanvasChange;
        spreadRef.current = spread;
        isSnappingEnabledRef.current = isSnappingEnabled;
    }, [onElementUpdate, onCanvasChange, spread, isSnappingEnabled]);

    useEffect(() => {
        const canvas = fabricCanvas;
        if (!canvas) return;

        const handleObjectMoving = (e: { target?: fabric.Object }) => {
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

            // Only calculate snapping if enabled
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
            if (isSnappingEnabledRef.current) {
                obj.left = newLeft;
                obj.top = newTop;
            }

            // Bleed constraints
            const bleedMargin = toCanvasPx(APP_CONFIG.BLEED_MARGIN);
            const minX = -scaledWidth + bleedMargin;
            const maxX = canvasWidth - bleedMargin;
            const minY = -scaledHeight + bleedMargin;
            const maxY = canvasHeight - bleedMargin;

            if (obj.left! < minX) obj.left = minX;
            else if (obj.left! > maxX) obj.left = maxX;
            if (obj.top! < minY) obj.top = minY;
            else if (obj.top! > maxY) obj.top = maxY;
        };

        const handleObjectModified = (e: { target?: fabric.Object }) => {
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
        };

        canvas.on('object:moving', handleObjectMoving);
        canvas.on('object:modified', handleObjectModified);

        return () => {
            canvas.off('object:moving', handleObjectMoving);
            canvas.off('object:modified', handleObjectModified);
        };
    }, [fabricCanvas, canvasWidth, canvasHeight, snapLinesRef, toCanvasPx, toModelPx]);
};
