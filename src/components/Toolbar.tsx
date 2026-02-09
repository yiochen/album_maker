import React from 'react';
import { UndoIcon } from './icons/UndoIcon';
import { RedoIcon } from './icons/RedoIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { SnappingIcon } from './icons/SnappingIcon';

interface ToolbarProps {
    albumName: string;
    onAlbumNameChange: (name: string) => void;
    isSnappingEnabled: boolean;
    onSnappingToggle: () => void;
    onImport: () => void;
    onExport: () => void;
    onSettingsClick: () => void;
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
}

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
