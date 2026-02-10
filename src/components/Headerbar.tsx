import React from 'react';
import { SettingsIcon } from './icons/SettingsIcon';

/**
 * Props for the Headerbar component.
 */
interface HeaderbarProps {
    /** Album selector element rendered on the left side. */
    albumSelector: React.ReactNode;
    /** Callback fired when the import button is clicked. */
    onImport: () => void;
    /** Callback fired when the export button is clicked. */
    onExport: () => void;
    /** Callback fired when the settings button is clicked. */
    onSettingsClick: () => void;
}

/**
 * Headerbar component displays the top navigation bar with album name, global controls,
 * and history (undo/redo) buttons.
 */
export const Headerbar: React.FC<HeaderbarProps> = ({
    albumSelector,
    onImport,
    onExport,
    onSettingsClick,
}) => {
    return (
        <header className="toolbar" data-testid="toolbar">
            <div className="toolbar-left">
                {albumSelector}
                <button
                    className="btn btn-ghost btn-icon"
                    onClick={onSettingsClick}
                    title="Album Settings"
                    data-testid="settings-button"
                >
                    <SettingsIcon width="18" height="18" />
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
