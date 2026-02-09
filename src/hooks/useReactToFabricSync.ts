import { useEffect, useRef, useMemo } from 'react';
import * as fabric from 'fabric';
import { APP_CONFIG } from '../config';
import { CustomFabricObject, ExtendedFabricObject } from './fabricTypes';
import { toCanvasPx } from '../utils/imageUtils';
import { CanvasPageElement } from './CanvasPageElement';
import { useAlbumSettings, useAlbumSpreads } from '../states/albumStore';
import { useSelectedElementId, useCurrentSpreadIndex } from '../states/uiStore';

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

interface UseReactToFabricSyncProps {
    fabricCanvas: fabric.Canvas | null;
    zoom: number;
}

export const useReactToFabricSync = ({
    fabricCanvas,
    zoom,
}: UseReactToFabricSyncProps) => {
    const spreads = useAlbumSpreads();
    const currentSpreadIndex = useCurrentSpreadIndex();
    const spread = useMemo(() => spreads[currentSpreadIndex], [spreads, currentSpreadIndex]);
    const settings = useAlbumSettings();
    const selectedElementId = useSelectedElementId();

    const ppi = APP_CONFIG.PPI;
    const loadingIds = useRef<Set<string>>(new Set());

    // Refs for props/state
    const spreadRef = useRef(spread);
    spreadRef.current = spread;
    const selectedElementIdRef = useRef(selectedElementId);
    selectedElementIdRef.current = selectedElementId;

    // Track the last spread ID
    const lastSyncedSpreadId = useRef<string | null>(null);

    const modelWidth = settings ? settings.pageWidth * 2 * ppi : 0;
    const modelHeight = settings ? settings.pageHeight * ppi : 0;

    const shouldSkipLayoutSync = (obj: fabric.Object) => {
        return (obj as ExtendedFabricObject).preventLayoutSync;
    };

    // Sync State to Fabric
    useEffect(() => {
        const canvas = fabricCanvas;
        if (!canvas || !spread || !settings) return;

        const currentSpread = spreadRef.current;

        lastSyncedSpreadId.current = currentSpread.id;

        const currentObjects = canvas.getObjects() as CustomFabricObject[];
        const validIds = new Set<string>();
        const elementsToLoad: typeof currentSpread.elements = [];

        currentSpread.elements.forEach(element => {
            validIds.add(element.id);
            const existingObj = currentObjects.find(o => o.data?.id === element.id) as CustomFabricObject;

            if (existingObj) {
                if (existingObj instanceof CanvasPageElement) {
                    const canvasEl = existingObj;
                    const isLocked = element.lockAspectRatio;
                    if (canvasEl.get('uniformScaling') !== !!isLocked) {
                        canvasEl.set({
                            uniformScaling: !!isLocked,
                            lockUniScaling: !!isLocked,
                        });
                        if (canvas.getActiveObject() === canvasEl) {
                            canvas.uniformScaling = !!isLocked;
                        }
                        canvasEl.updateControlVisibility(!!isLocked);
                        canvasEl.setCoords();
                    }

                    // Update layout/properties if not moving/scaling
                    if (!shouldSkipLayoutSync(existingObj)) {
                        canvasEl.pageElement = element;
                        canvasEl.applyLayout(toCanvasPx(modelWidth), toCanvasPx(modelHeight));
                    }
                }
            } else {
                if (!loadingIds.current.has(element.id)) {
                    elementsToLoad.push(element);
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
        elementsToLoad.forEach(async (element) => {
            if (loadingIds.current.has(element.id)) return;
            loadingIds.current.add(element.id);

            try {
                const uiSizes = getZoomCompensatedSizes(zoomValue);

                const canvasEl = new CanvasPageElement(element, {
                    cornerStyle: 'circle',
                    cornerColor: 'white',
                    cornerStrokeColor: '#333',
                    borderColor: '#333',
                    transparentCorners: false,
                    cornerSize: uiSizes.cornerSize,
                    borderScaleFactor: uiSizes.borderScaleFactor,
                    objectCaching: true,
                    noScaleCache: true,
                    uniformScaling: !!element.lockAspectRatio,
                    lockUniScaling: !!element.lockAspectRatio,
                });

                await canvasEl.loadImage();
                canvasEl.applyLayout(toCanvasPx(modelWidth), toCanvasPx(modelHeight));

                canvas.add(canvasEl);
                if (selectedElementIdRef.current === element.id) {
                    canvas.setActiveObject(canvasEl);
                }
                canvas.requestRenderAll();
            } catch (err) {
                console.error("Failed to load", element.imageUrl, err);
            } finally {
                loadingIds.current.delete(element.id);
            }
        });

        canvas.requestRenderAll();
    }, [fabricCanvas, spread, zoom, modelWidth, modelHeight, ppi, settings]);

    // Update UI sizes when zoom changes
    useEffect(() => {
        const canvas = fabricCanvas;
        if (!canvas) return;

        const uiSizes = getZoomCompensatedSizes(zoom);
        canvas.getObjects().forEach((obj: fabric.Object) => {
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
