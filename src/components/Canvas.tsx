import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as fabric from 'fabric';
import type { Spread, PageElement, PoolImage, AlbumSettings } from '../types';
import { calculateSnap, getActiveSnapLines } from '../utils/snapping';

interface CanvasProps {
    spread: Spread;
    settings: AlbumSettings;
    selectedElementId: string | null;
    isSnappingEnabled: boolean;
    onElementSelect: (elementId: string | null) => void;
    onElementUpdate: (spreadId: string, elementId: string, updates: Partial<PageElement>) => void;
    onElementDelete: (spreadId: string, elementId: string) => void;
    onImageDrop: (spreadId: string, image: PoolImage, position: { x: number; y: number }) => void;
    onCanvasChange?: (dataUrl: string) => void;
}

/** Pixels per inch - 300 is standard print resolution */
const PPI = 300;
/** Pixels per inch - 96 is standard screen resolution */
const SCREEN_PPI = 96;

/**
 * Base sizes for UI controls at 100% zoom.
 * These are scaled inversely to zoom to maintain consistent visual size.
 */
const BASE_UI_SIZES = {
    cornerSize: 10,
    borderWidth: 1,
    seamStrokeWidth: 2,
    seamDash: 5,
    snapLineStrokeWidth: 1,
    snapLineDash: 4,
};

/** Calculate zoom-compensated sizes for UI controls */
const getZoomCompensatedSizes = (zoomPercent: number) => {
    // scale = (zoom / 100) * (96 / 300)
    // inverse = 1 / scale
    // inverse = 1 / ((zoom/100) * (96/300)) = (100 * 300) / (zoom * 96)
    const scale = (zoomPercent / 100) * (SCREEN_PPI / PPI);
    const inverseScale = 1 / scale;

    return {
        cornerSize: BASE_UI_SIZES.cornerSize * inverseScale,
        borderScaleFactor: BASE_UI_SIZES.borderWidth * inverseScale,
        seamStrokeWidth: BASE_UI_SIZES.seamStrokeWidth * inverseScale,
        seamDash: BASE_UI_SIZES.seamDash * inverseScale,
        snapLineStrokeWidth: BASE_UI_SIZES.snapLineStrokeWidth * inverseScale,
        snapLineDash: BASE_UI_SIZES.snapLineDash * inverseScale,
    };
};

interface CustomFabricObject extends fabric.Object {
    data?: {
        id: string;
    };
}

interface ExtendedFabricObject extends fabric.Object {
    isMoving?: boolean;
}

