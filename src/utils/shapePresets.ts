import type { ShapeContent } from '../types';
import { DEFAULT_SHAPE_FILL } from './shapeUtils';

export interface ShapePreset {
    id: string;
    label: string;
    content: ShapeContent;
}

function createBaseContent(partial: Omit<ShapeContent, 'fill' | 'border' | 'fillRule'>): ShapeContent {
    return {
        ...partial,
        fill: DEFAULT_SHAPE_FILL,
        fillRule: 'nonzero',
        border: {
            widthPt: 0,
            color: '#000000',
        },
    };
}

export const SHAPE_PRESETS: ShapePreset[] = [
    {
        id: 'rectangle',
        label: 'Rectangle',
        content: createBaseContent({
            subpaths: [
                {
                    closed: true,
                    commands: [
                        { op: 'moveTo', x: 0, y: 0 },
                        { op: 'lineTo', x: 1, y: 0 },
                        { op: 'lineTo', x: 1, y: 1 },
                        { op: 'lineTo', x: 0, y: 1 },
                        { op: 'closePath' },
                    ],
                },
            ],
        }),
    },
    {
        id: 'ellipse',
        label: 'Ellipse',
        content: createBaseContent({
            subpaths: [
                {
                    closed: true,
                    commands: [
                        { op: 'ellipse', cx: 0.5, cy: 0.5, rx: 0.5, ry: 0.5 },
                    ],
                },
            ],
        }),
    },
    {
        id: 'triangle',
        label: 'Triangle',
        content: createBaseContent({
            subpaths: [
                {
                    closed: true,
                    commands: [
                        { op: 'moveTo', x: 0.5, y: 0 },
                        { op: 'lineTo', x: 1, y: 1 },
                        { op: 'lineTo', x: 0, y: 1 },
                        { op: 'closePath' },
                    ],
                },
            ],
        }),
    },
];

export function getShapePresetById(id: string): ShapePreset | undefined {
    return SHAPE_PRESETS.find((preset) => preset.id === id);
}
