import * as fabric from 'fabric';
import { APP_CONFIG } from '../config';
import type { ImageContent, ImagePageElement } from '../types';
import { applyCoverTransform } from '../utils/imageUtils';
import { computeNormalizedBoxFromObjectGeometry } from '../utils/boxLayout';
import { borderPtToCanvasPx, computeInsetRect, getImageBorder } from '../utils/propertyUtils';
import { getObjectPositionForFrame, normalizeRotation } from '../utils/rotatedBounds';
import {
    type OrientationMatrix, IDENTITY,
    getOrientedDimensions,
} from '../utils/orientationMatrix';
import { createPanControl } from './canvasImage/controls';
import { computeEffectivePrintPpi, isFrameTooSmallForBadge } from './canvasImage/quality';
import { computeLowResBadgeLayout } from './canvasImage/badgeLayout';
import { computeCoverPlacement, computeFrameRect } from './canvasImage/layout';

export class CanvasImageElement extends fabric.Group {
    public pageElement: ImagePageElement;
    public data?: { id: string };
    private borderRect: fabric.Rect;
    private imageViewport: fabric.Group;
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
    private currentInnerRect: { left: number; top: number; width: number; height: number; insetPx: number };
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
        const borderRect = new fabric.Rect({
            originX: 'left',
            originY: 'top',
            left: 0,
            top: 0,
            fill: '#ffffff',
            strokeWidth: 0,
            selectable: false,
            evented: false,
            visible: false,
        });

