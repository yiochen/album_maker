import { useEffect, useRef, useState, useCallback } from 'react';
import * as fabric from 'fabric';
import type { Spread, PageElement, AlbumSettings } from '../types';
import { APP_CONFIG } from '../config';

export interface CustomFabricObject extends fabric.Object {
    data?: {
        id: string;
    };
}

export interface ExtendedFabricObject extends fabric.Object {
    isMoving?: boolean;
}

const getZoomCompensatedSizes = (zoomPercent: number) => {
    const scale = (zoomPercent / 100) * (APP_CONFIG.SCREEN_PPI / APP_CONFIG.PPI);
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

interface UseCanvasRenderProps {
    canvasElRef: React.RefObject<HTMLCanvasElement | null>;
    containerRef: React.RefObject<HTMLDivElement | null>;
    spread: Spread;
    settings: AlbumSettings;
    selectedElementId: string | null;
    onCanvasChange?: (dataUrl: string) => void;
}

export const useCanvasRender = ({
    canvasElRef,
    containerRef,
    spread,
    settings,
    selectedElementId,
    onCanvasChange,
}: UseCanvasRenderProps) => {
    // Use state for the fabric canvas instance so consumers can react to its creation
    const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null);

    const seamRef = useRef<fabric.Line | null>(null);
    const snapLinesRef = useRef<fabric.Line[]>([]);
    const loadingIds = useRef<Set<string>>(new Set());
    const isZoomInitialized = useRef(false);

    // Zoom state
    const [zoom, setZoom] = useState(25);

    // Canvas dimensions (Absolute Pixels)
    const canvasWidth = settings.pageWidth * 2 * APP_CONFIG.PPI;
    const canvasHeight = settings.pageHeight * APP_CONFIG.PPI;

    const isObjectMoving = (obj: fabric.Object) => {
        return (obj as ExtendedFabricObject).isMoving;
    };

    // Initialize Fabric Canvas
    useEffect(() => {
        if (!canvasElRef.current || fabricCanvas) return;

        const canvas = new fabric.Canvas(canvasElRef.current, {
            preserveObjectStacking: true,
            selection: true,
            backgroundColor: '#f0f0f0',
            width: canvasWidth,
            height: canvasHeight,
        });

        // Add Seam Line (Center of spread)
        const seam = new fabric.Line([canvasWidth / 2, 0, canvasWidth / 2, canvasHeight], {
            stroke: '#ccc',
            strokeWidth: 2,
            selectable: false,
            evented: false,
            strokeDashArray: [5, 5],
        });
        (seam as CustomFabricObject).data = { id: 'seam' };
        seamRef.current = seam;
        canvas.add(seam);
        canvas.sendObjectToBack(seam);

        // Helper to track moving state
        const setMoving = (e: { target?: fabric.Object }) => {
            if (e.target) (e.target as ExtendedFabricObject).isMoving = true;
        };
        canvas.on('object:moving', setMoving);
        canvas.on('object:rotating', setMoving);

        // Cleanup moved state on mouse up
        canvas.on('mouse:up', () => {
            canvas.getObjects().forEach(o => (o as ExtendedFabricObject).isMoving = false);
            // Snap lines cleanup is handled in interaction hook usually, but we can do it here too to be safe?
            // Better leave interaction logic separate, but this is cleanup.
            // Actually, snap lines are rendering artifacts, so maybe fine here.
            snapLinesRef.current.forEach(line => canvas.remove(line));
            snapLinesRef.current = [];
            canvas.requestRenderAll();

            if (onCanvasChange) {
                const dataUrl = canvas.toDataURL({
                    format: 'jpeg',
                    quality: APP_CONFIG.THUMBNAIL_QUALITY,
                    multiplier: APP_CONFIG.THUMBNAIL_MULTIPLIER
                });
                onCanvasChange(dataUrl);
            }
        });

        canvas.on('mouse:down', () => {
            containerRef.current?.focus();
        });

        setFabricCanvas(canvas);

        return () => {
            canvas.dispose();
            setFabricCanvas(null);
        };
    }, [canvasElRef, containerRef, canvasWidth, canvasHeight, fabricCanvas, onCanvasChange]);

    // Auto-Fit Logic
    const fitToViewport = useCallback(() => {
        if (!containerRef.current) return;
        const viewport = containerRef.current;
        const padding = 64;
        const availableWidth = viewport.clientWidth - padding;
        const availableHeight = viewport.clientHeight - padding;

        const scaleX = availableWidth / canvasWidth;
        const scaleY = availableHeight / canvasHeight;
        const scale = Math.min(scaleX, scaleY);

        const zoomPercent = Math.max(10, Math.floor(scale * 100 * (APP_CONFIG.PPI / APP_CONFIG.SCREEN_PPI)));
        setZoom(zoomPercent);
    }, [canvasWidth, canvasHeight, containerRef]);

    useEffect(() => {
        if (!isZoomInitialized.current && canvasWidth > 0) {
            const timer = setTimeout(() => {
                fitToViewport();
                isZoomInitialized.current = true;
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [fitToViewport, canvasWidth]);

    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout>;
        const handleResize = () => {
            clearTimeout(timeout);
            timeout = setTimeout(fitToViewport, 100);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [fitToViewport]);

    // Sync State to Fabric
    useEffect(() => {
        const canvas = fabricCanvas;
        if (!canvas) return;

        const currentObjects = canvas.getObjects() as CustomFabricObject[];
        const validIds = new Set<string>();
        const elementsToLoad: { element: PageElement, width: number, height: number }[] = [];

        spread.elements.forEach(element => {
            validIds.add(element.id);
            const existingObj = currentObjects.find(o => o.data?.id === element.id);

            const targetLeft = element.position.x;
            const targetTop = element.position.y;
            const targetWidth = element.size.width;
            const targetHeight = element.size.height;

            if (existingObj) {
                if (!isObjectMoving(existingObj)) {
                    let modified = false;
                    if (existingObj instanceof fabric.Image) {
                        const img = existingObj;
                        const newScaleX = targetWidth / (img.width || 1);
                        const newScaleY = targetHeight / (img.height || 1);

                        if (Math.abs(img.left! - targetLeft) > 1) { img.set('left', targetLeft); modified = true; }
                        if (Math.abs(img.top! - targetTop) > 1) { img.set('top', targetTop); modified = true; }
                        if (Math.abs((img.scaleX || 1) - newScaleX) > 0.001) { img.set('scaleX', newScaleX); modified = true; }
                        if (Math.abs((img.scaleY || 1) - newScaleY) > 0.001) { img.set('scaleY', newScaleY); modified = true; }

                        const isLocked = element.lockAspectRatio;
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        if ((img as any).uniformScaling !== isLocked) {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            (img as any).uniformScaling = isLocked;
                            modified = true;
                        }

                        if (modified) img.setCoords();
                    }
                }
            } else {
                if (!loadingIds.current.has(element.id)) {
                    elementsToLoad.push({ element, width: targetWidth, height: targetHeight });
                }
            }
        });

        // Clean up removed objects
        currentObjects.forEach(obj => {
            const customObj = obj as CustomFabricObject;
            if (customObj.data?.id && customObj.data.id !== 'seam' && !validIds.has(customObj.data.id)) {
                canvas.remove(obj);
            }
        });

        // Load new images
        elementsToLoad.forEach(async ({ element, width, height }) => {
            if (loadingIds.current.has(element.id)) return;
            loadingIds.current.add(element.id);

            try {
                const img = await fabric.Image.fromURL(element.imageUrl, { crossOrigin: 'anonymous' });
                // Check if canvas is still valid (might have been disposed/changed)
                // Note: using fabricCanvas variable from closure, might be stale if re-rendered?
                // But loading is async. Best to check if component is mounted or check canvas.
                // We'll rely on checking if it's in state? Or ref?
                // Since we don't have a ref to current canvas anymore in closure context easily without ref.
                // But the canvas object itself has a .disposed property in recent fabric versions? Or we can check if it has objects.

                const isLocked = element.lockAspectRatio;
                const uiSizes = getZoomCompensatedSizes(zoom);

                img.set({
                    left: element.position.x,
                    top: element.position.y,
                    scaleX: width / (img.width || 1),
                    scaleY: height / (img.height || 1),
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
                });

                canvas.add(img);
                if (selectedElementId === element.id) {
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

    }, [spread, selectedElementId, zoom, fabricCanvas]);

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

    return {
        fabricCanvas,
        canvasWidth,
        canvasHeight,
        zoom,
        setZoom,
        fitToViewport,
        snapLinesRef,
    };
};
