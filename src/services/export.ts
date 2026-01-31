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

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d')!;

    // Fill with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw seam (center)
    // const seamX = canvasWidth / 2;
    // ctx.strokeStyle = '#e5e7eb';
    // ctx.beginPath();
    // ctx.setLineDash([4, 4]); // Export with dashed line? Or maybe solid/none for print?
    // usually for print export we might NOT want the seam, but for digital we might.
    // Keeping it simple for now, maybe skip seam for export if unrelated.
    // Let's skip the seam for final export as it's a UI helper.

    // Draw each element
    for (const element of spread.elements) {
        await drawElement(ctx, element);
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

// Draw a single element on the canvas
const drawElement = async (
    ctx: CanvasRenderingContext2D,
    element: PageElement
): Promise<void> => {
    if (element.type !== 'image') return;

    try {
        // Use image URL directly (sources provide full URLs)
        const imageUrl = element.imageUrl;
        const img = await loadImage(imageUrl);

        // Position and Size are already in Absolute Pixels (at 300 PPI)
        const x = element.position.x;
        const y = element.position.y;
        const width = element.size.width;
        const height = element.size.height;

        // Draw with optional cropping
        if (element.crop) {
            // Crop is likely in % of the original image if we follow CSS standards,
            // but let's assume standard behavior for now.
            // If crop data exists but we don't know the unit, be careful.
            // Assuming crop is percentage of Source Image based on usage in other apps.
            const srcX = (element.crop.x / 100) * img.width;
            const srcY = (element.crop.y / 100) * img.height;
            const srcWidth = (element.crop.width / 100) * img.width;
            const srcHeight = (element.crop.height / 100) * img.height;

            ctx.drawImage(img, srcX, srcY, srcWidth, srcHeight, x, y, width, height);
        } else {
            // Cover fit - maintain aspect ratio and fill the area
            // However, with Absolute positioning/sizing, the element IS the viewport.
            // The image content should fill the element box.
            // Fabric handling is: uniform scaling to fit? Or fill?
            // In Canvas.tsx: scaleX = targetWidth / img.width.
            // This means the image is STRETCHED to fit unless aspect ratio is locked.
            // If lockAspectRatio is true, it preserves aspect.
            // If we just drawImage(img, x, y, width, height), it stretches.
            // This matches the Fabric `scaleX/scaleY` behavior exactly.

            ctx.drawImage(img, x, y, width, height);
        }
    } catch (error) {
        console.error('Failed to draw element:', error);
        // Draw placeholder for failed images
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(element.position.x, element.position.y, element.size.width, element.size.height);
    }
};

// Draw page number on the image
const drawPageNumber = (
    ctx: CanvasRenderingContext2D,
    pageNumber: number,
    centerX: number, // The right boundary of the page area
    canvasHeight: number,
    side: 'left' | 'right'
): void => {
    const fontSize = 48; // Fixed size for print
    const padding = 60;

    ctx.font = `${fontSize}px Inter, sans-serif`;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.textBaseline = 'bottom';

    if (side === 'left') {
        // Left page number on bottom-left corner of left page?
        // Or bottom-left of the page area.
        // centerX passed is the seam (width/2).
        // Let's put it at bottom-left of the page.
        // Page is from 0 to centerX.
        ctx.textAlign = 'left';
        ctx.fillText(
            pageNumber.toString(),
            padding,
            canvasHeight - padding
        );
    } else {
        // Right page
        // Page is from (centerX - width/2) to centerX? No.
        // Right page is from seam to width.
        // centerX passed is total width.
        // Let's put it at bottom-right of the page.
        ctx.textAlign = 'right';
        ctx.fillText(
            pageNumber.toString(),
            centerX - padding, // centerX here acts as right edge for 'right'
            canvasHeight - padding
        );
    }
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
