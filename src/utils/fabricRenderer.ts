import * as fabric from 'fabric';
import { Spread, AlbumSettings } from '../types';
import { CanvasPageElement } from '../hooks/CanvasPageElement';
import { CustomFabricObject, ExtendedFabricObject } from '../hooks/fabricTypes';
import { APP_CONFIG } from '../config';
import { FabricRenderOptions } from './rendererTypes';

/**
 * Calculates UI sizes (corners, borders, seam) compensated for zoom.
 */
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

/**
 * Renders or updates a spread onto a Fabric.js canvas using an incremental sync strategy.
 */
export async function renderSpread(
    spread: Spread,
    settings: AlbumSettings,
    canvas: fabric.Canvas | fabric.StaticCanvas,
    options: FabricRenderOptions
): Promise<void> {
    // Use actual canvas visual dimensions for overlay positioning (seam, etc.)
    const canvasWidth = canvas.width ?? 0;
    const canvasHeight = canvas.height ?? 0;

    const interactiveOpts = options.interactivityOptions;
    const isInteractive = !!interactiveOpts;
    const zoom = interactiveOpts?.zoom ?? 100;
    const showPageSeam = interactiveOpts?.showPageSeam ?? false;

    // 1. Calculate zoom-compensated UI sizes (corner handles, etc.)
    const uiSizes = getZoomCompensatedSizes(zoom);

    const currentObjects = canvas.getObjects() as CustomFabricObject[];
    const validIds = new Set<string>();
    const loadPromises: Promise<void>[] = [];

    // 2. Sync existing objects, update images if changed, or add new ones
    spread.elements.forEach(element => {
        validIds.add(element.id);
        const existingObj = currentObjects.find(o => (o as CustomFabricObject).data?.id === element.id) as CanvasPageElement;
        const targetUrl = options.useThumbnail ? element.content.thumbnailUrl : element.content.imageUrl;

        if (existingObj && existingObj instanceof CanvasPageElement) {
            // Update reference to latest data from React state
            existingObj.pageElement = element;

            existingObj.set({
                selectable: isInteractive,
                hasControls: isInteractive,
                evented: isInteractive,
                cornerSize: uiSizes.cornerSize,
                borderScaleFactor: uiSizes.borderScaleFactor,
            });

            // Only apply state layout if not currently being interacted with in Fabric
            if (!(existingObj as ExtendedFabricObject).preventLayoutSync) {
                existingObj.applyLayout(canvas.width, canvas.height);
            }
            existingObj.onContentTransformChange = interactiveOpts?.onContentTransformChange;

            // Detect image change
            const currentUrl = options.useThumbnail ? existingObj.pageElement.content.thumbnailUrl : existingObj.pageElement.content.imageUrl;
            if (targetUrl !== currentUrl) {
                // Update element reference for future comparisons
                existingObj.pageElement = element;
                loadPromises.push(existingObj.loadImage(targetUrl));
            }
        } else {
            // [SYNC ADDITION] Create and add immediately so next call finds it
            const canvasEl = new CanvasPageElement(element, {
                cornerStyle: 'circle',
                cornerColor: 'white',
                cornerStrokeColor: '#333',
                borderColor: '#333',
                transparentCorners: false,
                cornerSize: uiSizes.cornerSize,
                borderScaleFactor: uiSizes.borderScaleFactor,
                selectable: isInteractive,
                hasControls: isInteractive,
                evented: isInteractive,
                onContentTransformChange: interactiveOpts?.onContentTransformChange,
            });

            canvas.add(canvasEl);
            loadPromises.push(canvasEl.loadImage(targetUrl).then(() => {
                canvasEl.applyLayout(canvas.width, canvas.height);
            }));
        }
    });

    // 3. Remove orphaned objects
    currentObjects.forEach(obj => {
        const id = (obj as CustomFabricObject).data?.id;
        if (id && id !== 'seam' && !validIds.has(id)) {
            canvas.remove(obj);
        }
    });

    // 4. Handle Seam Layer
    let seam = (canvas.getObjects() as CustomFabricObject[]).find(o => o.data?.id === 'seam') as fabric.Line;
    if (showPageSeam) {
        if (!seam) {
            seam = new fabric.Line([canvasWidth / 2, 0, canvasWidth / 2, canvasHeight], {
                stroke: '#ddd',
                strokeWidth: uiSizes.seamStrokeWidth,
                selectable: false,
                evented: false,
                strokeDashArray: [uiSizes.seamDash, uiSizes.seamDash],
            });
            (seam as CustomFabricObject).data = { id: 'seam' };
            canvas.add(seam);
        } else {
            seam.set({
                x1: canvasWidth / 2,
                x2: canvasWidth / 2,
                y1: 0,
                y2: canvasHeight,
                strokeWidth: uiSizes.seamStrokeWidth,
                strokeDashArray: [uiSizes.seamDash, uiSizes.seamDash],
            });
        }
    } else if (seam) {
        canvas.remove(seam);
    }

    // 5. Wait for all content to be ready
    await Promise.all(loadPromises);

    // 6. Finalize Z-Order
    // Elements start at index 0. We order them according to the elements array.
    spread.elements.forEach((element, index) => {
        const obj = (canvas.getObjects() as CustomFabricObject[]).find(o => o.data?.id === element.id);
        if (obj) {
            canvas.moveObjectTo(obj, index);
        }
    });

    // Seam is placed on top of elements as a guide layer.
    const finalSeam = (canvas.getObjects() as CustomFabricObject[]).find(o => o.data?.id === 'seam');
    if (finalSeam) {
        canvas.moveObjectTo(finalSeam, canvas.getObjects().length - 1);
    }

    canvas.requestRenderAll();
}
