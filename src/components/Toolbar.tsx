import React from 'react';

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
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 14L4 9L9 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M4 9H15C18.866 9 22 12.134 22 16V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                    <button
                        className="btn btn-ghost btn-icon"
                        onClick={onRedo}
                        disabled={!canRedo}
                        title="Redo (Ctrl+Y)"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M15 14L20 9L15 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M20 9H9C5.13401 9 2 12.134 2 16V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>

                <button
                    className="btn btn-ghost btn-icon"
                    onClick={onSettingsClick}
                    title="Album Settings"
                    data-testid="settings-button"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="2" />
                        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-1.42 3.42 2 2 0 01-1.41-.59l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-3.42-1.42 2 2 0 01.59-1.41l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1.08 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 011.42-3.42 2 2 0 011.41.59l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001.08 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 013.42 1.42 2 2 0 01-.59 1.41l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1.08z" stroke="currentColor" strokeWidth="2" />
                    </svg>
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
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M21 14H14V21H21V14Z" stroke="currentColor" strokeWidth="2" />
                        <path d="M10 14H3V21H10V14Z" stroke="currentColor" strokeWidth="2" />
                        <path d="M21 3H14V10H21V3Z" stroke="currentColor" strokeWidth="2" />
                        <path d="M10 3H3V10H10V3Z" stroke="currentColor" strokeWidth="2" />
                    </svg>
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
