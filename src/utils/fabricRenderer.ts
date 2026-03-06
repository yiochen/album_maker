import * as fabric from 'fabric';
import { Spread, AlbumSettings, isImageElement, isTextElement } from '../types';
import { CanvasImageElement } from '../hooks/CanvasImageElement';
import { CanvasTextElement } from '../hooks/CanvasTextElement';
import { CustomFabricObject, ExtendedFabricObject } from '../hooks/fabricTypes';
import { APP_CONFIG } from '../config';
import { FabricRenderOptions } from './rendererTypes';
import { getImageUrlForPpi } from './imageSourceSelection';

const SHARED_SELECTION_STYLE: Partial<fabric.FabricObjectProps> = {
    cornerStyle: 'circle',
    cornerColor: 'white',
    cornerStrokeColor: '#333',
    borderColor: '#333',
    transparentCorners: false,
};

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
        panControlSize: base.panControlSize * inverseScale,
        lowResBadgeHeight: base.lowResBadgeHeight * inverseScale,
        lowResBadgeFontSize: base.lowResBadgeFontSize * inverseScale,
        lowResBadgeMargin: base.lowResBadgeMargin * inverseScale,
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
    const objectsById = new Map<string, CustomFabricObject>();
    let seamObj: fabric.Line | null = null;
    currentObjects.forEach((obj) => {
        const id = (obj as CustomFabricObject).data?.id;
        if (!id) return;
        if (id === 'seam') {
            seamObj = obj as fabric.Line;
            return;
        }
        objectsById.set(id, obj);
    });
    const validIds = new Set<string>();
    const loadPromises: Promise<void>[] = [];


    // 2. Sync elements — branch on element.type
    spread.elements.forEach(element => {
        validIds.add(element.id);
        const existingObj = objectsById.get(element.id);

        if (isImageElement(element)) {
            // ── Image element sync ──
            const existingImage = existingObj instanceof CanvasImageElement ? existingObj : null;

            const targetUrl = getImageUrlForPpi(element.content, options.ppi);

            if (existingImage) {
                existingImage.pageElement = element;

                existingImage.set({
                    ...SHARED_SELECTION_STYLE,
                    selectable: isInteractive,
                    hasControls: isInteractive,
                    evented: isInteractive,
                    cornerSize: uiSizes.cornerSize,
                    borderScaleFactor: uiSizes.borderScaleFactor,
                    uniformScaling: element.content.lockAspectRatio,
                });

                if (isInteractive) {
                    existingImage.updateControlVisibility(element.content.lockAspectRatio ?? true);
                    existingImage.setPanControlSize(uiSizes.panControlSize);
                    existingImage.setLowResBadgeSizes(
                        uiSizes.lowResBadgeHeight,
                        uiSizes.lowResBadgeFontSize,
                        uiSizes.lowResBadgeMargin
                    );
                    existingImage.setCanvasZoomPercent(zoom);

                    if (canvas instanceof fabric.Canvas && canvas.getActiveObject() === existingImage) {
                        canvas.uniformScaling = element.content.lockAspectRatio ?? true;
                    }
                }

                if (!(existingImage as ExtendedFabricObject).preventLayoutSync) {
                    existingImage.applyLayout(canvas.width, canvas.height);
                }
                existingImage.onContentTransformChange = interactiveOpts?.onContentTransformChange;

                const currentUrl = existingImage.currentUrl;
                if (!targetUrl) {
                    existingImage.clearImage();
                } else if (targetUrl !== currentUrl) {
                    existingImage.pageElement = element;
                    loadPromises.push(existingImage.loadImage(targetUrl));
                }
            } else {
                // Remove stale object of a different type (e.g. was text, now image)
                if (existingObj) canvas.remove(existingObj);
                if (existingObj && existingObj.data?.id) {
                    objectsById.delete(existingObj.data.id);
                }

                const canvasEl = new CanvasImageElement(element, {
                    ...SHARED_SELECTION_STYLE,
                    cornerSize: uiSizes.cornerSize,
                    borderScaleFactor: uiSizes.borderScaleFactor,
                    selectable: isInteractive,
                    hasControls: isInteractive,
                    evented: isInteractive,
                    uniformScaling: element.content.lockAspectRatio,
                    panControlSize: uiSizes.panControlSize,
                    onContentTransformChange: interactiveOpts?.onContentTransformChange,
                });
                if (isInteractive) {
                    canvasEl.setLowResBadgeSizes(
                        uiSizes.lowResBadgeHeight,
                        uiSizes.lowResBadgeFontSize,
                        uiSizes.lowResBadgeMargin
                    );
                    canvasEl.setCanvasZoomPercent(zoom);
                }

                canvas.add(canvasEl);
                objectsById.set(element.id, canvasEl as unknown as CustomFabricObject);
                if (targetUrl) {
                    loadPromises.push(canvasEl.loadImage(targetUrl).then(() => {
                        canvasEl.applyLayout(canvas.width, canvas.height);
                    }));
                } else {
                    canvasEl.applyLayout(canvas.width, canvas.height);
                }
            }
        } else if (isTextElement(element)) {
            // ── Text element sync ──
            const existingText = existingObj instanceof CanvasTextElement ? existingObj : null;

                if (existingText) {
                    existingText.pageElement = element;
                    existingText.updateControlVisibility();

                    existingText.set({
                        ...SHARED_SELECTION_STYLE,
                        selectable: isInteractive,
                        hasControls: isInteractive,
                        evented: isInteractive,
                        uniformScaling: false,
                    cornerSize: uiSizes.cornerSize,
                    borderScaleFactor: uiSizes.borderScaleFactor,
                });

                if (!(existingText as ExtendedFabricObject).preventLayoutSync) {
                    existingText.syncFromRuns();
                    existingText.applyLayout(canvas.width, canvas.height);
                }
                } else {
                // Remove stale object of a different type
                if (existingObj) canvas.remove(existingObj);
                if (existingObj && existingObj.data?.id) {
                    objectsById.delete(existingObj.data.id);
                }

                    const canvasEl = new CanvasTextElement(element, options.ppi, {
                        ...SHARED_SELECTION_STYLE,
                        interactive: isInteractive,
                        uniformScaling: false,
                    });


                canvas.add(canvasEl);
                objectsById.set(element.id, canvasEl as unknown as CustomFabricObject);
                canvasEl.applyLayout(canvas.width, canvas.height);
            }
        }
    });

    // 3. Remove orphaned objects
    [...objectsById.values()].forEach(obj => {
        const id = obj.data?.id;
        if (id && id !== 'seam' && !validIds.has(id)) {
            canvas.remove(obj);
            objectsById.delete(id);
        }
    });

    // 4. Handle Seam Layer
    if (showPageSeam) {
        if (!seamObj) {
            seamObj = new fabric.Line([canvasWidth / 2, 0, canvasWidth / 2, canvasHeight], {
                stroke: '#ddd',
                strokeWidth: uiSizes.seamStrokeWidth,
                selectable: false,
                evented: false,
                strokeDashArray: [uiSizes.seamDash, uiSizes.seamDash],
            });
            (seamObj as CustomFabricObject).data = { id: 'seam' };
            canvas.add(seamObj);
        } else {
            const seam = seamObj as fabric.Line;
            seam.set({
                x1: canvasWidth / 2,
                x2: canvasWidth / 2,
                y1: 0,
                y2: canvasHeight,
                strokeWidth: uiSizes.seamStrokeWidth,
                strokeDashArray: [uiSizes.seamDash, uiSizes.seamDash],
            });
        }
    } else if (seamObj) {
        canvas.remove(seamObj);
        seamObj = null;
    }

    // 5. Wait for all content to be ready
    await Promise.all(loadPromises);

    // 6. Finalize Z-Order
    // Elements start at index 0. We order them according to the elements array.
    spread.elements.forEach((element, index) => {
        const obj = objectsById.get(element.id);
        if (obj) {
            canvas.moveObjectTo(obj, index);
        }
    });

    // Seam is placed on top of elements as a guide layer.
    if (seamObj) {
        canvas.moveObjectTo(seamObj, canvas.getObjects().length - 1);
    }

    canvas.requestRenderAll();
}
