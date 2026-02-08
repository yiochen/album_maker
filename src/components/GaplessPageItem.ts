import * as fabric from 'fabric';
import { PageElement } from '../types';
import { CustomFabricObject } from '../hooks/fabricTypes';

// Extend fabric.Group and implement CustomFabricObject interface
export class GaplessPageItem extends fabric.Group implements CustomFabricObject {
    public pageElement: PageElement;
    public data: { id: string };

    // The internal image
    private _img: fabric.Image;
    // The clipping rect (same size as the group)
    private _clippingRect: fabric.Rect;

    constructor(element: PageElement, img: fabric.Image, options: Record<string, unknown> = {}) {
        // Initialize with image
        // Cast options to any to satisfy TS constraint on super constructor options
        const groupOptions = {
            ...options,
            originX: 'center',
            originY: 'center',
            // Disable default group behavior of resizing to fit content
            subTargetCheck: false,
            interactive: true,
            objectCaching: false, // For smoother updates during dev/testing
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;

        super([img], groupOptions);

        this.pageElement = element;
        this.data = { id: element.id };
        this._img = img;

        // Initialize clipping rect
        // We use a Rect as clipPath. It is relative to the group's center.
        this._clippingRect = new fabric.Rect({
            originX: 'center',
            originY: 'center',
            width: 100, // Placeholder
            height: 100, // Placeholder
        });
        this.clipPath = this._clippingRect;
    }

    /**
     * Applies the layout from the normalized 'box' to the fabric object
     * calculating precise integer pixel coordinates.
     */
    public applyLayout(canvasWidth: number, canvasHeight: number) {
        if (!this.pageElement.box) return;

        const { x1, y1, x2, y2 } = this.pageElement.box;

        // 1. Calculate integer pixels for edges
        const pixelLeft = Math.round(x1 * canvasWidth);
        const pixelTop = Math.round(y1 * canvasHeight);
        const pixelRight = Math.round(x2 * canvasWidth);
        const pixelBottom = Math.round(y2 * canvasHeight);

        // 2. Calculate dimensions
        const width = pixelRight - pixelLeft;
        const height = pixelBottom - pixelTop;

        // 3. Update Group position and size
        // Fabric uses center origin by default for Groups usually, or we enforced it in options.
        // But simply setting left/top/width/height works if origin is correct.
        // We use center origin in constructor.

        const centerX = pixelLeft + width / 2;
        const centerY = pixelTop + height / 2;

        this.set({
            left: centerX,
            top: centerY,
            width: width,
            height: height,
            scaleX: 1, // Reset scale to 1 because we control width/height directly
            scaleY: 1
        });

        // Update clipping rect to match new size
        this._clippingRect.set({
            width: width,
            height: height,
            left: 0, // Relative to group center
            top: 0   // Relative to group center
        });
        // Fabric 6+: clipPath might need to be marked dirty?
        this._clippingRect.setCoords();

        // 4. Update inner image (SmartFrame logic)
        this.applyCover();

        this.setCoords();
    }

    /**
     * Updates the inner image to cover the frame based on contentTransform
     */
    public applyCover() {
        if (!this._img) return;

        const frameWidth = this.width;
        const frameHeight = this.height;
        const imgWidth = this._img.width || 1;
        const imgHeight = this._img.height || 1;

        // 1. Calculate 'Cover' scale
        const scaleX = frameWidth / imgWidth;
        const scaleY = frameHeight / imgHeight;
        const coverScale = Math.max(scaleX, scaleY);

        // 2. Apply user zoom
        const userZoom = this.pageElement.contentTransform?.zoom ?? 1;
        const finalScale = coverScale * userZoom;

        // 3. Apply Pan
        // Pan is normalized (0-1) where 0.5 is center.
        // We need to map pan (0-1) to position relative to frame center.
        // If pan is 0.5, image center aligns with frame center.

        const panX = this.pageElement.contentTransform?.panX ?? 0.5;
        const panY = this.pageElement.contentTransform?.panY ?? 0.5;

        // Calculate available panning range
        // The image is larger than frame (usually).
        const visibleWidth = frameWidth;
        const visibleHeight = frameHeight;
        const actualImgWidth = imgWidth * finalScale;
        const actualImgHeight = imgHeight * finalScale;

        // Range of center movement?
        // Usually pan works by mapping 0..1 to (minPan..maxPan)
        // Let's implement standard pan:
        // center matches center when pan=0.5

        // Offset from center
        // If panX = 0.5, offset = 0
        // If panX = 0, we want left edge of image to align with left edge of frame?
        // No, typically 'cover' allows panning to see hidden parts.
        // Let's assume standard behavior:
        // panX shifts the image.
        // Let's calculate image center position relative to group center (0,0)

        // Max range: (actualImgWidth - frameWidth) / 2
        // X position = (0.5 - panX) * (actualImgWidth - frameWidth) ?
        // If panX = 0 (left), we want image left to match frame left?
        // Frame left is -frameWidth/2. Image left is x - actualImgWidth/2.
        // -frameWidth/2 = x - actualImgWidth/2 => x = (actualImgWidth - frameWidth)/2
        // If panX = 1 (right), we want image right to match frame right?
        // Frame right is frameWidth/2. Image right is x + actualImgWidth/2.
        // frameWidth/2 = x + actualImgWidth/2 => x = (frameWidth - actualImgWidth)/2
        // So range is +/- (actualImgWidth - frameWidth)/2

        // Let's try:
        // x = (0.5 - panX) * 2 * ((actualImgWidth - frameWidth)/2) = (0.5 - panX) * (actualImgWidth - frameWidth)
        // If panX = 0, x = 0.5 * diff. (Positive, moves image right).
        // If panX = 1, x = -0.5 * diff. (Negative, moves image left).

        // Wait, if image is smaller than frame (due to zoom < cover?), we might want to clamp or center?
        // For now assume zoom >= 1 (cover).

        let offsetX = 0;
        let offsetY = 0;

        if (actualImgWidth > visibleWidth) {
             offsetX = (0.5 - panX) * (actualImgWidth - visibleWidth);
        }
        if (actualImgHeight > visibleHeight) {
             offsetY = (0.5 - panY) * (actualImgHeight - visibleHeight);
        }

        this._img.set({
            scaleX: finalScale,
            scaleY: finalScale,
            left: offsetX,
            top: offsetY,
            originX: 'center',
            originY: 'center'
        });

        this._img.setCoords();
    }

    /**
     * Calculates the normalized box from the current pixel dimensions/position.
     * To be called during/after resize/drag.
     */
    public updateLayoutFromPixels(
        canvasWidth: number,
        canvasHeight: number,
        activeCorner?: string
    ): { box: { x1: number, y1: number, x2: number, y2: number } } {
        // Current values in pixels (Fabric logic)
        // this.left/top are center coordinates
        const centerLeft = this.left;
        const centerTop = this.top;
        const w = this.getScaledWidth();
        const h = this.getScaledHeight();

        const pixelLeft = centerLeft - w / 2;
        const pixelTop = centerTop - h / 2;
        const pixelRight = centerLeft + w / 2;
        const pixelBottom = centerTop + h / 2;

        // Convert to normalized 0-1
        let x1 = pixelLeft / canvasWidth;
        let y1 = pixelTop / canvasHeight;
        let x2 = pixelRight / canvasWidth;
        let y2 = pixelBottom / canvasHeight;

        // Anchor Locking Logic
        // If we are resizing, we want to anchor the opposite side to prevent floating point drift
        // on the static side.
        // activeCorner example: 'tl', 'br', 'mr', etc.

        if (activeCorner && this.pageElement.box) {
            const oldBox = this.pageElement.box;

            // Map corner to locked edges
            // If dragging 'br' (bottom-right), lock top-left (x1, y1)
            // If dragging 'mr' (middle-right), lock left (x1) and top/bottom? No, just x1.

            if (activeCorner.includes('r')) { // Right side moving
                x1 = oldBox.x1; // Lock left
            }
            if (activeCorner.includes('l')) { // Left side moving
                x2 = oldBox.x2; // Lock right
            }
            if (activeCorner.includes('b')) { // Bottom side moving
                y1 = oldBox.y1; // Lock top
            }
            if (activeCorner.includes('t')) { // Top side moving
                y2 = oldBox.y2; // Lock bottom
            }
        }

        // Clamp to 0-1
        x1 = Math.max(0, Math.min(1, x1));
        y1 = Math.max(0, Math.min(1, y1));
        x2 = Math.max(0, Math.min(1, x2));
        y2 = Math.max(0, Math.min(1, y2));

        // Ensure x1 < x2, etc.
        if (x1 > x2) [x1, x2] = [x2, x1];
        if (y1 > y2) [y1, y2] = [y2, y1];

        return {
            box: { x1, y1, x2, y2 }
        };
    }
}
