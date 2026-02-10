import React from 'react';
import { UndoIcon } from './icons/UndoIcon';
import { RedoIcon } from './icons/RedoIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { SnappingIcon } from './icons/SnappingIcon';

/**
 * Props for the Toolbar component.
 */
interface ToolbarProps {
    /** The name of the current album. */
    albumName: string;
    /** Callback fired when the album name is changed. */
    onAlbumNameChange: (name: string) => void;
    /** Whether snapping is currently enabled. */
    isSnappingEnabled: boolean;
    /** Callback fired when the snapping toggle is clicked. */
    onSnappingToggle: () => void;
    /** Callback fired when the import button is clicked. */
    onImport: () => void;
    /** Callback fired when the export button is clicked. */
    onExport: () => void;
    /** Callback fired when the settings button is clicked. */
    onSettingsClick: () => void;
    /** Callback fired when the undo button is clicked. */
    onUndo: () => void;
    /** Callback fired when the redo button is clicked. */
    onRedo: () => void;
    /** Whether undo is currently available. */
    canUndo: boolean;
    /** Whether redo is currently available. */
    canRedo: boolean;
}

/**
 * Toolbar component displays the top navigation bar with album name, global controls,
 * and history (undo/redo) buttons.
 */
export const Toolbar: React.FC<ToolbarProps> = ({
    albumName,
    onAlbumNameChange,
    isSnappingEnabled,
    onSnappingToggle,
    onImport,
    onExport,
    onSettingsClick,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
}) => {
    return (
        <header className="toolbar" data-testid="toolbar">
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
                    className="btn btn-ghost btn-icon"
                    onClick={onSettingsClick}
                    title="Album Settings"
                    data-testid="settings-button"
                >
                    <SettingsIcon width="18" height="18" />
                </button>

                <input
                    type="text"
                    value={albumName}
                    onChange={(e) => onAlbumNameChange(e.target.value)}
                    className="album-name-input"
                    placeholder="Album name..."
                    data-testid="album-name-input"
                />
            </div>

            <div className="toolbar-center">
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
                <button className="btn btn-ghost" onClick={onImport} data-testid="import-album-button">
                    Import
                </button>
                <button className="btn btn-ghost" onClick={onExport} data-testid="export-album-button">
                    Export
                </button>
            </div>
        </header>
    );
};
