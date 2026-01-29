import { PageTemplate, TemplateId } from '../types';

export const pageTemplates: Record<TemplateId, PageTemplate> = {
    'fullpage': {
        id: 'fullpage',
        name: 'Full Page',
        description: 'Image fills the entire page',
        exportWidth: 2400,
        exportHeight: 1800,
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        slots: [
            { id: 'main', x: 0, y: 0, width: 100, height: 100 }
        ]
    },
    'square-center': {
        id: 'square-center',
        name: 'Square Center',
        description: 'Centered square image with margins',
        exportWidth: 2400,
        exportHeight: 2400,
        padding: { top: 200, right: 200, bottom: 200, left: 200 },
        slots: [
            { id: 'main', x: 8.33, y: 8.33, width: 83.33, height: 83.33, aspectRatio: 1 }
        ]
    },
    'portrait': {
        id: 'portrait',
        name: 'Portrait',
        description: '4:5 portrait aspect ratio with margins',
        exportWidth: 2000,
        exportHeight: 2500,
        padding: { top: 150, right: 150, bottom: 150, left: 150 },
        slots: [
            { id: 'main', x: 7.5, y: 6, width: 85, height: 88, aspectRatio: 4 / 5 }
        ]
    },
    'landscape': {
        id: 'landscape',
        name: 'Landscape',
        description: '5:4 landscape aspect ratio with margins',
        exportWidth: 2500,
        exportHeight: 2000,
        padding: { top: 150, right: 150, bottom: 150, left: 150 },
        slots: [
            { id: 'main', x: 6, y: 7.5, width: 88, height: 85, aspectRatio: 5 / 4 }
        ]
    },
    'polaroid': {
        id: 'polaroid',
        name: 'Polaroid',
        description: 'Polaroid style with large bottom margin',
        exportWidth: 2000,
        exportHeight: 2400,
        padding: { top: 120, right: 120, bottom: 400, left: 120 },
        slots: [
            { id: 'main', x: 6, y: 5, width: 88, height: 73.33, aspectRatio: 1 }
        ]
    },
    'grid-2x2': {
        id: 'grid-2x2',
        name: 'Grid 2×2',
        description: 'Four equal square images',
        exportWidth: 2400,
        exportHeight: 2400,
        padding: { top: 100, right: 100, bottom: 100, left: 100 },
        slots: [
            { id: 'slot1', x: 4.17, y: 4.17, width: 43.33, height: 43.33, aspectRatio: 1 },
            { id: 'slot2', x: 52.5, y: 4.17, width: 43.33, height: 43.33, aspectRatio: 1 },
            { id: 'slot3', x: 4.17, y: 52.5, width: 43.33, height: 43.33, aspectRatio: 1 },
            { id: 'slot4', x: 52.5, y: 52.5, width: 43.33, height: 43.33, aspectRatio: 1 }
        ]
    },
    'grid-1-2': {
        id: 'grid-1-2',
        name: 'Grid 1+2',
        description: 'One large image with two small images',
        exportWidth: 2400,
        exportHeight: 1800,
        padding: { top: 100, right: 100, bottom: 100, left: 100 },
        slots: [
            { id: 'main', x: 4.17, y: 5.56, width: 58.33, height: 88.89 },
            { id: 'slot1', x: 66.67, y: 5.56, width: 29.17, height: 42.22 },
            { id: 'slot2', x: 66.67, y: 52.22, width: 29.17, height: 42.22 }
        ]
    }
};

export const getTemplate = (id: TemplateId): PageTemplate => {
    return pageTemplates[id] || pageTemplates['fullpage'];
};

export const getTemplateList = (): PageTemplate[] => {
    return Object.values(pageTemplates);
};

export const getDefaultTemplateId = (): TemplateId => 'fullpage';

// Calculate actual pixel dimensions for a slot given the template
export const getSlotDimensions = (
    template: PageTemplate,
    slotId: string,
    canvasWidth: number,
    canvasHeight: number
) => {
    const slot = template.slots.find(s => s.id === slotId);
    if (!slot) return null;

    return {
        x: (slot.x / 100) * canvasWidth,
        y: (slot.y / 100) * canvasHeight,
        width: (slot.width / 100) * canvasWidth,
        height: (slot.height / 100) * canvasHeight
    };
};
