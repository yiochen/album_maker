/**
 * useCanvasObjects - Syncs PageElement state to FabricJS canvas objects.
 *
 * PIXEL COORDINATE SYSTEM:
 * - PageElement position/size are in MODEL PIXELS (at PPI, e.g., 300 PPI)
 * - FabricJS left/top/scale are in CANVAS PIXELS (at SCREEN_PPI, e.g., 96 PPI)
 * - Uses toCanvasPx() to convert from model → canvas when rendering
 *
 * FabricJS uses center origin (originX/originY: 'center'), so left/top represent the center position.
 *
 * DATA FLOW - Avoiding Circular Updates:
 * 
 * During editing, data flows: FabricJS → React State (via object:modified)
 * - User drags/resizes on canvas → FabricJS updates visually in real-time
 * - object:modified fires ONCE when mouse is released
 * - useCanvasSnapping converts canvas position → model pixels, calls updateElement()
 * - Zustand store updates, triggering React re-render
 * 
 * This useEffect runs when `spread` changes, but it intentionally SKIPS
 * re-positioning existing objects UNLESS:
 * 1. The user switched to a different spread (isSpreadChange check)
 * 2. AND the object is not currently being moved (isMoving flag)
 * 
 * This prevents FabricJS and React from fighting over object positions during editing.
 * FabricJS is the source of truth during interaction; React state is the source of 
 * truth when switching spreads or on initial load.
 */
import { useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import type { Spread, PageElement, AlbumSettings } from '../types';
import { APP_CONFIG } from '../config';
import { CustomFabricObject, ExtendedFabricObject } from './fabricTypes';
import { toCanvasPx } from '../utils/imageUtils';
import { CanvasPageElement } from './CanvasPageElement';

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
    selectedElementId: string | null;
    zoom: number;
}

export const useCanvasObjects = ({
    fabricCanvas,
    spread,
    settings,
    selectedElementId,
    zoom,
}: UseCanvasObjectsProps) => {
    const ppi = APP_CONFIG.PPI;
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

        lastSyncedSpreadId.current = currentSpread.id;

        const currentObjects = canvas.getObjects() as CustomFabricObject[];
        const validIds = new Set<string>();
        const elementsToLoad: PageElement[] = [];

        currentSpread.elements.forEach(element => {
            validIds.add(element.id);
            const existingObj = currentObjects.find(o => o.data?.id === element.id) as CustomFabricObject;

            if (existingObj) {
                if (existingObj instanceof CanvasPageElement) {
                    const canvasEl = existingObj;
                    const isLocked = element.lockAspectRatio;
                    if (canvasEl.uniformScaling !== !!isLocked) {
                        canvasEl.uniformScaling = !!isLocked;
                        canvasEl.setCoords();
                    }

                    // Update layout/properties if not moving
                    if (!isObjectMoving(existingObj)) {
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
    }, [fabricCanvas, spread, zoom, modelWidth, modelHeight, ppi]);

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
