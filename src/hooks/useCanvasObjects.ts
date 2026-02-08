/**
 * useCanvasObjects - Syncs PageElement state to FabricJS canvas objects.
 *
 * REFACTORED FOR GAPLESS LAYOUT:
 * - Uses GaplessPageItem (SmartFrame) instead of raw fabric.Image
 * - Uses normalized 'box' coordinates (0-1) for layout
 * - Handles migration of legacy elements on the fly
 */
import { useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import type { Spread, AlbumSettings } from '../types';
import { APP_CONFIG } from '../config';
import { CustomFabricObject, ExtendedFabricObject } from './fabricTypes';
import { GaplessPageItem } from '../components/GaplessPageItem';
import { migratePageElement } from '../utils/migration';
import { toCanvasPx } from '../utils/imageUtils';

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

    // Calculate canvas dimensions in screen pixels for layout application
    const canvasWidth = toCanvasPx(modelWidth);
    const canvasHeight = toCanvasPx(modelHeight);

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

        // Items to load (create new GaplessPageItem)
        const elementsToLoad: { element: ReturnType<typeof migratePageElement> }[] = [];

        currentSpread.elements.forEach(rawElement => {
            validIds.add(rawElement.id);

            // Ensure element is in new format (migration on the fly for rendering)
            const element = migratePageElement(rawElement, settings);

            const existingObj = currentObjects.find(o => o.data?.id === element.id);

            if (existingObj) {
                if (existingObj instanceof GaplessPageItem) {
                    const item = existingObj as GaplessPageItem;

                    // Update internal element reference
                    item.pageElement = element;

                    // Sync locked state
                    // GaplessPageItem might not support lockAspectRatio property directly on Group?
                    // Actually we used to set uniformScaling on fabric.Image.
                    // For Frame, we usually allow non-uniform scaling to resize frame.
                    // But if lockAspectRatio is true, maybe we should enforce it?
                    // For now, let's assume frames are free-form.

                    if (isSpreadChange && !isObjectMoving(existingObj)) {
                        // Apply layout from normalized box
                        item.applyLayout(canvasWidth, canvasHeight);
                    } else if (!isObjectMoving(existingObj)) {
                         // Even if not spread change, we might need to re-apply if element changed externally (undo/redo)
                         // But if we are interacting, we skip.
                         // Optimization: Check if box changed?
                         // For now, safe to apply layout if not moving.
                         item.applyLayout(canvasWidth, canvasHeight);
                    }
                } else {
                    // Object exists but is not GaplessPageItem (e.g. old fabric.Image from previous render?)
                    // Should remove and re-create.
                    canvas.remove(existingObj);
                    if (!loadingIds.current.has(element.id)) {
                        elementsToLoad.push({ element });
                    }
                }
            } else {
                if (!loadingIds.current.has(element.id)) {
                    elementsToLoad.push({ element });
                }
            }
        });

        // Cleanup removed objects
        currentObjects.forEach(obj => {
            const customObj = obj as CustomFabricObject;
            if (customObj.data?.id && customObj.data.id !== 'seam' && !validIds.has(customObj.data.id)) {
                canvas.remove(obj);
            }
        });

        // Load new items
        const zoomValue = zoom;
        elementsToLoad.forEach(async ({ element }) => {
            if (loadingIds.current.has(element.id)) return;
            loadingIds.current.add(element.id);

            try {
                const img = await fabric.Image.fromURL(element.imageUrl, { crossOrigin: 'anonymous' });

                const uiSizes = getZoomCompensatedSizes(zoomValue);

                const item = new GaplessPageItem(element, img, {
                    cornerStyle: 'circle',
                    cornerColor: 'white',
                    cornerStrokeColor: '#333',
                    borderColor: '#333',
                    transparentCorners: false,
                    cornerSize: uiSizes.cornerSize,
                    borderScaleFactor: uiSizes.borderScaleFactor,
                });

                // Apply initial layout
                item.applyLayout(canvasWidth, canvasHeight);

                // Configure controls
                item.set({
                    lockRotation: true, // Usually frames don't rotate in this editor
                });

                canvas.add(item);
                if (selectedElementIdRef.current === element.id) {
                    canvas.setActiveObject(item);
                }
                canvas.requestRenderAll();
            } catch (err) {
                console.error("Failed to load", element.imageUrl, err);
            } finally {
                loadingIds.current.delete(element.id);
            }
        });

        canvas.requestRenderAll();
    }, [fabricCanvas, spread.id, spread.elements, zoom, canvasWidth, canvasHeight, settings]);

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
