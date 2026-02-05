import { useEffect } from 'react';
import { useAlbumStore } from '../states/albumStore';

interface UseKeyboardShortcutsProps {
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
}

export const useKeyboardShortcuts = ({
    undo,
    redo,
    canUndo,
    canRedo
}: UseKeyboardShortcutsProps) => {
    const store = useAlbumStore();

    const effectiveUndo = undo || store.undo;
    const effectiveRedo = redo || store.redo;
    const effectiveCanUndo = canUndo ?? store.canUndo;
    const effectiveCanRedo = canRedo ?? store.canRedo;

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Undo: Ctrl+Z or Meta+Z
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    // Redo: Ctrl+Shift+Z
                    if (effectiveCanRedo) effectiveRedo();
                } else {
                    if (effectiveCanUndo) effectiveUndo();
                }
            }
            // Redo: Ctrl+Y or Meta+Y
            else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                if (effectiveCanRedo) effectiveRedo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [effectiveUndo, effectiveRedo, effectiveCanUndo, effectiveCanRedo]);
};
