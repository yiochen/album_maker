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
import { useEffect, useRef, useMemo } from 'react';
import * as fabric from 'fabric';
import { calculateSnap, getActiveSnapLines } from '../utils/snapping';
import { CustomFabricObject } from './fabricTypes';
import { APP_CONFIG } from '../config';
import { getZoomCompensatedSizes } from './useCanvasObjects';
import { CanvasPageElement } from './CanvasPageElement';
import { useIsSnappingEnabled, useCurrentSpreadIndex } from '../states/uiStore';
import { useAlbumSpreads, useUpdateElement } from '../states/albumStore';

interface UseCanvasSnappingProps {
    fabricCanvas: fabric.Canvas | null;
    canvasWidth: number;
    canvasHeight: number;
    zoom: number;
    snapLinesRef: React.RefObject<fabric.Line[]>;
    onCanvasChange?: (dataUrl: string) => void;
}

export const useCanvasSnapping = ({
    fabricCanvas,
    canvasWidth,
    canvasHeight,
    zoom,
    snapLinesRef,
    onCanvasChange,
}: UseCanvasSnappingProps) => {
    const isSnappingEnabled = useIsSnappingEnabled();
    const spreads = useAlbumSpreads();
    const currentSpreadIndex = useCurrentSpreadIndex();
    const spread = useMemo(() => spreads[currentSpreadIndex], [spreads, currentSpreadIndex]);
    const onElementUpdate = useUpdateElement();

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

            // Convert current position to top-left for snapping calculations
            const isCenterOrigin = obj.originX === 'center';
            const halfWidth = scaledWidth / 2;
            const halfHeight = scaledHeight / 2;
            const topLeftX = isCenterOrigin ? obj.left! - halfWidth : obj.left!;
            const topLeftY = isCenterOrigin ? obj.top! - halfHeight : obj.top!;

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
                    // Convert snapped top-left back to object position
                    const snappedTopLeftX = (snapResult.position.x / 100) * canvasWidth;
                    const snappedTopLeftY = (snapResult.position.y / 100) * canvasHeight;
                    newLeft = isCenterOrigin ? snappedTopLeftX + halfWidth : snappedTopLeftX;
                    newTop = isCenterOrigin ? snappedTopLeftY + halfHeight : snappedTopLeftY;

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
            // No constraints - allow elements to move freely including outside canvas (bleed)
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleObjectModified = (e: { target?: fabric.Object; transform?: any }) => {
            const obj = e.target as CanvasPageElement;
            if (!obj || !(obj instanceof CanvasPageElement)) return;

            if (snapLinesRef.current) {
                snapLinesRef.current.forEach(line => canvas.remove(line));
                snapLinesRef.current.length = 0;
            }

            // Implementation of anchor locking and normalization
            obj.updateLayoutFromPixels(e.transform?.corner || '', canvasWidth, canvasHeight);

            onElementUpdateRef.current(spreadRef.current.id, obj.pageElement.id, {
                box: obj.pageElement.box,
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
    }, [fabricCanvas, canvasWidth, canvasHeight, snapLinesRef]);
};
