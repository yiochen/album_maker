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

                // Handle single object selection
                if (activeObj && activeObj.data?.id) {
                    const id = activeObj.data.id;
                    canvas.discardActiveObject();
                    onElementDeleteRef.current(spreadRef.current.id, id);
                    canvas.requestRenderAll();
                    return;
                }

                // Handle active selection (multi-selection)
                if (activeObj && activeObj.type === 'activeSelection') {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const objects = (activeObj as any).getObjects() as CustomFabricObject[];
                    const idsToDelete = objects.map(o => o.data?.id).filter((id): id is string => !!id);

                    if (idsToDelete.length > 0) {
                        canvas.discardActiveObject();
                        // Delete each element
                        idsToDelete.forEach(id => {
                            onElementDeleteRef.current(spreadRef.current.id, id);
                        });
                        canvas.requestRenderAll();
                    }
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
        zoom,
        snapLinesRef,
        onElementUpdate,
        onCanvasChange,
    });

    const { isDragOver, handleDragOver, handleDragLeave, handleDrop, handleTouchDrop } = useCanvasDragDrop({
        spreadId: spread.id,
        zoom,
        wrapperRef,
        onImageDrop,
    });

    useEffect(() => {
        window.addEventListener('app:image-drop', handleTouchDrop);
        return () => window.removeEventListener('app:image-drop', handleTouchDrop);
    }, [handleTouchDrop]);

    return {
        isDragOver,
        hasSelection,
        handleDragOver,
        handleDragLeave,
        handleDrop,
    };
};
