import React from 'react';
import { UndoIcon } from './icons/UndoIcon';
import { RedoIcon } from './icons/RedoIcon';
import { SnappingIcon } from './icons/SnappingIcon';
import { ImageIcon } from './icons/ImageIcon';

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
    /** Whether the image pool is currently open. */
    isImagePoolOpen: boolean;
    /** Callback fired when the image pool toggle is clicked. */
    onImagePoolToggle: () => void;
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
    isImagePoolOpen,
    onImagePoolToggle,
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
            </div>

            <div className="toolbar-right">
                <button
                    className={`btn btn-ghost btn-icon ${isImagePoolOpen ? 'active' : ''}`}
                    onClick={onImagePoolToggle}
                    title="Toggle Image Pool"
                    data-testid="toggle-image-pool-button"
                >
                    <ImageIcon width="20" height="20" />
                </button>
            </div>
        </div>
    );
};
