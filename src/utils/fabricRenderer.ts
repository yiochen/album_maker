import * as fabric from 'fabric';
import { Spread, AlbumSettings } from '../types';
import { CanvasPageElement } from '../hooks/CanvasPageElement';

export interface RenderOptions {
    ppi: number;
    showSeam: boolean;
    interactive: boolean;
    useThumbnail: boolean;
}

/**
 * Renders a spread to a Fabric.js canvas.
 */
export async function renderSpread(
    spread: Spread,
    settings: AlbumSettings,
    canvasOrOptions?: fabric.Canvas | fabric.StaticCanvas | RenderOptions,
    maybeOptions?: RenderOptions
): Promise<fabric.StaticCanvas | fabric.Canvas> {
    // 1. Determine if we are provided a canvas or just options
    let canvas: fabric.StaticCanvas | fabric.Canvas | undefined;
    let options: RenderOptions;

    if (canvasOrOptions instanceof fabric.Canvas || canvasOrOptions instanceof fabric.StaticCanvas) {
        canvas = canvasOrOptions;
        options = {
            ppi: maybeOptions?.ppi ?? 72,
            showSeam: maybeOptions?.showSeam ?? true,
            interactive: maybeOptions?.interactive ?? true,
            useThumbnail: maybeOptions?.useThumbnail ?? false,
        };
    } else {
        options = {
            ppi: (canvasOrOptions as RenderOptions)?.ppi ?? 72,
            showSeam: (canvasOrOptions as RenderOptions)?.showSeam ?? true,
            interactive: (canvasOrOptions as RenderOptions)?.interactive ?? true,
            useThumbnail: (canvasOrOptions as RenderOptions)?.useThumbnail ?? false,
        };
    }

    const width = settings.pageWidth * 2 * options.ppi;
    const height = settings.pageHeight * options.ppi;

    if (!canvas) {
        const el = document.createElement('canvas');
        el.width = width;
        el.height = height;
        canvas = new fabric.StaticCanvas(el, {
            enableRetinaScaling: false,
        });
    }

    // 2. Load and add elements
    const loadPromises = spread.elements.map(async (element) => {
        const canvasEl = new CanvasPageElement(element, {
            interactive: options.interactive === true,
            objectCaching: true,
            uniformScaling: !!element.content.lockAspectRatio,
        });

        const url = options.useThumbnail ? element.content.thumbnailUrl : element.content.imageUrl;
        await canvasEl.loadImage(url);
        canvasEl.applyLayout(width, height);
        return canvasEl;
    });

    const objects = await Promise.all(loadPromises);

    // Clear and start fresh to ensure correct Z-order
    canvas.clear();

    // 3. Add Center Seam if required (Always at the bottom)
    if (options.showSeam) {
        const seam = new fabric.Line([width / 2, 0, width / 2, height], {
            stroke: '#ddd',
            strokeWidth: 2,
            selectable: false,
            evented: false,
            strokeDashArray: [5, 5],
        });
        // @ts-expect-error - custom property for identification
        seam.id = 'seam';
        canvas.add(seam);
    }

    // 4. Add elements in order
    objects.forEach(obj => {
        canvas!.add(obj);
    });

    canvas.renderAll();
    return canvas;
}
