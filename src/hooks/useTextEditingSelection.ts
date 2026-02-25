import { useEffect } from 'react';
import * as fabric from 'fabric';
import { CanvasTextElement } from './CanvasTextElement';
import { useSetEditingTextElementId } from '../states/uiStore';

/**
 * Props for useTextEditingSelection.
 */
interface UseTextEditingSelectionProps {
    /** The Fabric.js canvas instance. */
    fabricCanvas: fabric.Canvas | null;
}

/**
 * Hook to synchronize Fabric selection with the editingTextElementId store.
 * 
 * It listens for selection events and:
 * - Sets editingTextElementId if a text element is selected.
 * - Clears editingTextElementId if selection is cleared or moved to a non-text element.
 */
export const useTextEditingSelection = ({
    fabricCanvas,
}: UseTextEditingSelectionProps) => {
    const setEditingTextElementId = useSetEditingTextElementId();

    useEffect(() => {
        const canvas = fabricCanvas;
        if (!canvas) return;

        const handleSelection = (e: { selected: fabric.Object[] }) => {
            const selected = e.selected || [];
            if (selected.length === 1) {
                const obj = selected[0];
                if (obj instanceof CanvasTextElement) {
                    setEditingTextElementId(obj.pageElement.id);
                } else {
                    setEditingTextElementId(null);
                }
            } else {
                setEditingTextElementId(null);
            }
        };

        const handleSelectionCleared = () => {
            setEditingTextElementId(null);
        };

        canvas.on('selection:created', handleSelection);
        canvas.on('selection:updated', handleSelection);
        canvas.on('selection:cleared', handleSelectionCleared);

        return () => {
            canvas.off('selection:created', handleSelection);
            canvas.off('selection:updated', handleSelection);
            canvas.off('selection:cleared', handleSelectionCleared);
        };
    }, [fabricCanvas, setEditingTextElementId]);
};