        // Create inner image (placeholder initially)
        // fabric.Image handles null source in v7
        const innerImage = new fabric.Image(null as unknown as HTMLImageElement, {
            originX: 'left',
            originY: 'top',
            left: 0,
            top: 0,
            selectable: false,
            evented: false,
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

        const clipRect = new fabric.Rect({
            originX: 'left',
            originY: 'top',
            left: 0,
            top: 0,
            fill: 'transparent',
            strokeWidth: 0,
        });

        const imageViewport = new fabric.Group([innerImage], {
            originX: 'left',
            originY: 'top',
            left: 0,
            top: 0,
            selectable: false,
            evented: false,
            objectCaching: false,
            subTargetCheck: false,
        });
        imageViewport.clipPath = clipRect;

        // Initialize group with children and explicit left-top origin
        super([borderRect, placeholderFrame, placeholderPlusH, placeholderPlusV, imageViewport, lowResBadgeBg, lowResBadgeText], {
            ...options,
            originX: 'left',
            originY: 'top',
            centeredRotation: true,
            subTargetCheck: false, // Don't allow selecting the inner image directly
            interactive: true,
            selectable: options.interactive !== false,
            evented: options.interactive !== false,
            objectCaching: false,
        });

        this.pageElement = element;
        this.data = { id: element.id };
        this.borderRect = borderRect;
        this.imageViewport = imageViewport;
        this.innerImage = innerImage;
        this.clipRect = clipRect;
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
        this.currentInnerRect = { left: 0, top: 0, width: 0, height: 0, insetPx: 0 };
        const isUniformScaling = options.uniformScaling !== undefined ? options.uniformScaling : true;
        (this as unknown as { lockUniScaling?: boolean }).lockUniScaling = isUniformScaling;

        if (options.interactive !== false) {
            this.updateControlVisibility(isUniformScaling);
            this.addPanControl();
        }

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
        const rect = computeFrameRect(this.pageElement.box, canvasWidth, canvasHeight);
        const objectPosition = getObjectPositionForFrame({
            ...rect,
            angle: this.pageElement.rotation ?? 0,
        });
        const innerRect = this.getInnerRect(rect);
        const localInnerRect = {
            ...innerRect,
            left: innerRect.left - rect.left,
            top: innerRect.top - rect.top,
        };

        this.set({
            left: objectPosition.x,
            top: objectPosition.y,
            width: rect.width,
            height: rect.height,
            scaleX: 1,
            scaleY: 1,
            angle: normalizeRotation(this.pageElement.rotation ?? 0),
            centeredRotation: true,
        });

        // The clipPath in Fabric groups is relative to the center of the group by default.
        // Even if the group has originX: 'left', the internal 0,0 is the center.
        this.clipRect.set({
            left: localInnerRect.left - rect.width / 2,
            top: localInnerRect.top - rect.height / 2,
            width: localInnerRect.width,
            height: localInnerRect.height,
        });
        this.imageViewport.set({
            left: -rect.width / 2,
            top: -rect.height / 2,
            width: rect.width,
            height: rect.height,
        });

        this.borderRect.set({
            left: -rect.width / 2,
            top: -rect.height / 2,
            width: rect.width,
            height: rect.height,
            fill: getImageBorder(this.pageElement.content).color,
            visible: getImageBorder(this.pageElement.content).widthPt > 0,
        });

        this.currentInnerRect = localInnerRect;
        this.imageViewport.dirty = true;
        this.dirty = true;
        this.updatePlaceholderLayout(localInnerRect.width, localInnerRect.height, localInnerRect.left, localInnerRect.top);
        this.updatePlaceholderVisibility();
        this.applyCover();
        this.updateLowResBadgeLayout(localInnerRect.width, localInnerRect.height, localInnerRect.left, localInnerRect.top);
        this.updateLowResBadgeVisibility();
        this.setCoords();
    }

    /**
     * Resizes/positions internal image to cover the frame area
     */
    applyCover() {
        if (!this.innerImage.getElement()) return;
        if (this.currentInnerRect.width <= 0 || this.currentInnerRect.height <= 0) {
            this.innerImage.set({ visible: false });
            this.updateLowResBadgeVisibility();
            return;
        }

        const imgWidth = this.innerImage.width || 1;
        const imgHeight = this.innerImage.height || 1;

        const content = this.pageElement.content as ImageContent;
        const { cover, decomposition } = computeCoverPlacement(
            this.currentInnerRect.width,
            this.currentInnerRect.height,
            imgWidth,
            imgHeight,
            content.contentTransform,
        );
        const { angleDeg, flipX } = decomposition;
        const baseScale = cover.scale;

        // Position relative to group center
        // The inner image center should be at (cover.left + cover.width/2, cover.top + cover.height/2)
        // relative to the group's top-left, offset by -width/2, -height/2 for fabric group centering.
        this.innerImage.set({
            left: this.currentInnerRect.left + cover.left + cover.width / 2 - (this.width ?? 0) / 2,
            top: this.currentInnerRect.top + cover.top + cover.height / 2 - (this.height ?? 0) / 2,
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
        if (this.currentInnerRect.width <= 0 || this.currentInnerRect.height <= 0) return false;

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
            this.currentInnerRect.width,
            this.currentInnerRect.height,
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

    private updatePlaceholderLayout(width: number, height: number, left: number, top: number) {
        const inverseScale = 100 / Math.max(1, this.canvasZoomPercent);
        this.placeholderFrame.set({
            left: left - (this.width ?? 0) / 2,
            top: top - (this.height ?? 0) / 2,
            width,
            height,
            strokeWidth: inverseScale,
            strokeDashArray: [6 * inverseScale, 6 * inverseScale],
        });
        this.placeholderPlusH.set({
            left: left + width / 2 - (this.width ?? 0) / 2,
            top: top + height / 2 - (this.height ?? 0) / 2,
            width: Math.max(24, Math.min(40, width * 0.18)) * inverseScale,
            height: Math.max(3, Math.min(6, height * 0.02)) * inverseScale,
        });
        this.placeholderPlusV.set({
            left: left + width / 2 - (this.width ?? 0) / 2,
            top: top + height / 2 - (this.height ?? 0) / 2,
            width: Math.max(3, Math.min(6, width * 0.02)) * inverseScale,
            height: Math.max(24, Math.min(40, height * 0.18)) * inverseScale,
        });
    }

    private updatePlaceholderVisibility() {
        const content = this.pageElement.content as ImageContent;
        const showPlaceholder = !!content.isPlaceholder && this.currentInnerRect.width > 0 && this.currentInnerRect.height > 0;
        this.placeholderFrame.set({ visible: showPlaceholder });
        this.placeholderPlusH.set({ visible: showPlaceholder });
        this.placeholderPlusV.set({ visible: showPlaceholder });
        this.innerImage.set({ visible: !content.isPlaceholder && this.currentInnerRect.width > 0 && this.currentInnerRect.height > 0 });
    }

    private updateLowResBadgeLayout(width: number, height: number, left: number, top: number) {
        const layout = computeLowResBadgeLayout({
            frameWidthPx: width,
            frameHeightPx: height,
            zoomPercent: this.canvasZoomPercent,
            baseBadgeHeight: this.lowResBadgeHeight,
            baseBadgeFontSize: this.lowResBadgeFontSize,
            baseBadgeMargin: this.lowResBadgeMargin,
        });
        const centerOffsetX = left + width / 2 - (this.width ?? 0) / 2;
        const centerOffsetY = top + height / 2 - (this.height ?? 0) / 2;
        if (this.lowResBadgeText.text !== layout.label) {
            this.lowResBadgeText.set({ text: layout.label });
        }

        this.lowResBadgeBg.set({
            left: centerOffsetX + layout.badgeLeft,
            top: centerOffsetY + layout.badgeTop,
            width: layout.badgeWidth,
            height: layout.badgeHeight,
            rx: layout.badgeHeight / 2,
            ry: layout.badgeHeight / 2,
        });
        this.lowResBadgeText.set({
            left: centerOffsetX + layout.textLeft,
            top: centerOffsetY + layout.textTop,
            fontSize: layout.fontSize,
        });
    }

    private getEffectivePrintPpi(): number | null {
        const content = this.pageElement.content as ImageContent;
        return computeEffectivePrintPpi({
            sourceWidth: content.originalWidth,
            sourceHeight: content.originalHeight,
            frameWidthPx: this.currentInnerRect.width,
            frameHeightPx: this.currentInnerRect.height,
            zoom: content.contentTransform?.zoom ?? 1,
            orientation: content.contentTransform?.orientation ?? IDENTITY,
            screenPpi: APP_CONFIG.SCREEN_PPI,
        });
    }

    private updateLowResBadgeVisibility() {
        const content = this.pageElement.content as ImageContent;
        if (content.isPlaceholder || !this.innerImage.getElement()) {
            this.lowResBadgeBg.set({ visible: false });
            this.lowResBadgeText.set({ visible: false });
            return;
        }

        const zoomScale = Math.max(0.01, this.canvasZoomPercent / 100);
        const frameWidthScreen = this.currentInnerRect.width * zoomScale;
        const frameHeightScreen = this.currentInnerRect.height * zoomScale;
        if (isFrameTooSmallForBadge(frameWidthScreen, frameHeightScreen)) {
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
        this.updateLowResBadgeLayout(
            this.currentInnerRect.width,
            this.currentInnerRect.height,
            this.currentInnerRect.left,
            this.currentInnerRect.top,
        );
    }

    setCanvasZoomPercent(zoomPercent: number) {
        this.canvasZoomPercent = Math.max(10, zoomPercent);
        this.updatePlaceholderLayout(
            this.currentInnerRect.width,
            this.currentInnerRect.height,
            this.currentInnerRect.left,
            this.currentInnerRect.top,
        );
        this.updateLowResBadgeLayout(
            this.currentInnerRect.width,
            this.currentInnerRect.height,
            this.currentInnerRect.left,
            this.currentInnerRect.top,
        );
        this.updateLowResBadgeVisibility();
    }

    private getInnerRect(rect: { left: number; top: number; width: number; height: number }) {
        const border = getImageBorder(this.pageElement.content);
        const insetPx = borderPtToCanvasPx(border.widthPt);
        return computeInsetRect(rect, insetPx);
    }

    private addPanControl() {
        this.controls = {
            ...this.controls,
            pan: createPanControl(
                () => this.panControlSize || 22,
                (target, deltaX, deltaY) => target.updatePanFromDelta(deltaX, deltaY),
            ),
        };
    }

    /**
     * Update Normalized Floats from current pixel dimensions
     * Uses the live Fabric geometry as the source of truth for both rotated
     * and unrotated interactions, then reconstructs the canonical frame.
     */
    updateLayoutFromPixels(canvasWidth: number = this.canvas?.width || 1, canvasHeight: number = this.canvas?.height || 1) {
        const width = (this.width ?? 0) * (this.scaleX ?? 1);
        const height = (this.height ?? 0) * (this.scaleY ?? 1);
        this.pageElement.box = computeNormalizedBoxFromObjectGeometry({
            left: this.left ?? 0,
            top: this.top ?? 0,
            width,
            height,
            angle: this.angle ?? 0,
        }, canvasWidth, canvasHeight);
        this.pageElement.rotation = normalizeRotation(this.angle ?? 0);
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
            mtr: true,
        });
    }
}
