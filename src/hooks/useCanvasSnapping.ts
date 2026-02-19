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
import type { ImageContent } from '../types';
import { calculateSnap, getActiveSnapLines } from '../utils/snapping';
import { CustomFabricObject } from './fabricTypes';
import { getZoomCompensatedSizes } from '../utils/fabricRenderer';
import { CanvasImageElement } from './CanvasImageElement';
import { CanvasTextElement } from './CanvasTextElement';
import { useIsSnappingEnabled, useCurrentSpreadIndex } from '../states/uiStore';
import { useAlbumSpreads, useUpdateElement } from '../states/albumStore';

/**
 * Props for useCanvasSnapping.
 */
interface UseCanvasSnappingProps {
    /** The Fabric.js canvas instance. */
    fabricCanvas: fabric.Canvas | null;
    /** Width of the canvas in pixels. */
    canvasWidth: number;
    /** Height of the canvas in pixels. */
    canvasHeight: number;
    /** Current zoom level percentage. */
    zoom: number;
    /** Ref to store active snap lines. */
    snapLinesRef: React.RefObject<fabric.Line[]>;
}

/**
 * Hook to handle snapping of objects to the canvas edges and center during movement.
 * Also handles updating the element's layout in the global store after modification.
 */
export const useCanvasSnapping = ({
    fabricCanvas,
    canvasWidth,
    canvasHeight,
    zoom,
    snapLinesRef,
}: UseCanvasSnappingProps) => {
    const isSnappingEnabled = useIsSnappingEnabled();
    const spreads = useAlbumSpreads();
    const currentSpreadIndex = useCurrentSpreadIndex();
    const spread = useMemo(() => spreads[currentSpreadIndex], [spreads, currentSpreadIndex]);
    const onElementUpdate = useUpdateElement();

    const onElementUpdateRef = useRef(onElementUpdate);
    const spreadRef = useRef(spread);
    const isSnappingEnabledRef = useRef(isSnappingEnabled);
    // Cache UI sizes to avoid recalculating on every mouse move
    const uiSizesRef = useRef(getZoomCompensatedSizes(zoom));

    useEffect(() => {
        onElementUpdateRef.current = onElementUpdate;
        spreadRef.current = spread;
        isSnappingEnabledRef.current = isSnappingEnabled;
        uiSizesRef.current = getZoomCompensatedSizes(zoom);
    }, [onElementUpdate, spread, isSnappingEnabled, zoom]);

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
            const obj = e.target;
            if (!obj) return;

            if (snapLinesRef.current) {
                snapLinesRef.current.forEach(line => canvas.remove(line));
                snapLinesRef.current.length = 0;
            }

            // Handle image elements
            if (obj instanceof CanvasImageElement) {
                obj.updateLayoutFromPixels(e.transform?.corner || '', canvasWidth, canvasHeight);
                const imageContent = obj.pageElement.content as ImageContent;
                onElementUpdateRef.current(spreadRef.current.id, obj.pageElement.id, {
                    box: obj.pageElement.box,
                    content: {
                        ...imageContent,
                        contentTransform: imageContent.contentTransform,
                    }
                });
                // Handle text elements
            } else if (obj instanceof CanvasTextElement) {
                obj.updateLayoutFromPixels(e.transform?.corner || '', canvasWidth, canvasHeight);
                onElementUpdateRef.current(spreadRef.current.id, obj.pageElement.id, {
                    box: obj.pageElement.box,
                });
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
