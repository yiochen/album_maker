import type { Album, Spread, PageElement, ExportOptions, ExportProgress, AlbumSettings } from '../types';

const DEFAULT_OPTIONS: ExportOptions = {
    format: 'png',
    quality: 0.92,
    includePageNumbers: true,
    filenamePrefix: '',
};

const PPI = 300;

// Load an image from URL
const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
        img.src = url;
    });
};

// Sanitize filename
const sanitizeFilename = (name: string): string => {
    return name
        .replace(/[^a-z0-9]/gi, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .toLowerCase() || 'album';
};

// Draw a single element on the canvas
const drawElement = async (
    ctx: CanvasRenderingContext2D,
    element: PageElement,
    canvasWidth: number,
    canvasHeight: number
): Promise<void> => {
    if (element.type !== 'image' && element.type !== 'smartFrame') return;

    try {
        const img = await loadImage(element.imageUrl);

        let x = 0, y = 0, width = 0, height = 0;

        // --- 1. Determine Frame Dimensions ---
        if (element.box) {
            // Gapless Logic: Integer rounding on edges
            const left = Math.round(element.box.x1 * canvasWidth);
            const top = Math.round(element.box.y1 * canvasHeight);
            const right = Math.round(element.box.x2 * canvasWidth);
            const bottom = Math.round(element.box.y2 * canvasHeight);

            x = left;
            y = top;
            width = right - left;
            height = bottom - top;
        } else if (element.position && element.size) {
            // Legacy Logic
            x = element.position.x - element.size.width / 2;
            y = element.position.y - element.size.height / 2;
            width = element.size.width;
            height = element.size.height;
        } else {
            // Should not happen for valid elements
            return;
        }

        // --- 2. Draw Content ---
        ctx.save();

        // Clip to frame
        ctx.beginPath();
        ctx.rect(x, y, width, height);
        ctx.clip();

        if (element.contentTransform) {
            // --- SmartFrame Logic ---
            const { zoom, panX, panY, rotation } = element.contentTransform;

            // Calculate Cover Scale
            const scaleX = width / img.width;
            const scaleY = height / img.height;
            const coverScale = Math.max(scaleX, scaleY);

            const finalScale = coverScale * zoom;

            const actualImgWidth = img.width * finalScale;
            const actualImgHeight = img.height * finalScale;

            // Calculate Top-Left position relative to Frame Top-Left

            let offsetX = 0;
            let offsetY = 0;

            if (actualImgWidth > width) {
                offsetX = (0.5 - panX) * (actualImgWidth - width);
            }
            if (actualImgHeight > height) {
                offsetY = (0.5 - panY) * (actualImgHeight - height);
            }

            // Frame Center
            const cx = x + width / 2;
            const cy = y + height / 2;

            // Image Draw Position (Top-Left)
            const drawX = cx + offsetX - actualImgWidth / 2;
            const drawY = cy + offsetY - actualImgHeight / 2;

            if (rotation) {
                ctx.translate(cx + offsetX, cy + offsetY);
                ctx.rotate((rotation * Math.PI) / 180);
                ctx.translate(-(cx + offsetX), -(cy + offsetY));
            }

            ctx.drawImage(img, drawX, drawY, actualImgWidth, actualImgHeight);

        } else if (element.crop) {
            // --- Legacy Crop Logic ---
            const srcX = (element.crop.x / 100) * img.width;
            const srcY = (element.crop.y / 100) * img.height;
            const srcWidth = (element.crop.width / 100) * img.width;
            const srcHeight = (element.crop.height / 100) * img.height;

            ctx.drawImage(img, srcX, srcY, srcWidth, srcHeight, x, y, width, height);
        } else {
            // --- Default Stretch ---
            ctx.drawImage(img, x, y, width, height);
        }

        ctx.restore();

    } catch (error) {
        console.error('Failed to draw element:', error);
        // Draw placeholder
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(
            element.position?.x ?? 0,
            element.position?.y ?? 0,
            element.size?.width ?? 100,
            element.size?.height ?? 100
        );
    }
};

// Draw page number on the image
const drawPageNumber = (
    ctx: CanvasRenderingContext2D,
    pageNumber: number,
    centerX: number,
    canvasHeight: number,
    side: 'left' | 'right'
): void => {
    const fontSize = 48; // Fixed size for print
    const padding = 60;

    ctx.font = `${fontSize}px Inter, sans-serif`;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.textBaseline = 'bottom';

    if (side === 'left') {
        ctx.textAlign = 'left';
        ctx.fillText(
            pageNumber.toString(),
            padding,
            canvasHeight - padding
        );
    } else {
        ctx.textAlign = 'right';
        ctx.fillText(
            pageNumber.toString(),
            centerX - padding,
            canvasHeight - padding
        );
    }
};

// Export a single spread to an image
export const exportSpread = async (
    spread: Spread,
    spreadNumber: number,
    settings: AlbumSettings,
    options: Partial<ExportOptions> = {}
): Promise<Blob> => {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Calculate dimensions based on settings
    const canvasWidth = settings.pageWidth * 2 * PPI;
    const canvasHeight = settings.pageHeight * PPI;

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d')!;

    // Fill with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw background if any
    if (spread.background) {
        ctx.fillStyle = spread.background;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    // Draw each element
    for (const element of spread.elements) {
        await drawElement(ctx, element, canvasWidth, canvasHeight);
    }

    // Add page numbers if requested (Left and Right)
    if (opts.includePageNumbers) {
        const leftPageNum = (spreadNumber - 1) * 2 + 1;
        const rightPageNum = leftPageNum + 1;

        // Draw left page number
        drawPageNumber(ctx, leftPageNum, canvasWidth / 2, canvasHeight, 'left');
        // Draw right page number
        drawPageNumber(ctx, rightPageNum, canvasWidth, canvasHeight, 'right');
    }

    // Convert to blob
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to create image blob'));
                }
            },
            `image/${opts.format}`,
            opts.quality
        );
    });
};

