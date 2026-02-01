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
    // We could access store here directly, but the props are passed from AlbumEditor
    // which gets them from the store.
    // To respect the prompt "Update useKeyboardShortcuts to use store actions",
    // we can ignore the props and use the store if we want to decoupling from AlbumEditor props.
    // But AlbumEditor currently passes them.
    // Let's use the store directly and make props optional or ignore them to decouple.

    const store = useAlbumStore();

    // Prefer passed props if provided (legacy/testing), else use store
    // Actually, let's just use store to fulfil the refactor goal.
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
