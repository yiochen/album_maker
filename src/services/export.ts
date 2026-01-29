import { Album, Page, PageElement, ExportOptions, ExportProgress } from '../types';
import { getTemplate } from '../templates/pageTemplates';
import { getMediaUrl } from './googlePhotos';

const DEFAULT_OPTIONS: ExportOptions = {
    format: 'png',
    quality: 0.92,
    includePageNumbers: true,
    filenamePrefix: '',
};

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

// Export a single page to an image
export const exportPage = async (
    page: Page,
    pageNumber: number,
    albumName: string,
    options: Partial<ExportOptions> = {}
): Promise<Blob> => {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const template = getTemplate(page.templateId);

    // Create canvas with template dimensions
    const canvas = document.createElement('canvas');
    canvas.width = template.exportWidth;
    canvas.height = template.exportHeight;
    const ctx = canvas.getContext('2d')!;

    // Fill with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw each element
    for (const element of page.elements) {
        await drawElement(ctx, element, template.exportWidth, template.exportHeight);
    }

    // Add page number if requested
    if (opts.includePageNumbers) {
        drawPageNumber(ctx, pageNumber, canvas.width, canvas.height);
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
    element: PageElement,
    canvasWidth: number,
    canvasHeight: number
): Promise<void> => {
    if (element.type !== 'image') return;

    try {
        // Get high-resolution image URL
        const imageUrl = getMediaUrl(element.imageUrl, element.size.width * 2, element.size.height * 2);
        const img = await loadImage(imageUrl);

        // Scale position and size from percentage to pixels
        const x = (element.position.x / 100) * canvasWidth;
        const y = (element.position.y / 100) * canvasHeight;
        const width = (element.size.width / 100) * canvasWidth;
        const height = (element.size.height / 100) * canvasHeight;

        // Draw with optional cropping
        if (element.crop) {
            const srcX = (element.crop.x / 100) * img.width;
            const srcY = (element.crop.y / 100) * img.height;
            const srcWidth = (element.crop.width / 100) * img.width;
            const srcHeight = (element.crop.height / 100) * img.height;

            ctx.drawImage(img, srcX, srcY, srcWidth, srcHeight, x, y, width, height);
        } else {
            // Cover fit - maintain aspect ratio and fill the area
            const imgAspect = img.width / img.height;
            const slotAspect = width / height;

            let srcX = 0, srcY = 0, srcWidth = img.width, srcHeight = img.height;

            if (imgAspect > slotAspect) {
                // Image is wider - crop sides
                srcWidth = img.height * slotAspect;
                srcX = (img.width - srcWidth) / 2;
            } else {
                // Image is taller - crop top/bottom
                srcHeight = img.width / slotAspect;
                srcY = (img.height - srcHeight) / 2;
            }

            ctx.drawImage(img, srcX, srcY, srcWidth, srcHeight, x, y, width, height);
        }
    } catch (error) {
        console.error('Failed to draw element:', error);
        // Draw placeholder for failed images
        ctx.fillStyle = '#f0f0f0';
        const x = (element.position.x / 100) * canvasWidth;
        const y = (element.position.y / 100) * canvasHeight;
        const width = (element.size.width / 100) * canvasWidth;
        const height = (element.size.height / 100) * canvasHeight;
        ctx.fillRect(x, y, width, height);
    }
};

// Draw page number on the image
const drawPageNumber = (
    ctx: CanvasRenderingContext2D,
    pageNumber: number,
    canvasWidth: number,
    canvasHeight: number
): void => {
    const fontSize = Math.max(24, canvasWidth * 0.015);
    const padding = fontSize;

    ctx.font = `${fontSize}px Inter, sans-serif`;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';

    ctx.fillText(
        pageNumber.toString(),
        canvasWidth - padding,
        canvasHeight - padding
    );
};

// Export all pages
export const exportAllPages = async (
    album: Album,
    options: Partial<ExportOptions> = {},
    onProgress?: (progress: ExportProgress) => void
): Promise<void> => {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    opts.filenamePrefix = opts.filenamePrefix || sanitizeFilename(album.name);

    const totalPages = album.pages.length;

    for (let i = 0; i < totalPages; i++) {
        const page = album.pages[i];
        const pageNumber = i + 1;

        onProgress?.({
            currentPage: pageNumber,
            totalPages,
            status: 'exporting',
        });

        try {
            const blob = await exportPage(page, pageNumber, album.name, options);

            // Generate filename with zero-padded page number
            const pageNumStr = String(pageNumber).padStart(String(totalPages).length, '0');
            const filename = `${opts.filenamePrefix}_page_${pageNumStr}.${opts.format}`;

            // Download the file
            downloadBlob(blob, filename);

            // Small delay between downloads to prevent browser issues
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            console.error(`Failed to export page ${pageNumber}:`, error);
            onProgress?.({
                currentPage: pageNumber,
                totalPages,
                status: 'error',
                error: `Failed to export page ${pageNumber}`,
            });
            throw error;
        }
    }

    onProgress?.({
        currentPage: totalPages,
        totalPages,
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

// Export single page and download
export const exportAndDownloadPage = async (
    page: Page,
    pageNumber: number,
    albumName: string,
    options: Partial<ExportOptions> = {}
): Promise<void> => {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const prefix = opts.filenamePrefix || sanitizeFilename(albumName);

    const blob = await exportPage(page, pageNumber, albumName, options);
    const filename = `${prefix}_page_${pageNumber}.${opts.format}`;
    downloadBlob(blob, filename);
};
