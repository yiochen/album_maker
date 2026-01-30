import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as fabric from 'fabric';
import type { Page, PageElement, PoolImage, AlbumSettings, SnapEdge } from '../types';
import { calculateSnap, getActiveSnapLines } from '../utils/snapping';

interface CanvasProps {
    pages: Page[];
    pageIndex: number;
    settings: AlbumSettings;
    selectedElementId: string | null;
    isSnappingEnabled: boolean;
    onElementSelect: (elementId: string | null) => void;
    onElementUpdate: (pageId: string, elementId: string, updates: Partial<PageElement>) => void;
    onElementDelete: (pageId: string, elementId: string) => void;
    onImageDrop: (pageId: string, image: PoolImage, position: { x: number; y: number }) => void;
    onMoveElementToPage?: (fromPageId: string, toPageId: string, elementId: string) => void;
    onCanvasChange?: (dataUrl: string) => void;
}

const PPI = 96;

interface CustomFabricObject extends fabric.Object {
    data?: {
        id: string;
        pageId: string;
    };
}

interface ExtendedFabricObject extends fabric.Object {
    isMoving?: boolean;
}

export const Canvas: React.FC<CanvasProps> = ({
    pages,
    pageIndex,
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

    // Refs for callbacks
    const onElementSelectRef = useRef(onElementSelect);
    const onElementUpdateRef = useRef(onElementUpdate);
    const onElementDeleteRef = useRef(onElementDelete);
    const onImageDropRef = useRef(onImageDrop);
    const onCanvasChangeRef = useRef(onCanvasChange);
    const pagesRef = useRef(pages);
    const settingsRef = useRef(settings);
    const isSnappingEnabledRef = useRef(isSnappingEnabled);

    useEffect(() => {
        onElementSelectRef.current = onElementSelect;
        onElementUpdateRef.current = onElementUpdate;
        onElementDeleteRef.current = onElementDelete;
        onImageDropRef.current = onImageDrop;
        onCanvasChangeRef.current = onCanvasChange;
        pagesRef.current = pages;
        settingsRef.current = settings;
        isSnappingEnabledRef.current = isSnappingEnabled;
    }, [onElementSelect, onElementUpdate, onElementDelete, onImageDrop, onCanvasChange, pages, settings, isSnappingEnabled]);

    const [zoom, setZoom] = useState(100);
    const [isDragOver, setIsDragOver] = useState(false);
    const [hasSelection, setHasSelection] = useState(false);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [activeSnapLines, setActiveSnapLines] = useState<SnapEdge[]>([]);

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

        const seam = new fabric.Line([canvasWidth / 2, 0, canvasWidth / 2, canvasHeight], {
            stroke: '#ccc',
            strokeWidth: 2,
            selectable: false,
            evented: false,
            strokeDashArray: [5, 5],
        });
        (seam as CustomFabricObject).data = { id: 'seam', pageId: '' };
        canvas.add(seam);
        canvas.sendObjectToBack(seam);

        const setMoving = (e: { target?: fabric.Object }) => { if (e.target) (e.target as ExtendedFabricObject).isMoving = true; };
        canvas.on('object:moving', setMoving);
        canvas.on('object:scaling', setMoving);
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
            } else if (selected.length > 1) {
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
                            strokeWidth: 1,
                            selectable: false,
                            evented: false,
                            strokeDashArray: [4, 4],
                        });
                        canvas.add(fabricLine);
                        snapLinesRef.current.push(fabricLine);
                    });
                }
            }

            obj.left = newLeft;
            obj.top = newTop;

            const pageId = obj.data.pageId;
            const pages = pagesRef.current;
            const isRightPage = pages[1] && pages[1].id === pageId;

            const pageWidth = canvasWidth / 2;
            const minX = isRightPage ? pageWidth : 0;
            const maxX = (isRightPage ? canvasWidth : pageWidth) - (obj.getScaledWidth() || 0);
            const minY = 0;
            const maxY = canvasHeight - (obj.getScaledHeight() || 0);

            if (obj.left < minX) obj.left = minX;
            if (obj.left > maxX) obj.left = maxX;
            if (obj.top < minY) obj.top = minY;
            if (obj.top > maxY) obj.top = maxY;
        });

        canvas.on('object:modified', (e) => {
            const obj = e.target as CustomFabricObject;
            if (!obj || !obj.data) return;

            snapLinesRef.current.forEach(line => canvas.remove(line));
            snapLinesRef.current = [];

            const pageId = obj.data.pageId;
            const pages = pagesRef.current;
            const isRightPage = pages[1] && pages[1].id === pageId;

            const pageWidth = canvasWidth / 2;
            const offsetLeft = isRightPage ? pageWidth : 0;

            const relativeLeft = (obj.left! - offsetLeft);
            const percentX = (relativeLeft / pageWidth) * 100;
            const percentY = (obj.top! / canvasHeight) * 100;

            const percentW = (obj.getScaledWidth() / pageWidth) * 100;
            const percentH = (obj.getScaledHeight() / canvasHeight) * 100;

            onElementUpdateRef.current(pageId, obj.data.id, {
                position: { x: percentX, y: percentY },
                size: { width: percentW, height: percentH },
            });

            // Generate thumbnail
            if (onCanvasChangeRef.current) {
                const dataUrl = canvas.toDataURL({ format: 'jpeg', quality: 0.5, multiplier: 0.2 });
                onCanvasChangeRef.current(dataUrl);
            }
        });

        return () => {
            canvas.dispose();
            fabricCanvasRef.current = null;
        };
    }, [canvasWidth, canvasHeight]);

    // Keyboard Events
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            // Ignore if input is focused, unless it's inside the canvas container (Fabric's hidden textarea)
            if (['INPUT', 'TEXTAREA'].includes(target.tagName) && !target.closest('.canvas-container')) {
                return;
            }

            if (e.key === 'Delete' || e.key === 'Backspace') {
                const canvas = fabricCanvasRef.current;
                if (!canvas) return;

                const activeObj = canvas.getActiveObject() as CustomFabricObject;
                if (activeObj && activeObj.data) {
                    onElementDeleteRef.current(activeObj.data.pageId, activeObj.data.id);
                    canvas.discardActiveObject();
                    canvas.requestRenderAll();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Drag and Drop
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

            // Calculate drop position as percentage of spread
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;

            // Determine which page (left or right) based on x position
            const isRightPage = x > 50;
            const targetPage = pagesRef.current[isRightPage ? 1 : 0];

            if (targetPage) {
                // Adjust x for the target page (0-100% within that page)
                const adjustedX = isRightPage ? (x - 50) * 2 : x * 2;
                onImageDropRef.current(targetPage.id, image, { x: adjustedX, y });
            }
        } catch (err) {
            console.error('Failed to parse dropped item', err);
        }
    }, []);

    // Sync State to Fabric
    useEffect(() => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        const currentObjects = canvas.getObjects() as CustomFabricObject[];
        const validIds = new Set<string>();
        const elementsToLoad: { element: PageElement, pageId: string, left: number, top: number, width: number, height: number }[] = [];

        [pages[0], pages[1]].forEach((page, i) => {
            if (!page) return;
            const pageOffsetX = i * (canvasWidth / 2);

            page.elements.forEach(element => {
                validIds.add(element.id);

                const existingObj = currentObjects.find(o => o.data?.id === element.id);

                const targetLeft = pageOffsetX + (element.position.x / 100) * (canvasWidth / 2);
                const targetTop = (element.position.y / 100) * canvasHeight;
                const targetWidth = (element.size.width / 100) * (canvasWidth / 2);
                const targetHeight = (element.size.height / 100) * canvasHeight;

                if (existingObj) {
                    if (!isObjectMoving(existingObj)) {
                        let modified = false;
                        if (existingObj instanceof fabric.Image) {
                            const img = existingObj;
                            const newScaleX = targetWidth / (img.width || 1);
                            const newScaleY = targetHeight / (img.height || 1);

                            if (Math.abs(img.left! - targetLeft) > 0.5) { img.set('left', targetLeft); modified = true; }
                            if (Math.abs(img.top! - targetTop) > 0.5) { img.set('top', targetTop); modified = true; }
                            if (Math.abs((img.scaleX || 1) - newScaleX) > 0.001) { img.set('scaleX', newScaleX); modified = true; }
                            if (Math.abs((img.scaleY || 1) - newScaleY) > 0.001) { img.set('scaleY', newScaleY); modified = true; }

                            if (modified) img.setCoords();
                        }
                    }
                } else {
                    if (!loadingIds.current.has(element.id)) {
                        elementsToLoad.push({ element, pageId: page.id, left: targetLeft, top: targetTop, width: targetWidth, height: targetHeight });
                    }
                }
            });
        });

        const objectsToRemove = currentObjects.filter(obj => {
            const data = obj.data;
            if (data?.id === 'seam') return false;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (obj instanceof fabric.Line && (obj as any).stroke === '#ff00ff') return false;
            if (data?.id && !validIds.has(data.id)) return true;
            return false;
        });

        objectsToRemove.forEach(obj => canvas.remove(obj));
        if (objectsToRemove.length > 0) canvas.requestRenderAll();

        elementsToLoad.forEach(async (task) => {
            const { element, pageId, left, top, width, height } = task;

            loadingIds.current.add(element.id);
            try {
                const img = await fabric.Image.fromURL(element.imageUrl, {
                    crossOrigin: 'anonymous'
                });

                if (!fabricCanvasRef.current) return;

                img.set({
                    left: left,
                    top: top,
                    originX: 'left',
                    originY: 'top',
                    scaleX: width / (img.width || 1),
                    scaleY: height / (img.height || 1),
                    data: { id: element.id, pageId: pageId },
                    lockRotation: true,
                    cornerStyle: 'circle',
                    cornerColor: 'white',
                    cornerStrokeColor: '#333',
                    borderColor: '#333',
                    transparentCorners: false,
                });

                canvas.add(img);

                if (selectedElementId === element.id) {
                    canvas.setActiveObject(img);
                }
                canvas.requestRenderAll();

            } catch (err) {
                console.error("Failed to load image", element.imageUrl, err);
            } finally {
                loadingIds.current.delete(element.id);
            }
        });

        canvas.requestRenderAll();

    }, [pages, canvasWidth, canvasHeight, selectedElementId]);

    // Update selection
    useEffect(() => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        const activeObj = canvas.getActiveObject() as CustomFabricObject;

        if (selectedElementId) {
            if (!activeObj || activeObj.data?.id !== selectedElementId) {
                const target = (canvas.getObjects() as CustomFabricObject[]).find(o => o.data?.id === selectedElementId);
                if (target) {
                    canvas.setActiveObject(target);
                    canvas.requestRenderAll();
                }
            }
        } else {
            if (activeObj) {
                canvas.discardActiveObject();
                canvas.requestRenderAll();
            }
        }
    }, [selectedElementId]);

    const fitToViewport = useCallback(() => {
        if (!containerRef.current) return;

        const viewport = containerRef.current;
        const padding = 64;
        const availableWidth = viewport.clientWidth - padding;
        const availableHeight = viewport.clientHeight - padding;

        const zoomToFitWidth = (availableWidth / canvasWidth) * 100;
        const zoomToFitHeight = (availableHeight / canvasHeight) * 100;

        const fitZoom = Math.min(zoomToFitWidth, zoomToFitHeight, 100);
        setZoom(Math.max(25, Math.round(fitZoom)));
    }, [canvasWidth, canvasHeight]);

    useEffect(() => {
        const timer = setTimeout(() => fitToViewport(), 0);
        window.addEventListener('resize', fitToViewport);
        return () => {
            window.removeEventListener('resize', fitToViewport);
            clearTimeout(timer);
        };
    }, [fitToViewport]);

    const canvasStyle = {
        transform: `scale(${zoom / 100})`,
        transformOrigin: 'center center',
    };

    // Debounced canvas change notification
    useEffect(() => {
        const timer = setTimeout(() => {
            if (onCanvasChange && fabricCanvasRef.current) {
                // For Fabric, we might want to export to JSON or DataURL
                const dataUrl = fabricCanvasRef.current.toDataURL({ multiplier: 1 });
                onCanvasChange(dataUrl);
            }
        }, 1000); // 1s debounce for final settling
        return () => clearTimeout(timer);
    }, [pages, onCanvasChange]);


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
                    data-testid="interaction-layer"
                >
                    <canvas ref={canvasElRef} data-testid="canvas-layer" />
                    {pages.every(p => p.elements.length === 0) && (
                        <div className="canvas-placeholder" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', textAlign: 'center', width: '100%' }}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ margin: '0 auto', display: 'block', opacity: 0.3 }}>
                                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
                                <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                                <path d="M21 15L16 10L11 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                            <span className="canvas-placeholder-text" style={{ display: 'block', marginTop: '1rem', opacity: 0.5 }}>
                                Drag images here from the image pool
                            </span>
                            <span className="text-muted" style={{ display: 'block', fontSize: '0.875rem', marginTop: '0.5rem', opacity: 0.4 }}>
                                Pages {pageIndex + 1} - {pageIndex + 2}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Controls (Zoom) - Keep existing */}
            <div className="canvas-controls">
                <button
                    className="btn btn-ghost btn-icon"
                    onClick={() => setZoom(z => Math.max(25, z - 25))}
                    disabled={zoom <= 25}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                        <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <path d="M8 11h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </button>
                <span className="zoom-display">{zoom}%</span>
                <button
                    className="btn btn-ghost btn-icon"
                    onClick={() => setZoom(z => Math.min(200, z + 25))}
                    disabled={zoom >= 200}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                        <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <path d="M11 8v6M8 11h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </button>
                <button
                    className="btn btn-ghost"
                    onClick={fitToViewport}
                    style={{ marginLeft: 'var(--space-2)' }}
                >
                    Fit
                </button>
            </div>
        </section>
    );
};
