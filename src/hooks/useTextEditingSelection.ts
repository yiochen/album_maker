import { useEffect } from 'react';
import * as fabric from 'fabric';
import { CanvasTextElement } from './CanvasTextElement';
import { useEditingTextElementId, useSetEditingTextElementId } from '../states/uiStore';
import { useFabricCanvas } from '../states/editorInfraStore';

/**
 * Props for useTextEditingSelection.
 */
interface UseTextEditingSelectionProps {
    /** Optional explicit canvas; defaults to shared runtime canvas from store. */
    fabricCanvas?: fabric.Canvas | null;
}

/**
 * Hook to manage text editing entry/exit against Fabric selection events.
 *
 * Behavior:
 * - Enter text editing only on double-click of a text object.
 * - Keep single-click selection for move/select interactions.
 * - Exit text editing when selection moves away from the active text object.
 */
export const useTextEditingSelection = ({
    fabricCanvas,
}: UseTextEditingSelectionProps) => {
    const sharedFabricCanvas = useFabricCanvas();
    const activeCanvas = fabricCanvas ?? sharedFabricCanvas;
    const setEditingTextElementId = useSetEditingTextElementId();
    const editingTextElementId = useEditingTextElementId();

    useEffect(() => {
        const canvas = activeCanvas;
        if (!canvas) return;

        const handleSelection = (e: { selected: fabric.Object[] }) => {
            const selected = e.selected || [];
            if (selected.length !== 1) {
                if (editingTextElementId) {
                    setEditingTextElementId(null);
                }
                return;
            }

            const obj = selected[0];
            if (!(obj instanceof CanvasTextElement)) {
                if (editingTextElementId) {
                    setEditingTextElementId(null);
                }
                return;
            }

            // Single selection should not auto-enter editing. It only keeps/clears
            // existing edit mode when switching targets.
            if (editingTextElementId && obj.pageElement.id !== editingTextElementId) {
                setEditingTextElementId(null);
            }
        };

        const handleSelectionCleared = () => {
            if (editingTextElementId) {
                setEditingTextElementId(null);
            }
        };

        const handleDoubleClick = (e: { target?: fabric.Object }) => {
            const target = e.target;
            if (target instanceof CanvasTextElement) {
                setEditingTextElementId(target.pageElement.id);
            }
        };

        canvas.on('selection:created', handleSelection);
        canvas.on('selection:updated', handleSelection);
        canvas.on('selection:cleared', handleSelectionCleared);
        canvas.on('mouse:dblclick', handleDoubleClick);

        return () => {
            canvas.off('selection:created', handleSelection);
            canvas.off('selection:updated', handleSelection);
            canvas.off('selection:cleared', handleSelectionCleared);
            canvas.off('mouse:dblclick', handleDoubleClick);
        };
    }, [activeCanvas, editingTextElementId, setEditingTextElementId]);
};
