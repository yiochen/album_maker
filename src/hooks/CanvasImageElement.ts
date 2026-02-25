import * as fabric from 'fabric';
import type { ImageContent, ImagePageElement } from '../types';
import { calculateGaplessRect, applyCoverTransform } from '../utils/imageUtils';
import {
    type OrientationMatrix, IDENTITY,
    getOrientedDimensions, decomposeForRendering,
} from '../utils/orientationMatrix';

export class CanvasImageElement extends fabric.Group {
    public pageElement: ImagePageElement;
    public data?: { id: string };
    private innerImage: fabric.Image;
    private clipRect: fabric.Rect;
    private placeholderFrame: fabric.Rect;
    private placeholderPlusH: fabric.Rect;
    private placeholderPlusV: fabric.Rect;
    public onContentTransformChange?: (elementId: string, contentTransform: ImageContent['contentTransform']) => void;
    private panControlSize: number;
    public currentUrl: string = '';

    constructor(
        element: ImagePageElement,
        options: Partial<fabric.FabricObjectProps> & {
            interactive?: boolean;
            uniformScaling?: boolean;
            onContentTransformChange?: (elementId: string, contentTransform: ImageContent['contentTransform']) => void;
            panControlSize?: number;
        } = {}
    ) {
        // Create inner image (placeholder initially)
        // fabric.Image handles null source in v7
        const innerImage = new fabric.Image(null as unknown as HTMLImageElement, {
            originX: 'left',
            originY: 'top',
            left: 0,
            top: 0,
        });

        // Editor-only placeholder visuals for image frames that have no assigned photo yet.
        const placeholderFrame = new fabric.Rect({
            originX: 'left',
            originY: 'top',
            left: 0,
            top: 0,
            fill: '#f8fafc',
            stroke: '#94a3b8',
            strokeWidth: 1,
            strokeDashArray: [6, 6],
            selectable: false,
            evented: false,
        });
        const placeholderPlusH = new fabric.Rect({
            originX: 'center',
            originY: 'center',
            width: 30,
            height: 4,
            rx: 2,
            ry: 2,
            fill: '#64748b',
            selectable: false,
            evented: false,
        });
        const placeholderPlusV = new fabric.Rect({
            originX: 'center',
            originY: 'center',
            width: 4,
            height: 30,
            rx: 2,
            ry: 2,
            fill: '#64748b',
            selectable: false,
            evented: false,
        });

        // Initialize group with children and explicit left-top origin
        super([placeholderFrame, placeholderPlusH, placeholderPlusV, innerImage], {
            ...options,
            originX: 'left',
            originY: 'top',
            subTargetCheck: false, // Don't allow selecting the inner image directly
            interactive: true,
            data: { id: element.id },
            lockRotation: true,
            uniformScaling: options.uniformScaling !== undefined ? options.uniformScaling : true,
            lockUniScaling: options.uniformScaling !== undefined ? options.uniformScaling : true,
            selectable: options.interactive !== false,
            evented: options.interactive !== false,
        });

        this.pageElement = element;
        this.innerImage = innerImage;
        this.placeholderFrame = placeholderFrame;
        this.placeholderPlusH = placeholderPlusH;
        this.placeholderPlusV = placeholderPlusV;
        this.onContentTransformChange = options.onContentTransformChange;
        this.panControlSize = options.panControlSize ?? 22;

        if (options.interactive !== false) {
            this.updateControlVisibility(options.uniformScaling !== undefined ? options.uniformScaling : true);
            this.addPanControl();
        }

        // Create clip path for the frame
        this.clipRect = new fabric.Rect({
            originX: 'left',
            originY: 'top',
            left: 0,
            top: 0,
            fill: 'transparent',
            strokeWidth: 0,
        });

        this.clipPath = this.clipRect;
        this.updatePlaceholderVisibility();
    }

    /**
     * Load image and update layout
     */
    async loadImage(url: string) {
        if (!url) {
            this.clearImage();
            return;
        }

        this.currentUrl = url;
        return new Promise<void>((resolve, reject) => {
            // Check if we are in a worker or browser main thread
            if (typeof window === 'undefined' || typeof HTMLImageElement === 'undefined') {
                // Worker context
                fetch(url)
                    .then(response => response.blob())
                    .then(blob => createImageBitmap(blob))
                    .then(imageBitmap => {
                        // Fabric v7 Image.setElement handles ImageBitmap
                        this.innerImage.setElement(imageBitmap as unknown as HTMLImageElement);
                        this.applyLayout();
                        resolve();
                    })
                    .catch(reject);
            } else {
                // Main thread
                fabric.util.loadImage(url, { crossOrigin: 'anonymous' })
                    .then((imgElement) => {
                        this.innerImage.setElement(imgElement);
                        this.applyLayout();
                        resolve();
                    })
                    .catch(reject);
            }
        });
    }

    clearImage() {
        this.currentUrl = '';
        this.innerImage.setElement(null as unknown as HTMLImageElement);
        this.applyLayout();
    }

