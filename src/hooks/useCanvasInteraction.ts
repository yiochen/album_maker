import { useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import type { Spread, PoolImage, PageElement } from '../types';
import { CustomFabricObject } from './fabricTypes';
import { useCanvasSelection } from './useCanvasSelection';
import { useCanvasSnapping } from './useCanvasSnapping';
import { useCanvasDragDrop } from './useCanvasDragDrop';

interface UseCanvasInteractionProps {
    fabricCanvas: fabric.Canvas | null;
    canvasWidth: number;
    canvasHeight: number;
    spread: Spread;
    selectedElementId: string | null;
    isSnappingEnabled: boolean;
    zoom: number;
    toCanvasPx: (value: number) => number;
    toModelPx: (value: number) => number;
    snapLinesRef: React.RefObject<fabric.Line[]>;
    wrapperRef: React.RefObject<HTMLDivElement | null>;
    onElementSelect: (elementId: string | null) => void;
    onElementUpdate: (spreadId: string, elementId: string, updates: Partial<PageElement>) => void;
    onElementDelete: (spreadId: string, elementId: string) => void;
    onImageDrop: (spreadId: string, image: PoolImage, position: { x: number; y: number }) => void;
    onCanvasChange?: (dataUrl: string) => void;
}

export const useCanvasInteraction = ({
    fabricCanvas,
    canvasWidth,
    canvasHeight,
    spread,
    isSnappingEnabled,
    zoom,
    toCanvasPx,
    toModelPx,
    snapLinesRef,
    wrapperRef,
    onElementSelect,
    onElementUpdate,
    onElementDelete,
    onImageDrop,
    onCanvasChange,
}: UseCanvasInteractionProps) => {

    const onElementDeleteRef = useRef(onElementDelete);
    const spreadRef = useRef(spread);

    useEffect(() => {
        onElementDeleteRef.current = onElementDelete;
        spreadRef.current = spread;
    }, [onElementDelete, spread]);

    // Keyboard Deletion
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (['INPUT', 'TEXTAREA'].includes(target.tagName) && !target.closest('.canvas-container')) {
                return;
            }

            if (e.key === 'Delete' || e.key === 'Backspace') {
                const canvas = fabricCanvas;
                if (!canvas) return;
                const activeObj = canvas.getActiveObject() as CustomFabricObject;
                if (activeObj && activeObj.data) {
                    onElementDeleteRef.current(spreadRef.current.id, activeObj.data.id);
                    canvas.discardActiveObject();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [fabricCanvas]);

    const { hasSelection } = useCanvasSelection({
        fabricCanvas,
        onElementSelect,
    });

    useCanvasSnapping({
        fabricCanvas,
        canvasWidth,
        canvasHeight,
        spread,
        isSnappingEnabled,
        toCanvasPx,
        toModelPx,
        snapLinesRef,
        onElementUpdate,
        onCanvasChange,
    });

    const { isDragOver, handleDragOver, handleDragLeave, handleDrop } = useCanvasDragDrop({
        spreadId: spread.id,
        zoom,
        wrapperRef,
        toModelPx,
        onImageDrop,
    });

    return {
        isDragOver,
        hasSelection,
        handleDragOver,
        handleDragLeave,
        handleDrop,
    };
};