export const Canvas: React.FC<CanvasProps> = ({
    spread,
    settings,
    selectedElementId,
    isSnappingEnabled,
    onElementSelect,
    onElementUpdate,
    onElementDelete,
    onImageDrop,
    onCanvasChange,
}) => {
    const canvasElRef = useRef<HTMLCanvasElement>(null);
    const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const loadingIds = useRef<Set<string>>(new Set());
    const snapLinesRef = useRef<fabric.Line[]>([]);
    const seamRef = useRef<fabric.Line | null>(null);

    // Refs for callbacks to avoid re-binding effects constantly
    const onElementSelectRef = useRef(onElementSelect);
    const onElementUpdateRef = useRef(onElementUpdate);
    const onElementDeleteRef = useRef(onElementDelete);
    const onImageDropRef = useRef(onImageDrop);
    const onCanvasChangeRef = useRef(onCanvasChange);
    const spreadRef = useRef(spread);
    const settingsRef = useRef(settings);
    const isSnappingEnabledRef = useRef(isSnappingEnabled);

    // Initial zoom state
    const [zoom, setZoom] = useState(25);
    const isZoomInitialized = useRef(false);

    const [isDragOver, setIsDragOver] = useState(false);
    const [hasSelection, setHasSelection] = useState(false);

    // Update refs
    useEffect(() => {
        onElementSelectRef.current = onElementSelect;
        onElementUpdateRef.current = onElementUpdate;
        onElementDeleteRef.current = onElementDelete;
        onImageDropRef.current = onImageDrop;
        onCanvasChangeRef.current = onCanvasChange;
        spreadRef.current = spread;
        settingsRef.current = settings;
        isSnappingEnabledRef.current = isSnappingEnabled;
    }, [onElementSelect, onElementUpdate, onElementDelete, onImageDrop, onCanvasChange, spread, settings, isSnappingEnabled]);

    // Canvas dimensions (Absolute Pixels)
    // Spread width is 2x page width usually, but we should respect spread settings if we add them later.
    const canvasWidth = settings.pageWidth * 2 * PPI;
    const canvasHeight = settings.pageHeight * PPI;

    const isObjectMoving = (obj: fabric.Object) => {
        return (obj as ExtendedFabricObject).isMoving;
    };

    // Initialize Fabric Canvas
    useEffect(() => {
        if (!canvasElRef.current || fabricCanvasRef.current) return;

        const canvas = new fabric.Canvas(canvasElRef.current, {
            preserveObjectStacking: true,
            selection: true,
            backgroundColor: '#f0f0f0',
            width: canvasWidth,
            height: canvasHeight,
        });

        fabricCanvasRef.current = canvas;

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

        const setMoving = (e: { target?: fabric.Object }) => { if (e.target) (e.target as ExtendedFabricObject).isMoving = true; };
        canvas.on('object:moving', setMoving);
        canvas.on('object:rotating', setMoving);

        canvas.on('mouse:up', () => {
            canvas.getObjects().forEach(o => (o as ExtendedFabricObject).isMoving = false);
            snapLinesRef.current.forEach(line => canvas.remove(line));
            snapLinesRef.current = [];
            canvas.requestRenderAll();

            // Generate thumbnail
            if (onCanvasChangeRef.current) {
                const dataUrl = canvas.toDataURL({ format: 'jpeg', quality: 0.5, multiplier: 0.2 });
                onCanvasChangeRef.current(dataUrl);
            }
        });

        canvas.on('mouse:down', () => {
            containerRef.current?.focus();
        });

        // Event Listeners
        const handleSelection = (e: { selected: fabric.Object[] }) => {
            setHasSelection(true);
            const selected = e.selected || [];
            if (selected.length === 1) {
                const obj = selected[0] as CustomFabricObject;
                if (obj.data?.id) {
                    onElementSelectRef.current(obj.data.id);
                }
            } else {
                onElementSelectRef.current(null);
            }
        };

        const handleSelectionCleared = () => {
            setHasSelection(false);
            onElementSelectRef.current(null);
        };

        canvas.on('selection:created', handleSelection);
        canvas.on('selection:updated', handleSelection);
        canvas.on('selection:cleared', handleSelectionCleared);

        // Movement with Snapping
        canvas.on('object:moving', (e) => {
            const obj = e.target as CustomFabricObject;
            if (!obj || !obj.data) return;

            snapLinesRef.current.forEach(line => canvas.remove(line));
            snapLinesRef.current = [];

            // Calculate percentage coordinates for snapping logic (reusing existing snap logic which uses %)
            // Wait, we refactored to absolute. Snapping utils usually expect %, but we can update snapping utils later or convert here.
            // Let's convert to % ONLY for snapping calculation to reuse the utility for now.
            // Ideally we refactor snapping to pixels too, but let's minimize scope if possible.
            // Actually, `calculateSnap` likely expects %, based on previous file usage.
            const percentX = (obj.left! / canvasWidth) * 100;
            const percentY = (obj.top! / canvasHeight) * 100;
            const percentW = (obj.getScaledWidth() / canvasWidth) * 100;
            const percentH = (obj.getScaledHeight() / canvasHeight) * 100;

            let newLeft = obj.left!;
            let newTop = obj.top!;

            if (isSnappingEnabledRef.current) {
                const snapResult = calculateSnap(
                    { x: percentX, y: percentY },
                    { width: percentW, height: percentH }
                );

                if (snapResult.snappedEdges.length > 0) {
                    newLeft = (snapResult.position.x / 100) * canvasWidth;
                    newTop = (snapResult.position.y / 100) * canvasHeight;

                    const activeLines = getActiveSnapLines(snapResult.snappedEdges);
                    // Use zoom-compensated sizes? Note: zoomRef not available here unless updated or using state?
                    // We can access 'zoom' state if we put this in useEffect dependency or use ref.
                    // Accessing zoomed UI sizes requires zoom factor.
                    // For now, let's just draw lines.
                    activeLines.forEach(line => {
                        let x1 = 0, y1 = 0, x2 = 0, y2 = 0;
                        if (line.orientation === 'vertical') {
                            x1 = x2 = (line.position / 100) * canvasWidth;
                            y1 = 0;
                            y2 = canvasHeight;
                        } else {
                            y1 = y2 = (line.position / 100) * canvasHeight;
                            x1 = 0;
                            x2 = canvasWidth;
                        }

                        const fabricLine = new fabric.Line([x1, y1, x2, y2], {
                            stroke: '#ff00ff',
                            strokeWidth: 1, // Fix later with zoom compensation
                            selectable: false,
                            evented: false,
                            strokeDashArray: [4, 4],
                        });
                        canvas.add(fabricLine);
                        snapLinesRef.current.push(fabricLine);
                    });
                }
            }

            // Apply validated position (Absolute Px)
            obj.left = newLeft;
            obj.top = newTop;

            // Allow bleed
            const bleedMargin = 50; // 50px bleed
            const minX = -obj.getScaledWidth() + bleedMargin;
            const maxX = canvasWidth - bleedMargin;
            const minY = -obj.getScaledHeight() + bleedMargin;
            const maxY = canvasHeight - bleedMargin;

            if (obj.left < minX) obj.left = minX;
            if (obj.left > maxX) obj.left = maxX;
            if (obj.top < minY) obj.top = minY;
            if (obj.top > maxY) obj.top = maxY;
        });

        // Modification Handler (End of drag/resize)
        canvas.on('object:modified', (e) => {
            const obj = e.target as CustomFabricObject;
            if (!obj || !obj.data) return;

            snapLinesRef.current.forEach(line => canvas.remove(line));
            snapLinesRef.current = [];

            onElementUpdateRef.current(spreadRef.current.id, obj.data.id, {
                position: { x: obj.left!, y: obj.top! },
                size: { width: obj.getScaledWidth(), height: obj.getScaledHeight() },
            });

            // Generate thumbnail
            if (onCanvasChangeRef.current) {
                const dataUrl = canvas.toDataURL({ format: 'jpeg', quality: 0.5, multiplier: 0.2 });
                onCanvasChangeRef.current(dataUrl);
            }
        });

        // Cleanup
        return () => {
            canvas.dispose();
            fabricCanvasRef.current = null;
        };
    }, [canvasWidth, canvasHeight]); // Re-init if dimensions change

    // Auto-Fit Logic (Run once on mount/resize)
    const fitToViewport = useCallback(() => {
        if (!containerRef.current) return;
        const viewport = containerRef.current;
        const padding = 64;
        const availableWidth = viewport.clientWidth - padding;
        const availableHeight = viewport.clientHeight - padding;

        // Calculate needed scale to fit
        const scaleX = availableWidth / canvasWidth;
        const scaleY = availableHeight / canvasHeight;
        const scale = Math.min(scaleX, scaleY);

        // Convert to percentage where 100% = Physical Size (scale = 96/300)
        // scale = (zoom / 100) * (96 / 300)
        // zoom = scale * 100 * (300 / 96)
        const zoomPercent = Math.max(10, Math.floor(scale * 100 * (PPI / SCREEN_PPI)));
        setZoom(zoomPercent);
    }, [canvasWidth, canvasHeight]);

    useEffect(() => {
        // Auto fit on first load if dimensions are known
        if (!isZoomInitialized.current && canvasWidth > 0) {
            // Small timeout to allow layout
            const timer = setTimeout(() => {
                fitToViewport();
                isZoomInitialized.current = true;
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [fitToViewport, canvasWidth]);

    // Handle Window Resize
    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout>;
        const handleResize = () => {
            clearTimeout(timeout);
            timeout = setTimeout(fitToViewport, 100);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [fitToViewport]);

    // Keyboard Deletion
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (['INPUT', 'TEXTAREA'].includes(target.tagName) && !target.closest('.canvas-container')) {
                return;
            }

            if (e.key === 'Delete' || e.key === 'Backspace') {
                const canvas = fabricCanvasRef.current;
                if (!canvas) return;
                const activeObj = canvas.getActiveObject() as CustomFabricObject;
                if (activeObj && activeObj.data) {
                    onElementDeleteRef.current(spreadRef.current.id, activeObj.data.id);
                    canvas.discardActiveObject();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Drag Drop Handlers
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const imageData = e.dataTransfer.getData('application/json');
        if (!imageData) return;

        try {
            const image: PoolImage = JSON.parse(imageData);
            const rect = wrapperRef.current?.getBoundingClientRect();
            if (!rect) return;

            // Calculate drop position relative to the canvas DOM element
            // We need to convert DOM pixels to Canvas pixels (taking zoom into account)
            const domX = e.clientX - rect.left;
            const domY = e.clientY - rect.top;

            // Convert to Canvas Coordinate Space (Absolute Px)
            // rect.width is the visual width (scale * canvasWidth)
            // Convert to Canvas Coordinate Space (Absolute Px)
            // rect.width is the visual width (scale * canvasWidth)
            const scale = (zoom / 100) * (SCREEN_PPI / PPI);
            const canvasX = domX / scale;
            const canvasY = domY / scale;

            onImageDropRef.current(spreadRef.current.id, image, { x: canvasX, y: canvasY });
        } catch (err) {
            console.error('Failed to parse drop', err);
        }
    }, [zoom]);

    // Sync State to Fabric
    useEffect(() => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        const currentObjects = canvas.getObjects() as CustomFabricObject[];
        const validIds = new Set<string>();
        const elementsToLoad: { element: PageElement, width: number, height: number }[] = [];

        spread.elements.forEach(element => {
            validIds.add(element.id);
            const existingObj = currentObjects.find(o => o.data?.id === element.id);

            // Directly use stored absolute coordinates
            const targetLeft = element.position.x;
            const targetTop = element.position.y;
            const targetWidth = element.size.width;
            const targetHeight = element.size.height;

            if (existingObj) {
                if (!isObjectMoving(existingObj)) {
                    let modified = false;
                    if (existingObj instanceof fabric.Image) {
                        // Update logic
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
                if (!fabricCanvasRef.current) return;

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

    }, [spread, selectedElementId, zoom]); // Re-run when spread data changes

    // Update UI sizes when zoom changes
    useEffect(() => {
        const canvas = fabricCanvasRef.current;
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
                // Snap line
                (obj as fabric.Line).set({
                    strokeWidth: uiSizes.snapLineStrokeWidth,
                    strokeDashArray: [uiSizes.snapLineDash, uiSizes.snapLineDash],
                });
                return;
            }

            // Element
            obj.set({
                cornerSize: uiSizes.cornerSize,
                borderScaleFactor: uiSizes.borderScaleFactor,
            });
        });
        canvas.requestRenderAll();
    }, [zoom]);


    // Styles
    const canvasStyle = {
        transform: `scale(${(zoom / 100) * (SCREEN_PPI / PPI)})`,
        transformOrigin: 'center center',
    };

    return (
        <section
            className="canvas-container"
            data-testid="canvas-container"
            data-has-selection={hasSelection}
        >
            <div
                ref={containerRef}
                className="canvas-viewport"
                data-testid="canvas-viewport"
                tabIndex={0}
                style={{ outline: 'none', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            >
                <div
                    ref={wrapperRef}
                    style={canvasStyle}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={isDragOver ? 'drop-active' : ''}
                >
                    <canvas ref={canvasElRef} data-testid="canvas-layer" />
                    {spread.elements.length === 0 && (
                        <div className="canvas-placeholder" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', textAlign: 'center', width: '100%' }}>
                            <span className="text-muted" style={{ opacity: 0.5 }}>
                                Drag images here
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <div className="canvas-controls">
                <button className="btn btn-ghost btn-icon" onClick={() => setZoom(z => Math.max(25, z - 25))} disabled={zoom <= 25}>-</button>
                <span className="zoom-display">{zoom}%</span>
                <button className="btn btn-ghost btn-icon" onClick={() => setZoom(z => Math.min(200, z + 25))} disabled={zoom >= 200}>+</button>
                <button className="btn btn-ghost" onClick={fitToViewport}>Fit</button>
            </div>
        </section>
    );
};
