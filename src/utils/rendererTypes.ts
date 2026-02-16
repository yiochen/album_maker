import { ImageContent } from '../types';

export interface InteractivityOptions {
    zoom: number;
    showPageSeam?: boolean;
    onContentTransformChange?: (elementId: string, contentTransform: ImageContent['contentTransform']) => void;
}

export interface BaseRenderOptions {
    ppi: number;
    useThumbnail?: boolean;
}

export interface FabricRenderOptions extends BaseRenderOptions {
    interactivityOptions?: InteractivityOptions;
}

export interface OffscreenRenderOptions extends BaseRenderOptions {
    format: 'png' | 'jpeg';
    quality: number;
    splitPage?: 'left' | 'right';
}
