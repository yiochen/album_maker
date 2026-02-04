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

    // Stable ref for callback to avoid re-initializing canvas
    const onCanvasChangeRef = useRef(onCanvasChange);
    onCanvasChangeRef.current = onCanvasChange;

    // Refs for props to avoid unnecessary effect re-runs
    const spreadRef = useRef(spread);
    spreadRef.current = spread;
    const selectedElementIdRef = useRef(selectedElementId);
    selectedElementIdRef.current = selectedElementId;

    // Track the last spread ID that was fully synced to detect spread changes
    const lastSyncedSpreadId = useRef<string | null>(null);

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

            if (onCanvasChangeRef.current) {
                const dataUrl = canvas.toDataURL({
                    format: 'jpeg',
                    quality: APP_CONFIG.THUMBNAIL_QUALITY,
                    multiplier: APP_CONFIG.THUMBNAIL_MULTIPLIER
                });
                onCanvasChangeRef.current(dataUrl);
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canvasElRef, containerRef, canvasWidth, canvasHeight]);

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

    // Sync State to Fabric - Only runs when spread ID changes or canvas initializes
    // FabricJS owns positions/sizes during interaction; React syncs on add/remove/switch spread
    useEffect(() => {
        const canvas = fabricCanvas;
        if (!canvas) return;

        const currentSpread = spreadRef.current;
        const isSpreadChange = lastSyncedSpreadId.current !== currentSpread.id;

        // Track current spread
        lastSyncedSpreadId.current = currentSpread.id;

        const currentObjects = canvas.getObjects() as CustomFabricObject[];
        const validIds = new Set<string>();
        const elementsToLoad: { element: PageElement, width: number, height: number }[] = [];

        currentSpread.elements.forEach(element => {
            validIds.add(element.id);
            const existingObj = currentObjects.find(o => o.data?.id === element.id);

            if (existingObj) {
                // Element exists in canvas
                // Only sync lockAspectRatio (external property from panel)
                // DO NOT sync position/size - FabricJS owns those during interaction
                if (existingObj instanceof fabric.Image) {
                    const img = existingObj;
                    const isLocked = element.lockAspectRatio;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    if ((img as any).uniformScaling !== isLocked) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (img as any).uniformScaling = isLocked;
                        img.setCoords();
                    }

                    // Only sync position/size if we just switched spreads (full reload)
                    if (isSpreadChange && !isObjectMoving(existingObj)) {
                        const targetWidth = element.size.width;
                        const targetHeight = element.size.height;
                        img.set({
                            left: element.position.x,
                            top: element.position.y,
                            scaleX: targetWidth / (img.width || 1),
                            scaleY: targetHeight / (img.height || 1),
                        });
                        img.setCoords();
                    }
                }
            } else {
                // New element - queue for loading
                if (!loadingIds.current.has(element.id)) {
                    elementsToLoad.push({
                        element,
                        width: element.size.width,
                        height: element.size.height
                    });
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
        const zoomValue = zoom; // Capture current zoom for async callback
        elementsToLoad.forEach(async ({ element, width, height }) => {
            if (loadingIds.current.has(element.id)) return;
            loadingIds.current.add(element.id);

            try {
                const img = await fabric.Image.fromURL(element.imageUrl, { crossOrigin: 'anonymous' });

                const isLocked = element.lockAspectRatio;
                const uiSizes = getZoomCompensatedSizes(zoomValue);

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
                    // Enable FabricJS caching for performance
                    objectCaching: true,
                    noScaleCache: true, // Don't invalidate cache during scaling
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
    }, [fabricCanvas, spread.id, spread.elements.length, zoom]);

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
