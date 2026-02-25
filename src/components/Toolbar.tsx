import React from 'react';
import { UndoIcon } from './icons/UndoIcon';
import { RedoIcon } from './icons/RedoIcon';
import { SnappingIcon } from './icons/SnappingIcon';
import { TextIcon } from './icons/TextIcon';
import { AddImageIcon } from './icons/AddImageIcon';

/**
 * Props for the Toolbar component.
 */
interface ToolbarProps {
    /** Whether snapping is currently enabled. */
    isSnappingEnabled: boolean;
    /** Callback fired when the snapping toggle is clicked. */
    onSnappingToggle: () => void;
    /** Callback fired when the undo button is clicked. */
    onUndo: () => void;
    /** Callback fired when the redo button is clicked. */
    onRedo: () => void;
    /** Whether undo is currently available. */
    canUndo: boolean;
    /** Whether redo is currently available. */
    canRedo: boolean;
    /** Callback fired when the "Add Text" button is clicked. */
    onAddText: () => void;
    /** Callback fired when the "Add Image" button is clicked. */
    onAddImage: () => void;
}

/**
 * Toolbar component displays editing controls below the headerbar.
 */
export const Toolbar: React.FC<ToolbarProps> = ({
    isSnappingEnabled,
    onSnappingToggle,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    onAddText,
    onAddImage,
}) => {
    return (
        <div className="toolbar-secondary" data-testid="toolbar-secondary">
            <div className="toolbar-left">
                <div className="history-controls" style={{ display: 'flex', gap: '4px', marginRight: '12px' }}>
                    <button
                        className="btn btn-ghost btn-icon"
                        onClick={onUndo}
                        disabled={!canUndo}
                        title="Undo (Ctrl+Z)"
                    >
                        <UndoIcon width="18" height="18" />
                    </button>
                    <button
                        className="btn btn-ghost btn-icon"
                        onClick={onRedo}
                        disabled={!canRedo}
                        title="Redo (Ctrl+Y)"
                    >
                        <RedoIcon width="18" height="18" />
                    </button>
                </div>

                <button
                    className={`btn btn-ghost snap-toggle ${isSnappingEnabled ? 'active' : ''}`}
                    onClick={onSnappingToggle}
                    title={isSnappingEnabled ? 'Snapping enabled' : 'Snapping disabled'}
                >
                    <SnappingIcon width="16" height="16" />
                    <span>Snap</span>
                </button>

                <button
                    className="btn btn-ghost"
                    onClick={onAddImage}
                    title="Add image placeholder"
                    data-testid="add-image-btn"
                >
                    <AddImageIcon width="16" height="16" />
                    <span>Image</span>
                </button>

                <button
                    className="btn btn-ghost"
                    onClick={onAddText}
                    title="Add text element"
                    data-testid="add-text-btn"
                >
                    <TextIcon width="16" height="16" />
                    <span>Text</span>
                </button>
            </div>

        </div>
    );
};
