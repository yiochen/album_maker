import * as fabric from 'fabric';
import { BASE_TEXT_EDITOR_PADDING_PX } from '../services/textEditorLayout';
import { CanvasTextElement } from './CanvasTextElement';
import type { TextToolbarPosition } from './useTextEditing';

export const findCanvasTextObjectByElementId = (
    fabricCanvas: fabric.Canvas,
    elementId: string
): CanvasTextElement | null => {
    for (const obj of fabricCanvas.getObjects() as fabric.FabricObject[]) {
        if (obj instanceof CanvasTextElement && obj.pageElement.id === elementId) {
            return obj;
        }
    }
    return null;
};

export const getTextToolbarPosition = (
    textObject: CanvasTextElement,
    fabricCanvas: fabric.Canvas,
    containerEl: HTMLDivElement
): TextToolbarPosition => {
    const bounds = textObject.getBoundingRect();
    const canvasEl = fabricCanvas.getElement();
    const canvasRect = canvasEl.getBoundingClientRect();
    const containerRect = containerEl.getBoundingClientRect();

    const widthScale = canvasRect.width / (fabricCanvas.width || 1);
    const heightScale = canvasRect.height / (fabricCanvas.height || 1);

    const screenLeft = canvasRect.left + bounds.left * widthScale;
    const screenTop = canvasRect.top + bounds.top * heightScale;
    const screenWidth = bounds.width * widthScale;

    return {
        top: screenTop - containerRect.top - BASE_TEXT_EDITOR_PADDING_PX,
        left: screenLeft - containerRect.left - BASE_TEXT_EDITOR_PADDING_PX,
        width: screenWidth + BASE_TEXT_EDITOR_PADDING_PX * 2,
    };
};
