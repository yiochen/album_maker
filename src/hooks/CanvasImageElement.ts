import * as fabric from 'fabric';
import { APP_CONFIG } from '../config';
import type { ImageContent, ImagePageElement } from '../types';
import { calculateGaplessRect, applyCoverTransform } from '../utils/imageUtils';
import { computeNormalizedBoxFromPixels } from '../utils/boxLayout';
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
    private lowResBadgeBg: fabric.Rect;
    private lowResBadgeText: fabric.Text;
    public onContentTransformChange?: (elementId: string, contentTransform: ImageContent['contentTransform']) => void;
    private panControlSize: number;
    private lowResBadgeHeight: number;
    private lowResBadgeFontSize: number;
    private lowResBadgeMargin: number;
    private canvasZoomPercent: number;
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
        const lowResBadgeBg = new fabric.Rect({
            originX: 'left',
            originY: 'top',
            left: 0,
            top: 0,
            width: 56,
            height: 20,
            rx: 10,
            ry: 10,
            fill: 'rgba(185, 28, 28, 0.9)',
            selectable: false,
            evented: false,
            visible: false,
        });
        const lowResBadgeText = new fabric.Text('Low Res', {
            originX: 'left',
            originY: 'top',
            left: 0,
            top: 0,
            fontSize: 11,
            fontWeight: 'bold',
            fontFamily: 'Inter, sans-serif',
            lineHeight: 1,
            fill: '#ffffff',
            selectable: false,
            evented: false,
            visible: false,
        });

        // Initialize group with children and explicit left-top origin
        super([placeholderFrame, placeholderPlusH, placeholderPlusV, innerImage, lowResBadgeBg, lowResBadgeText], {
            ...options,
            originX: 'left',
            originY: 'top',
            subTargetCheck: false, // Don't allow selecting the inner image directly
            interactive: true,
            lockRotation: true,
            selectable: options.interactive !== false,
            evented: options.interactive !== false,
        });

        this.pageElement = element;
        this.data = { id: element.id };
        this.innerImage = innerImage;
        this.placeholderFrame = placeholderFrame;
        this.placeholderPlusH = placeholderPlusH;
        this.placeholderPlusV = placeholderPlusV;
        this.lowResBadgeBg = lowResBadgeBg;
        this.lowResBadgeText = lowResBadgeText;
        this.onContentTransformChange = options.onContentTransformChange;
        this.panControlSize = options.panControlSize ?? 22;
        this.lowResBadgeHeight = APP_CONFIG.BASE_UI_SIZES.lowResBadgeHeight;
        this.lowResBadgeFontSize = APP_CONFIG.BASE_UI_SIZES.lowResBadgeFontSize;
        this.lowResBadgeMargin = APP_CONFIG.BASE_UI_SIZES.lowResBadgeMargin;
        this.canvasZoomPercent = 100;
        const isUniformScaling = options.uniformScaling !== undefined ? options.uniformScaling : true;
        (this as unknown as { lockUniScaling?: boolean }).lockUniScaling = isUniformScaling;

        if (options.interactive !== false) {
            this.updateControlVisibility(isUniformScaling);
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
        this.updateLowResBadgeLayout(rect.width, rect.height);
        this.updateLowResBadgeVisibility();
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
        this.updateLowResBadgeVisibility();
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

    private updateLowResBadgeLayout(width: number, height: number) {
        const zoomScale = Math.max(0.01, this.canvasZoomPercent / 100);
        const frameWidthScreen = width * zoomScale;
        const frameHeightScreen = height * zoomScale;

        const label = frameWidthScreen < 86 ? 'LR' : 'Low Res';
        if (this.lowResBadgeText.text !== label) {
            this.lowResBadgeText.set({ text: label });
        }

        const maxBadgeHeightScreen = Math.max(10, frameHeightScreen * 0.28);
        const badgeHeightScreen = Math.min(APP_CONFIG.BASE_UI_SIZES.lowResBadgeHeight, maxBadgeHeightScreen);
        const badgeHeight = Math.max(8, badgeHeightScreen / zoomScale);

        // Keep badge near the frame edge at small zoom:
        // compute margin in screen px first, then convert back to canvas units.
        const preferredMarginScreen = this.lowResBadgeMargin * zoomScale;
        const marginScreen = Math.max(
            1.5,
            Math.min(
                preferredMarginScreen,
                Math.max(2, frameWidthScreen * 0.03),
                Math.max(2, frameHeightScreen * 0.03),
            )
        );
        const margin = marginScreen / zoomScale;

        const badgeFontSizeScreen = Math.max(8, Math.min(this.lowResBadgeFontSize, badgeHeightScreen * 0.58));
        const badgeFontSize = Math.max(6, badgeFontSizeScreen / zoomScale);

        const approxTextWidthScreen = label.length * badgeFontSizeScreen * 0.62;
        const horizontalPaddingScreen = Math.max(6, badgeHeightScreen * 0.42);
        const badgeWidthScreenDesired = approxTextWidthScreen + horizontalPaddingScreen * 2;
        const badgeWidthScreenMax = Math.max(24, frameWidthScreen - marginScreen * 2);
        const badgeWidth = Math.max(22, Math.min(badgeWidthScreenDesired, badgeWidthScreenMax) / zoomScale);

        const left = width / 2 - badgeWidth - margin;
        const top = -height / 2 + margin;
        const approxTextWidth = label.length * badgeFontSize * 0.62;
        const textLeft = left + Math.max(0, (badgeWidth - approxTextWidth) / 2);
        const textTop = top + Math.max(0, (badgeHeight - badgeFontSize) / 2);

        this.lowResBadgeBg.set({
            left,
            top,
            width: badgeWidth,
            height: badgeHeight,
            rx: badgeHeight / 2,
            ry: badgeHeight / 2,
        });
        this.lowResBadgeText.set({
            left: textLeft,
            top: textTop,
            fontSize: badgeFontSize,
        });
    }

    private getEffectivePrintPpi(): number | null {
        const content = this.pageElement.content as ImageContent;
        const sourceWidth = content.originalWidth;
        const sourceHeight = content.originalHeight;
        if (!sourceWidth || !sourceHeight || sourceWidth <= 0 || sourceHeight <= 0) {
            return null;
        }

        const frameWidthPx = this.width ?? 0;
        const frameHeightPx = this.height ?? 0;
        if (frameWidthPx <= 0 || frameHeightPx <= 0) {
            return null;
        }

        const zoom = Math.max(0.01, content.contentTransform?.zoom ?? 1);
        const orientation: OrientationMatrix = content.contentTransform?.orientation ?? IDENTITY;
        const oriented = getOrientedDimensions(sourceWidth, sourceHeight, orientation);
        const frameWidthInches = frameWidthPx / APP_CONFIG.SCREEN_PPI;
        const frameHeightInches = frameHeightPx / APP_CONFIG.SCREEN_PPI;

        const ppiX = oriented.width / frameWidthInches;
        const ppiY = oriented.height / frameHeightInches;
        return Math.min(ppiX, ppiY) / zoom;
    }

    private updateLowResBadgeVisibility() {
        const content = this.pageElement.content as ImageContent;
        if (content.isPlaceholder || !this.innerImage.getElement()) {
            this.lowResBadgeBg.set({ visible: false });
            this.lowResBadgeText.set({ visible: false });
            return;
        }

        const zoomScale = Math.max(0.01, this.canvasZoomPercent / 100);
        const frameWidthScreen = (this.width ?? 0) * zoomScale;
        const frameHeightScreen = (this.height ?? 0) * zoomScale;
        if (frameWidthScreen < 38 || frameHeightScreen < 24) {
            this.lowResBadgeBg.set({ visible: false });
            this.lowResBadgeText.set({ visible: false });
            return;
        }

        const effectivePpi = this.getEffectivePrintPpi();
        const isLowRes = effectivePpi !== null && effectivePpi < APP_CONFIG.PPI;
        this.lowResBadgeBg.set({ visible: isLowRes });
        this.lowResBadgeText.set({ visible: isLowRes });
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

    setLowResBadgeSizes(height: number, fontSize: number, margin: number) {
        this.lowResBadgeHeight = Math.max(8, height);
        this.lowResBadgeFontSize = Math.max(6, fontSize);
        this.lowResBadgeMargin = Math.max(2, margin);
        this.updateLowResBadgeLayout(this.width ?? 0, this.height ?? 0);
    }

    setCanvasZoomPercent(zoomPercent: number) {
        this.canvasZoomPercent = Math.max(10, zoomPercent);
        this.updateLowResBadgeLayout(this.width ?? 0, this.height ?? 0);
        this.updateLowResBadgeVisibility();
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
        const left = this.left ?? 0;
        const top = this.top ?? 0;
        const width = (this.width ?? 0) * (this.scaleX ?? 1);
        const height = (this.height ?? 0) * (this.scaleY ?? 1);
        this.pageElement.box = computeNormalizedBoxFromPixels(
            this.pageElement.box,
            { left, top, width, height },
            canvasWidth,
            canvasHeight,
            activeCorner
        );
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
