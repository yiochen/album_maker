import * as fabric from 'fabric';
import { Spread, AlbumSettings, isImageElement, isTextElement } from '../types';
import { CanvasImageElement } from '../hooks/CanvasImageElement';
import { CanvasTextElement } from '../hooks/CanvasTextElement';
import { CustomFabricObject, ExtendedFabricObject } from '../hooks/fabricTypes';
import { APP_CONFIG } from '../config';
import { FabricRenderOptions } from './rendererTypes';

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


    // 2. Sync elements — branch on element.type
    spread.elements.forEach(element => {
        validIds.add(element.id);
        const existingObj = currentObjects.find(o => (o as CustomFabricObject).data?.id === element.id);

        if (isImageElement(element)) {
            // ── Image element sync ──
            const existingImage = existingObj instanceof CanvasImageElement ? existingObj : null;

            // Dynamic URL Selection based on PPI
            let targetUrl: string;
            if (options.ppi < 50) {
                targetUrl = element.content.thumbnailUrl;
            } else if (options.ppi < 200) {
                targetUrl = element.content.previewUrl;
            } else {
                targetUrl = element.content.fullUrl;
            }

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

                canvas.add(canvasEl);
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

                    const canvasEl = new CanvasTextElement(element, options.ppi, {
                        ...SHARED_SELECTION_STYLE,
                        interactive: isInteractive,
                        uniformScaling: false,
                    });


                canvas.add(canvasEl);
                canvasEl.applyLayout(canvas.width, canvas.height);
            }
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