// Download a blob as a file
const downloadBlob = (blob: Blob, filename: string): void => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

// Export all spreads
export const exportAllSpreads = async (
    album: Album,
    options: Partial<ExportOptions> = {},
    onProgress?: (progress: ExportProgress) => void
): Promise<void> => {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    opts.filenamePrefix = opts.filenamePrefix || sanitizeFilename(album.name);

    const totalSpreads = album.spreads.length;

    for (let i = 0; i < totalSpreads; i++) {
        const spread = album.spreads[i];
        const spreadNumber = i + 1;

        onProgress?.({
            currentPage: spreadNumber, // Using spread number as 'current page' for progress
            totalPages: totalSpreads,
            status: 'exporting',
        });

        try {
            const blob = await exportSpread(spread, spreadNumber, album.settings, options);

            // Generate filename with zero-padded spread number
            const numStr = String(spreadNumber).padStart(String(totalSpreads).length, '0');
            const filename = `${opts.filenamePrefix}_spread_${numStr}.${opts.format}`;

            // Download the file
            downloadBlob(blob, filename);

            // Small delay between downloads to prevent browser issues
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            console.error(`Failed to export spread ${spreadNumber}:`, error);
            onProgress?.({
                currentPage: spreadNumber,
                totalPages: totalSpreads,
                status: 'error',
                error: `Failed to export spread ${spreadNumber}`,
            });
            throw error;
        }
    }

    onProgress?.({
        currentPage: totalSpreads,
        totalPages: totalSpreads,
        status: 'complete',
    });
};

// Export single spread and download
export const exportAndDownloadSpread = async (
    spread: Spread,
    spreadNumber: number,
    album: Album,
    options: Partial<ExportOptions> = {}
): Promise<void> => {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const prefix = opts.filenamePrefix || sanitizeFilename(album.name);

    const blob = await exportSpread(spread, spreadNumber, album.settings, options);
    const filename = `${prefix}_spread_${spreadNumber}.${opts.format}`;
    downloadBlob(blob, filename);
};
