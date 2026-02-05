import { useState, useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import { CustomFabricObject } from './fabricTypes';

interface UseCanvasSelectionProps {
    fabricCanvas: fabric.Canvas | null;
    onElementSelect: (elementId: string | null) => void;
}

export const useCanvasSelection = ({
    fabricCanvas,
    onElementSelect,
}: UseCanvasSelectionProps) => {
    const [hasSelection, setHasSelection] = useState(false);

    // Refs for callbacks
    const onElementSelectRef = useRef(onElementSelect);

    useEffect(() => {
        onElementSelectRef.current = onElementSelect;
    }, [onElementSelect]);

    useEffect(() => {
        const canvas = fabricCanvas;
        if (!canvas) return;

        const handleSelection = (e: { selected: fabric.Object[] }) => {
            setHasSelection(true);
            const selected = e.selected || [];
            if (selected.length === 1) {
                const obj = selected[0] as CustomFabricObject;
                if (obj.data?.id) {
                    onElementSelectRef.current(obj.data.id);
                }
            } else {
                onElementSelectRef.current(null);
            }
        };

        const handleSelectionCleared = () => {
            setHasSelection(false);
            onElementSelectRef.current(null);
        };

        canvas.on('selection:created', handleSelection);
        canvas.on('selection:updated', handleSelection);
        canvas.on('selection:cleared', handleSelectionCleared);

        return () => {
            canvas.off('selection:created', handleSelection);
            canvas.off('selection:updated', handleSelection);
            canvas.off('selection:cleared', handleSelectionCleared);
        };
    }, [fabricCanvas]);

    return {
        hasSelection,
    };
};
