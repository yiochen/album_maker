import * as fabric from 'fabric';
import type { PageElement } from '../types';
import { calculateGaplessRect, applyCoverTransform } from '../utils/imageUtils';

export class CanvasPageElement extends fabric.Group {
    public pageElement: PageElement;
    private innerImage: fabric.Image;
    private clipRect: fabric.Rect;
    public uniformScaling: boolean = true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(element: PageElement, options: any = {}) {
        // Create inner image (placeholder initially)
        const innerImage = new fabric.Image(new Image(), {
            originX: 'left',
            originY: 'top',
            left: 0,
            top: 0,
        });

        // Initialize group with children and explicit left-top origin
        super([innerImage], {
            ...options,
            originX: 'left',
            originY: 'top',
            subTargetCheck: false, // Don't allow selecting the inner image directly
            interactive: true,
            data: { id: element.id },
            lockRotation: true,
            uniformScaling: options.uniformScaling ?? true,
        });

        this.pageElement = element;
        this.innerImage = innerImage;
        this.uniformScaling = options.uniformScaling ?? true;

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
    }

    /**
     * Load image and update layout
     */
    async loadImage() {
        return new Promise<void>((resolve, reject) => {
            fabric.util.loadImage(this.pageElement.imageUrl, { crossOrigin: 'anonymous' })
                .then((imgElement) => {
                    this.innerImage.setElement(imgElement);
                    this.applyLayout();
                    resolve();
                })
                .catch(reject);
        });
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

        const transform = {
            zoom: 1,
            panX: 0.5,
            panY: 0.5,
            ...(this.pageElement.contentTransform || {})
        };

        const result = applyCoverTransform(
            this.width,
            this.height,
            imgWidth,
            imgHeight,
            transform
        );

        // Position relative to group top-left (0,0)
        // Fabric groups with origin top-left usually position children relative to their center
        // unless they are initialized with absolute coordinates.
        // However, we want strict top-left alignment for the frame.
        this.innerImage.set({
            left: result.left - this.width / 2,
            top: result.top - this.height / 2,
            scaleX: result.scale,
            scaleY: result.scale,
        });
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
}