    /**
     * Calculate position and size based on normalized box model
     */
    applyLayout(canvasWidth: number = this.canvas?.width || 1, canvasHeight: number = this.canvas?.height || 1) {
        const rect = calculateGaplessRect(this.pageElement.box, canvasWidth, canvasHeight);

        this.set({
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            scaleX: 1,
            scaleY: 1,
        });

        // The clipPath in Fabric groups is relative to the center of the group by default.
        // Even if the group has originX: 'left', the internal 0,0 is the center.
        this.clipRect.set({
            left: -rect.width / 2,
            top: -rect.height / 2,
            width: rect.width,
            height: rect.height,
        });

        this.updatePlaceholderLayout(rect.width, rect.height);
        this.updatePlaceholderVisibility();
        this.applyCover();
        this.setCoords();
    }

    /**
     * Resizes/positions internal image to cover the frame area
     */
    applyCover() {
        if (!this.innerImage.getElement()) return;

        const imgWidth = this.innerImage.width || 1;
        const imgHeight = this.innerImage.height || 1;

        const content = this.pageElement.content as ImageContent;
        const transform = {
            zoom: 1,
            panX: 0.5,
            panY: 0.5,
            ...(content.contentTransform || {})
        };

        const orientation: OrientationMatrix = transform.orientation ?? IDENTITY;
        const oriented = getOrientedDimensions(imgWidth, imgHeight, orientation);

        const result = applyCoverTransform(
            this.width,
            this.height,
            oriented.width,
            oriented.height,
            transform
        );

        // Decompose orientation for Fabric.js (which applies flip-then-rotate in local space)
        const { angleDeg, flipX } = decomposeForRendering(orientation);
        const baseScale = result.scale;

        // Position relative to group center
        // The inner image center should be at (cover.left + cover.width/2, cover.top + cover.height/2)
        // relative to the group's top-left, offset by -width/2, -height/2 for fabric group centering.
        this.innerImage.set({
            left: result.left + result.width / 2 - this.width / 2,
            top: result.top + result.height / 2 - this.height / 2,
            originX: 'center',
            originY: 'center',
            scaleX: baseScale,
            scaleY: baseScale,
            flipX,
            flipY: false,
            angle: angleDeg,
        });
        this.updatePlaceholderVisibility();
    }

    updatePanFromDelta(deltaX: number, deltaY: number) {
        if (!this.innerImage.getElement()) return false;

        const imgWidth = this.innerImage.width || 1;
        const imgHeight = this.innerImage.height || 1;
        const content = this.pageElement.content as ImageContent;
        const transform = {
            zoom: 1,
            panX: 0.5,
            panY: 0.5,
            ...(content.contentTransform || {})
        };

        const orientation: OrientationMatrix = transform.orientation ?? IDENTITY;
        const oriented = getOrientedDimensions(imgWidth, imgHeight, orientation);

        const coverage = applyCoverTransform(
            this.width,
            this.height,
            oriented.width,
            oriented.height,
            transform
        );

        let nextPanX = transform.panX;
        let nextPanY = transform.panY;

        if (coverage.overflowWidth > 0) {
            nextPanX = Math.min(1, Math.max(0, transform.panX - deltaX / coverage.overflowWidth));
        }

        if (coverage.overflowHeight > 0) {
            nextPanY = Math.min(1, Math.max(0, transform.panY - deltaY / coverage.overflowHeight));
        }

        if (nextPanX === transform.panX && nextPanY === transform.panY) {
            return false;
        }

        (this.pageElement.content as ImageContent).contentTransform = {
            ...transform,
            panX: nextPanX,
            panY: nextPanY,
        };

        this.applyCover();
        this.setCoords();
        // REMOVED: this.onContentTransformChange?.(this.pageElement.id, this.pageElement.content.contentTransform);
        return true;
    }

    private updatePlaceholderLayout(width: number, height: number) {
        this.placeholderFrame.set({
            left: -width / 2,
            top: -height / 2,
            width,
            height,
        });
        this.placeholderPlusH.set({
            left: 0,
            top: 0,
            width: Math.max(24, Math.min(40, width * 0.18)),
            height: Math.max(3, Math.min(6, height * 0.02)),
        });
        this.placeholderPlusV.set({
            left: 0,
            top: 0,
            width: Math.max(3, Math.min(6, width * 0.02)),
            height: Math.max(24, Math.min(40, height * 0.18)),
        });
    }

    private updatePlaceholderVisibility() {
        const content = this.pageElement.content as ImageContent;
        const showPlaceholder = !!content.isPlaceholder;
        this.placeholderFrame.set({ visible: showPlaceholder });
        this.placeholderPlusH.set({ visible: showPlaceholder });
        this.placeholderPlusV.set({ visible: showPlaceholder });
        this.innerImage.set({ visible: !showPlaceholder });
    }

    setPanControlSize(size: number) {
        this.panControlSize = size;
        const control = this.controls?.pan;
        if (control) {
            control.sizeX = size;
            control.sizeY = size;
            control.touchSizeX = size * 1.4;
            control.touchSizeY = size * 1.4;
        }
    }

