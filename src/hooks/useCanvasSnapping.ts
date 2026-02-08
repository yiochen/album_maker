/**
 * useCanvasSnapping - Handles snapping and bleed constraints during object movement.
 *
 * PIXEL COORDINATE SYSTEM:
 * - All props (canvasWidth, canvasHeight) are in CANVAS/SCREEN PIXELS (at SCREEN_PPI, e.g., 96 PPI)
 * - Fabric.js object positions (left, top) are in CANVAS PIXELS
 * - Updates to onElementUpdate are converted to MODEL PIXELS (at PPI, e.g., 300 PPI) via toModelPx()
 *
 * FabricJS uses center origin (originX/originY: 'center'), so left/top represent the center position.
 */
import { useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import { calculateSnap, getActiveSnapLines } from '../utils/snapping';
import { CustomFabricObject } from './fabricTypes';
import { GaplessPageItem } from '../components/GaplessPageItem';
import { APP_CONFIG } from '../config';
import type { Spread, PageElement } from '../types';
import { toCanvasPx, toModelPx } from '../utils/imageUtils';
import { getZoomCompensatedSizes } from './useCanvasObjects';

interface UseCanvasSnappingProps {
    fabricCanvas: fabric.Canvas | null;
    canvasWidth: number;
    canvasHeight: number;
    spread: Spread;
    isSnappingEnabled: boolean;
    zoom: number;
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
    zoom,
    snapLinesRef,
    onElementUpdate,
    onCanvasChange,
}: UseCanvasSnappingProps) => {

    const onElementUpdateRef = useRef(onElementUpdate);
    const onCanvasChangeRef = useRef(onCanvasChange);
    const spreadRef = useRef(spread);
    const isSnappingEnabledRef = useRef(isSnappingEnabled);
    // Cache UI sizes to avoid recalculating on every mouse move
    const uiSizesRef = useRef(getZoomCompensatedSizes(zoom));

    useEffect(() => {
        onElementUpdateRef.current = onElementUpdate;
        onCanvasChangeRef.current = onCanvasChange;
        spreadRef.current = spread;
        isSnappingEnabledRef.current = isSnappingEnabled;
        uiSizesRef.current = getZoomCompensatedSizes(zoom);
    }, [onElementUpdate, onCanvasChange, spread, isSnappingEnabled, zoom]);

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

            // With center origin, convert center position to top-left for snapping calculations
            const halfWidth = scaledWidth / 2;
            const halfHeight = scaledHeight / 2;
            const topLeftX = obj.left! - halfWidth;
            const topLeftY = obj.top! - halfHeight;

            // Only calculate snapping if enabled
            if (isSnappingEnabledRef.current) {
                const percentX = (topLeftX / canvasWidth) * 100;
                const percentY = (topLeftY / canvasHeight) * 100;
                const percentW = (scaledWidth / canvasWidth) * 100;
                const percentH = (scaledHeight / canvasHeight) * 100;

                const snapResult = calculateSnap(
                    { x: percentX, y: percentY },
                    { width: percentW, height: percentH }
                );

                if (snapResult.snappedEdges.length > 0) {
                    // Convert snapped top-left back to center position
                    const snappedTopLeftX = (snapResult.position.x / 100) * canvasWidth;
                    const snappedTopLeftY = (snapResult.position.y / 100) * canvasHeight;
                    newLeft = snappedTopLeftX + halfWidth;
                    newTop = snappedTopLeftY + halfHeight;

                    const activeLines = getActiveSnapLines(snapResult.snappedEdges);
                    const uiSizes = uiSizesRef.current;

                    activeLines.forEach(lineData => {
                        let x1 = 0, y1 = 0, x2 = 0, y2 = 0;
                        if (lineData.orientation === 'vertical') {
                            x1 = x2 = (lineData.position / 100) * canvasWidth;
                            y1 = 0;
                            y2 = canvasHeight;
                        } else {
                            y1 = y2 = (lineData.position / 100) * canvasHeight;
                            x1 = 0;
                            x2 = canvasWidth;
                        }

                        const fabricLine = new fabric.Line([x1, y1, x2, y2], {
                            stroke: '#ff00ff',
                            strokeWidth: uiSizes.snapLineStrokeWidth,
                            selectable: false,
                            evented: false,
                            strokeDashArray: [uiSizes.snapLineDash, uiSizes.snapLineDash],
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

            // Bleed constraints - using center origin
            const bleedMargin = toCanvasPx(APP_CONFIG.BLEED_MARGIN);
            const minCenterX = -halfWidth + bleedMargin;
            const maxCenterX = canvasWidth + halfWidth - bleedMargin;
            const minCenterY = -halfHeight + bleedMargin;
            const maxCenterY = canvasHeight + halfHeight - bleedMargin;

            if (obj.left! < minCenterX) obj.left = minCenterX;
            else if (obj.left! > maxCenterX) obj.left = maxCenterX;
            if (obj.top! < minCenterY) obj.top = minCenterY;
            else if (obj.top! > maxCenterY) obj.top = maxCenterY;
        };

        const handleObjectModified = (e: { target?: fabric.Object, transform?: { corner?: string } }) => {
            const obj = e.target as CustomFabricObject;
            if (!obj || !obj.data) return;

            if (snapLinesRef.current) {
                snapLinesRef.current.forEach(line => canvas.remove(line));
                snapLinesRef.current.length = 0;
            }

            if (obj instanceof GaplessPageItem) {
                // Use GaplessPageItem logic for normalized box updates
                const updates = obj.updateLayoutFromPixels(
                    canvasWidth,
                    canvasHeight,
                    e.transform?.corner // Pass the active corner to enable anchor locking
                );

                onElementUpdateRef.current(spreadRef.current.id, obj.data.id, updates);
            } else {
                // Legacy fallback (should happen less often as we migrate)
                onElementUpdateRef.current(spreadRef.current.id, obj.data.id, {
                    position: { x: toModelPx(obj.left!), y: toModelPx(obj.top!) },
                    size: {
                        width: toModelPx(obj.getScaledWidth()),
                        height: toModelPx(obj.getScaledHeight()),
                    },
                });
            }

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
        // We also want to capture resizing end, which object:modified covers.

        return () => {
            canvas.off('object:moving', handleObjectMoving);
            canvas.off('object:modified', handleObjectModified);
        };
    }, [fabricCanvas, canvasWidth, canvasHeight, snapLinesRef]);
};
