import { Spread, AlbumSettings, TextContent, ImagePageElement } from '../types';
import { calculateGaplessRect, applyCoverTransform } from './imageUtils';
import { OffscreenRenderOptions } from './rendererTypes';
import { decomposeForRendering, IDENTITY, getOrientedDimensions } from './orientationMatrix';
import { getImageUrlForPpi } from './imageSourceSelection';

/**
 * Helper to load an image as an ImageBitmap in a worker environment.
 */
/**
 * Helper to load an image as an ImageBitmap in a worker environment.
 * 
 * @param url The image URL to load.
 * @param fetcher Optional fetch function. Defaults to global fetch.
 *                Inside a Service Worker, you MUST provide a custom fetcher that 
 *                manually resolves local routes, because internal SW fetches bypass 
 *                the SW's own fetch event handlers.
 */
async function loadImage(url: string, fetcher: typeof fetch = fetch): Promise<ImageBitmap> {
    const response = await fetcher(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${url} (${response.status} ${response.statusText})`);
    }
    const blob = await response.blob();
    try {
        return await createImageBitmap(blob);
    } catch (e) {
        // Detailed error for decoding failures
        const type = blob.type;
        const size = blob.size;
        throw new Error(`Failed to decode ${type} image (${size} bytes) from ${url}: ${e}`);
    }
}

async function loadImageBitmapsBounded(
    imageElements: Spread['elements'],
    ppi: number,
    fetcher: typeof fetch = fetch,
    maxConcurrency: number = 4,
): Promise<Map<string, ImageBitmap>> {
    const images = imageElements.filter(
        (element): element is ImagePageElement => element.type === 'image' && !element.content.isPlaceholder
    );
    const results = new Map<string, ImageBitmap>();
    const concurrency = Math.max(1, Math.min(maxConcurrency, images.length || 1));
    let nextIndex = 0;

    const worker = async () => {
        while (true) {
            const idx = nextIndex++;
            if (idx >= images.length) return;
            const element = images[idx];
            const url = getImageUrlForPpi(element.content, ppi);
            if (!url) continue;
            try {
                const bitmap = await loadImage(url, fetcher);
                results.set(element.id, bitmap);
            } catch (error) {
                console.error(`Failed to preload image for element ${element.id}:`, error);
            }
        }
    };

    await Promise.all(Array.from({ length: concurrency }, () => worker()));
    return results;
}

/**
 * Build a CSS font string from style properties and a font size in px.
 */
function buildFontString(fontStyle: string, fontWeight: string, fontSizePx: number, fontFamily: string): string {
    return `${fontStyle} ${fontWeight} ${fontSizePx}px ${fontFamily}`;
}

/**
 * Render a text element onto the canvas context.
 *
 * Uses pre-computed layout coordinates (x, baselineY in pt) from Fabric.js,
 * so no text wrapping or measurement is needed here.
 */
function renderTextElement(
    ctx: OffscreenCanvasRenderingContext2D,
    content: TextContent,
    boxLeft: number,
    boxTop: number,
    boxWidth: number,
    boxHeight: number,
    ppi: number,
): void {
    const pxPerPt = ppi / 72;

    ctx.save();

    // Clip to the text box frame
    ctx.beginPath();
    ctx.rect(boxLeft, boxTop, boxWidth, boxHeight);
    ctx.clip();

    ctx.textBaseline = 'alphabetic';

    for (const run of content.runs) {
        if (run.text.length === 0) continue;

        // Merge run style overrides with default style
        const style = { ...content.defaultStyle, ...run.style };
        const fontSizePx = style.fontSize * pxPerPt;

        ctx.font = buildFontString(
            style.fontStyle ?? 'normal',
            style.fontWeight ?? 'normal',
            fontSizePx,
            style.fontFamily,
        );
        ctx.fillStyle = style.fill;

        const x = boxLeft + (run.x ?? 0) * pxPerPt;
        const y = boxTop + (run.baselineY ?? 0) * pxPerPt;
        ctx.fillText(run.text, x, y);

        // Draw underline decoration
        if (style.underline) {
            const textWidth = ctx.measureText(run.text).width;
            const underlineThickness = Math.max(1, fontSizePx * 0.05);
            const underlineY = y + fontSizePx * 0.1;
            ctx.fillRect(x, underlineY, textWidth, underlineThickness);
        }
    }

    ctx.restore();
}

/**
 * Renders a spread onto an OffscreenCanvas using native 2D Canvas API.
 * Optimized for performance and Web Worker compatibility (no Fabric.js or DOM dependencies).
 * 
 * This mimics the logic of fabricRenderer.ts but for a pure headless context.
 */
export async function renderSpread(
    spread: Spread,
    settings: AlbumSettings,
    canvas: OffscreenCanvas,
    options: OffscreenRenderOptions
): Promise<void> {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Could not get 2D context");

    const ppi = options.ppi;
    const pageWidthPx = Math.round(settings.pageWidth * ppi);
    const pageHeightPx = Math.round(settings.pageHeight * ppi);
    const spreadWidthPx = pageWidthPx * 2;

    // Clear canvas
    ctx.clearRect(0, 0, spreadWidthPx, pageHeightPx);

    // Fill white background for JPEG exports
    if (options.format === 'jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, spreadWidthPx, pageHeightPx);
    }

    const preloadedBitmaps = await loadImageBitmapsBounded(
        spread.elements,
        ppi,
        options.customFetch as typeof fetch,
    );

    // Render elements in Z-Order. spread.elements are assumed ordered correctly in store.
    for (const element of spread.elements) {
        if (element.type === 'text') {
            // --- Text element rendering ---
            const content = element.content as TextContent;
            const box = calculateGaplessRect(element.box, spreadWidthPx, pageHeightPx);
            renderTextElement(ctx, content, box.left, box.top, box.width, box.height, ppi);
            continue;
        }

        if (element.type !== 'image') continue;
        if (element.content.isPlaceholder) continue;

        try {
            const bitmap = preloadedBitmaps.get(element.id);
            if (!bitmap) continue;

            // Determine orientation
            const orientation = element.content.contentTransform?.orientation || IDENTITY;

            // Get effective dimensions after rotation/flip for cover calculation
            const oriented = getOrientedDimensions(bitmap.width, bitmap.height, orientation);

            // Calculate the container rect on the spread
            const box = calculateGaplessRect(element.box, spreadWidthPx, pageHeightPx);

            // Calculate image transform within that box (Cover fit)
            const transform = applyCoverTransform(
                box.width,
                box.height,
                oriented.width,
                oriented.height,
                {
                    zoom: element.content.contentTransform?.zoom ?? 1,
                    panX: element.content.contentTransform?.panX ?? 0.5,
                    panY: element.content.contentTransform?.panY ?? 0.5
                }
            );

            ctx.save();

            // 1. Clip to the frame box
            ctx.beginPath();
            ctx.rect(box.left, box.top, box.width, box.height);
            ctx.clip();

            // 2. Handle Orientation/Transform
            // We decompose orientation (D4 matrix) into angle and flipX to match 2D canvas transforms
            const { angleDeg, flipX } = decomposeForRendering(orientation);

            // Move coordinate system to the center of the rendered image area within the frame
            ctx.translate(
                box.left + transform.left + transform.width / 2,
                box.top + transform.top + transform.height / 2
            );

            // Apply flip and rotation (order matters: flip then rotate to match decomposeForRendering)
            if (flipX) ctx.scale(-1, 1);
            if (angleDeg !== 0) ctx.rotate((angleDeg * Math.PI) / 180);

            // 3. Draw image centered
            ctx.drawImage(
                bitmap,
                -transform.width / 2,
                -transform.height / 2,
                transform.width,
                transform.height
            );

            ctx.restore();

            // Cleanup memory
            bitmap.close();
            preloadedBitmaps.delete(element.id);
        } catch (error) {
            console.error(`Failed to load or render image for element ${element.id}:`, error);
        }
    }

    // Ensure no leaked bitmaps on early exits/errors.
    preloadedBitmaps.forEach((bitmap) => bitmap.close());
}