    private addPanControl() {
        const size = this.panControlSize;
        this.controls = {
            ...this.controls,
            pan: new fabric.Control({
                x: 0,
                y: 0,
                cursorStyle: 'grab',
                actionName: 'pan',
                sizeX: size,
                sizeY: size,
                touchSizeX: size * 1.4,
                touchSizeY: size * 1.4,
                render: (ctx, left, top, _styleOverride, fabricObject) => {
                    const target = fabricObject as CanvasImageElement;
                    const size = target.panControlSize || 22;
                    ctx.save();
                    ctx.translate(left, top);
                    const radius = size / 2 - 2;
                    ctx.beginPath();
                    ctx.arc(0, 0, radius, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
                    ctx.fill();

                    const line = radius * 0.55;
                    const head = radius * 0.28;
                    ctx.strokeStyle = 'white';
                    ctx.lineWidth = Math.max(1.5, size * 0.08);
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    ctx.beginPath();
                    // Up
                    ctx.moveTo(0, -line);
                    ctx.lineTo(0, -radius * 0.15);
                    ctx.moveTo(0, -line);
                    ctx.lineTo(-head, -line + head);
                    ctx.moveTo(0, -line);
                    ctx.lineTo(head, -line + head);
                    // Down
                    ctx.moveTo(0, line);
                    ctx.lineTo(0, radius * 0.15);
                    ctx.moveTo(0, line);
                    ctx.lineTo(-head, line - head);
                    ctx.moveTo(0, line);
                    ctx.lineTo(head, line - head);
                    // Left
                    ctx.moveTo(-line, 0);
                    ctx.lineTo(-radius * 0.15, 0);
                    ctx.moveTo(-line, 0);
                    ctx.lineTo(-line + head, -head);
                    ctx.moveTo(-line, 0);
                    ctx.lineTo(-line + head, head);
                    // Right
                    ctx.moveTo(line, 0);
                    ctx.lineTo(radius * 0.15, 0);
                    ctx.moveTo(line, 0);
                    ctx.lineTo(line - head, -head);
                    ctx.moveTo(line, 0);
                    ctx.lineTo(line - head, head);
                    ctx.stroke();
                    ctx.restore();
                },
                actionHandler: (_eventData, transform, x, y) => {
                    const target = transform.target;
                    if (!(target instanceof CanvasImageElement)) {
                        return false;
                    }
                    const deltaX = x - transform.lastX;
                    const deltaY = y - transform.lastY;
                    transform.lastX = x;
                    transform.lastY = y;
                    return target.updatePanFromDelta(deltaX, deltaY);
                },
            }),
        };
    }

    /**
     * Update Normalized Floats from current pixel dimensions
     * Implementation of "Anchor Locking"
     */
    updateLayoutFromPixels(activeCorner: string = '', canvasWidth: number = this.canvas?.width || 1, canvasHeight: number = this.canvas?.height || 1) {
        const left = this.left;
        const top = this.top;
        const width = this.width * this.scaleX;
        const height = this.height * this.scaleY;
        const right = left + width;
        const bottom = top + height;

        const newX1 = left / canvasWidth;
        const newY1 = top / canvasHeight;
        const newX2 = right / canvasWidth;
        const newY2 = bottom / canvasHeight;

        const oldBox = this.pageElement.box;
        const newBox = { ...oldBox };

        // Anchor Locking: Restore old coordinates if they weren't supposed to change
        // Corners: 'tl', 'tr', 'bl', 'br', 'mt', 'mb', 'ml', 'mr'

        const isResizing = activeCorner !== '';

        if (isResizing) {
            // If dragging RIGHT handle ('mr', 'tr', 'br'), x1 (left) must not change
            if (activeCorner.includes('r')) {
                newBox.x1 = oldBox.x1;
                newBox.x2 = newX2;
            }
            // If dragging LEFT handle ('ml', 'tl', 'bl'), x2 (right) must not change
            if (activeCorner.includes('l')) {
                newBox.x2 = oldBox.x2;
                newBox.x1 = newX1;
            }
            // If dragging BOTTOM handle ('mb', 'bl', 'br'), y1 (top) must not change
            if (activeCorner.includes('b')) {
                newBox.y1 = oldBox.y1;
                newBox.y2 = newY2;
            }
            // If dragging TOP handle ('mt', 'tl', 'tr'), y2 (bottom) must not change
            if (activeCorner.includes('t')) {
                newBox.y2 = oldBox.y2;
                newBox.y1 = newY1;
            }
        } else {
            // Dragging (moving) the whole element
            newBox.x1 = newX1;
            newBox.y1 = newY1;
            newBox.x2 = newX2;
            newBox.y2 = newY2;
        }

        this.pageElement.box = newBox;
    }

    /**
     * Shows corner handles and hides middle handles if aspect ratio is locked.
     */
    updateControlVisibility(isLocked: boolean) {
        this.setControlsVisibility({
            mt: !isLocked,
            mb: !isLocked,
            ml: !isLocked,
            mr: !isLocked,
            tl: true,
            tr: true,
            bl: true,
            br: true,
            mtr: false, // Rotation is already locked at group level, but let's be explicit
        });
    }
}
