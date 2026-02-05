import { useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import type { Spread, PageElement, AlbumSettings } from '../types';
import { APP_CONFIG } from '../config';
import { CustomFabricObject, ExtendedFabricObject } from './fabricTypes';

export const getZoomCompensatedSizes = (zoomPercent: number) => {
    const scale = zoomPercent / 100;
    const inverseScale = 1 / scale;
    const base = APP_CONFIG.BASE_UI_SIZES;

    return {
        cornerSize: base.cornerSize * inverseScale,
        borderScaleFactor: base.borderWidth * inverseScale,
        seamStrokeWidth: base.seamStrokeWidth * inverseScale,
        seamDash: base.seamDash * inverseScale,
        snapLineStrokeWidth: base.snapLineStrokeWidth * inverseScale,
        snapLineDash: base.snapLineDash * inverseScale,
    };
};

interface UseCanvasObjectsProps {
    fabricCanvas: fabric.Canvas | null;
    spread: Spread;
    settings: AlbumSettings;
    ppi: number;
    toCanvasPx: (value: number) => number;
    selectedElementId: string | null;
    zoom: number;
}

export const useCanvasObjects = ({
    fabricCanvas,
    spread,
    settings,
    ppi,
    toCanvasPx,
    selectedElementId,
    zoom,
}: UseCanvasObjectsProps) => {
    const loadingIds = useRef<Set<string>>(new Set());

    // Refs for props
    const spreadRef = useRef(spread);
    spreadRef.current = spread;
    const selectedElementIdRef = useRef(selectedElementId);
    selectedElementIdRef.current = selectedElementId;

    // Track the last spread ID
    const lastSyncedSpreadId = useRef<string | null>(null);

    const modelWidth = settings.pageWidth * 2 * ppi;
    const modelHeight = settings.pageHeight * ppi;

    const isObjectMoving = (obj: fabric.Object) => {
        return (obj as ExtendedFabricObject).isMoving;
    };

    // Sync State to Fabric
    useEffect(() => {
        const canvas = fabricCanvas;
        if (!canvas) return;

        const currentSpread = spreadRef.current;
        const isSpreadChange = lastSyncedSpreadId.current !== currentSpread.id;

        lastSyncedSpreadId.current = currentSpread.id;

        const currentObjects = canvas.getObjects() as CustomFabricObject[];
        const validIds = new Set<string>();
        const elementsToLoad: { element: PageElement, width: number, height: number }[] = [];

        currentSpread.elements.forEach(element => {
            validIds.add(element.id);
            const existingObj = currentObjects.find(o => o.data?.id === element.id);

            if (existingObj) {
                if (existingObj instanceof fabric.Image) {
                    const img = existingObj;
                    const isLocked = element.lockAspectRatio;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    if ((img as any).uniformScaling !== isLocked) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (img as any).uniformScaling = isLocked;
                        img.setCoords();
                    }

                    if (isSpreadChange && !isObjectMoving(existingObj)) {
                        const targetWidth = element.size.width;
                        const targetHeight = element.size.height;
                        img.set({
                            left: toCanvasPx(element.position.x),
                            top: toCanvasPx(element.position.y),
                            scaleX: toCanvasPx(targetWidth) / (img.width || 1),
                            scaleY: toCanvasPx(targetHeight) / (img.height || 1),
                        });
                        img.setCoords();
                    }
                }
            } else {
                if (!loadingIds.current.has(element.id)) {
                    elementsToLoad.push({
                        element,
                        width: element.size.width,
                        height: element.size.height
                    });
                }
            }
        });

        currentObjects.forEach(obj => {
            const customObj = obj as CustomFabricObject;
            if (customObj.data?.id && customObj.data.id !== 'seam' && !validIds.has(customObj.data.id)) {
                canvas.remove(obj);
            }
        });

        const zoomValue = zoom;
        elementsToLoad.forEach(async ({ element, width, height }) => {
            if (loadingIds.current.has(element.id)) return;
            loadingIds.current.add(element.id);

            try {
                const img = await fabric.Image.fromURL(element.imageUrl, { crossOrigin: 'anonymous' });

                const isLocked = element.lockAspectRatio;
                const uiSizes = getZoomCompensatedSizes(zoomValue);

                img.set({
                    left: toCanvasPx(element.position.x),
                    top: toCanvasPx(element.position.y),
                    scaleX: toCanvasPx(width) / (img.width || 1),
                    scaleY: toCanvasPx(height) / (img.height || 1),
                    data: { id: element.id },
                    lockRotation: true,
                    uniformScaling: isLocked,
                    cornerStyle: 'circle',
                    cornerColor: 'white',
                    cornerStrokeColor: '#333',
                    borderColor: '#333',
                    transparentCorners: false,
                    cornerSize: uiSizes.cornerSize,
                    borderScaleFactor: uiSizes.borderScaleFactor,
                    objectCaching: true,
                    noScaleCache: true,
                });

                canvas.add(img);
                if (selectedElementIdRef.current === element.id) {
                    canvas.setActiveObject(img);
                }
                canvas.requestRenderAll();
            } catch (err) {
                console.error("Failed to load", element.imageUrl, err);
            } finally {
                loadingIds.current.delete(element.id);
            }
        });

        canvas.requestRenderAll();
    }, [fabricCanvas, spread.id, spread.elements.length, zoom, modelWidth, modelHeight, ppi, toCanvasPx]);

    // Update UI sizes when zoom changes
    useEffect(() => {
        const canvas = fabricCanvas;
        if (!canvas) return;

        const uiSizes = getZoomCompensatedSizes(zoom);
        canvas.getObjects().forEach(obj => {
            const customObj = obj as CustomFabricObject;
            if (customObj.data?.id === 'seam') {
                (obj as fabric.Line).set({
                    strokeWidth: uiSizes.seamStrokeWidth,
                    strokeDashArray: [uiSizes.seamDash, uiSizes.seamDash],
                });
                return;
            }
            if (obj.type === 'line' && (obj as fabric.Line).stroke === '#ff00ff') {
                (obj as fabric.Line).set({
                    strokeWidth: uiSizes.snapLineStrokeWidth,
                    strokeDashArray: [uiSizes.snapLineDash, uiSizes.snapLineDash],
                });
                return;
            }

            obj.set({
                cornerSize: uiSizes.cornerSize,
                borderScaleFactor: uiSizes.borderScaleFactor,
            });
        });
        canvas.requestRenderAll();
    }, [zoom, fabricCanvas]);
};
