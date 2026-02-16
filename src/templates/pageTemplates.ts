/**
 * @deprecated This file is no longer used.
 */
import { PageTemplate, TemplateId } from '../types';

export const pageTemplates: Record<TemplateId, PageTemplate> = {
    'fullpage': {
        id: 'fullpage',
        name: 'Full Page',
        description: 'Single image filling the page',
        exportWidth: 2400,
        exportHeight: 2400,
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        slots: [
            { id: '1', x: 0, y: 0, width: 2400, height: 2400 }
        ]
    },
    'square-center': {
        id: 'square-center',
        name: 'Square Center',
        description: 'Centered square image with border',
        exportWidth: 2400,
        exportHeight: 2400,
        padding: { top: 200, right: 200, bottom: 200, left: 200 },
        slots: [
            { id: '1', x: 200, y: 200, width: 2000, height: 2000 }
        ]
    },
    'portrait': {
        id: 'portrait',
        name: 'Portrait',
        description: 'Portrait oriented image',
        exportWidth: 2400,
        exportHeight: 2400,
        padding: { top: 100, right: 300, bottom: 100, left: 300 },
        slots: [
            { id: '1', x: 300, y: 100, width: 1800, height: 2200 }
        ]
    },
    'landscape': {
        id: 'landscape',
        name: 'Landscape',
        description: 'Landscape oriented image',
        exportWidth: 2400,
        exportHeight: 2400,
        padding: { top: 300, right: 100, bottom: 300, left: 100 },
        slots: [
            { id: '1', x: 100, y: 300, width: 2200, height: 1800 }
        ]
    },
    'polaroid': {
        id: 'polaroid',
        name: 'Polaroid',
        description: 'Classic instant photo style',
        exportWidth: 2400,
        exportHeight: 2400,
        padding: { top: 200, right: 200, bottom: 600, left: 200 },
        slots: [
            { id: '1', x: 200, y: 200, width: 2000, height: 1600 }
        ]
    },
    'grid-2x2': {
        id: 'grid-2x2',
        name: '2x2 Grid',
        description: 'Four equal square images',
        exportWidth: 2400,
        exportHeight: 2400,
        padding: { top: 100, right: 100, bottom: 100, left: 100 },
        slots: [
            { id: '1', x: 100, y: 100, width: 1050, height: 1050 },
            { id: '2', x: 1250, y: 100, width: 1050, height: 1050 },
            { id: '3', x: 100, y: 1250, width: 1050, height: 1050 },
            { id: '4', x: 1250, y: 1250, width: 1050, height: 1050 }
        ]
    },
    'grid-1-2': {
        id: 'grid-1-2',
        name: '1 Left, 2 Right',
        description: 'One large left, two small right',
        exportWidth: 2400,
        exportHeight: 2400,
        padding: { top: 100, right: 100, bottom: 100, left: 100 },
        slots: [
            { id: '1', x: 100, y: 100, width: 1050, height: 2200 },
            { id: '2', x: 1250, y: 100, width: 1050, height: 1050 },
            { id: '3', x: 1250, y: 1250, width: 1050, height: 1050 }
        ]
    }
};

export function getTemplateList(): PageTemplate[] {
    return Object.values(pageTemplates);
}

export function getTemplate(id: TemplateId): PageTemplate {
    return pageTemplates[id] || pageTemplates['fullpage'];
}

export function getDefaultTemplateId(): TemplateId {
    return 'fullpage';
}

export function getSlotDimensions(templateId: TemplateId, slotId: string) {
    const template = getTemplate(templateId);
    return template.slots.find(s => s.id === slotId);
}
