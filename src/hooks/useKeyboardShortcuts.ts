import { useEffect } from 'react';
import { useUndo, useRedo, useCanUndo, useCanRedo } from '../states/albumStore';

/**
 * Hook to handle global keyboard shortcuts.
 *
 * Currently supported shortcuts:
 * - Undo: Ctrl+Z or Cmd+Z
 * - Redo: Ctrl+Y, Cmd+Y, or Ctrl+Shift+Z, Cmd+Shift+Z
 */
export const useKeyboardShortcuts = () => {
    const undo = useUndo();
    const redo = useRedo();
    const canUndo = useCanUndo();
    const canRedo = useCanRedo();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Undo: Ctrl+Z or Meta+Z
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    // Redo: Ctrl+Shift+Z
                    if (canRedo) redo();
                } else {
                    if (canUndo) undo();
                }
            }
            // Redo: Ctrl+Y or Meta+Y
            else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                if (canRedo) redo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo, canUndo, canRedo]);
};
