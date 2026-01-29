import React from 'react';
import type { AlbumSettings, Unit } from '../types';

interface AlbumSettingsPanelProps {
    settings: AlbumSettings;
    onSettingsChange: (settings: Partial<AlbumSettings>) => void;
    currentPageCount: number;
}

export const AlbumSettingsPanel: React.FC<AlbumSettingsPanelProps> = ({
    settings,
    onSettingsChange,
    currentPageCount,
}) => {
    const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(e.target.value) || 1;
        if (settings.isSquare) {
            onSettingsChange({ pageWidth: value, pageHeight: value });
        } else {
            onSettingsChange({ pageWidth: value });
        }
    };

    const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(e.target.value) || 1;
        onSettingsChange({ pageHeight: value });
    };

    const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onSettingsChange({ unit: e.target.value as Unit });
    };

    const handleSquareToggle = () => {
        const newIsSquare = !settings.isSquare;
        if (newIsSquare) {
            // When enabling square mode, use the current width as both dimensions
            onSettingsChange({ isSquare: true, pageHeight: settings.pageWidth });
        } else {
            onSettingsChange({ isSquare: false });
        }
    };

    const handleMaxPagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = Math.max(currentPageCount, parseInt(e.target.value) || 1);
        onSettingsChange({ maxPages: value });
    };

    return (
        <div className="album-settings-panel">
            <h3 className="panel-title">Album Settings</h3>

            <div className="settings-group">
                <label className="settings-label">
                    <span>Page Size ({settings.unit})</span>
                </label>

                <div className="size-inputs">
                    <div className="input-group">
                        <label htmlFor="page-width">
                            {settings.isSquare ? 'Size' : 'Width'}
                        </label>
                        <input
                            id="page-width"
                            type="number"
                            step="0.25"
                            min="1"
                            max="24"
                            value={settings.pageWidth}
                            onChange={handleWidthChange}
                            className="settings-input"
                        />
                    </div>

                    {!settings.isSquare && (
                        <div className="input-group">
                            <label htmlFor="page-height">Height</label>
                            <input
                                id="page-height"
                                type="number"
                                step="0.25"
                                min="1"
                                max="24"
                                value={settings.pageHeight}
                                onChange={handleHeightChange}
                                className="settings-input"
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="settings-group">
                <label className="settings-label">
                    <span>Unit</span>
                </label>
                <select
                    value={settings.unit}
                    onChange={handleUnitChange}
                    className="settings-select"
                >
                    <option value="inch">Inches</option>
                    <option value="cm">Centimeters</option>
                </select>
            </div>

            <div className="settings-group">
                <label className="settings-checkbox">
                    <input
                        type="checkbox"
                        checked={settings.isSquare}
                        onChange={handleSquareToggle}
                    />
                    <span>Square pages</span>
                </label>
            </div>

            <div className="settings-group">
                <label className="settings-label">
                    <span>Max Pages</span>
                </label>
                <input
                    type="number"
                    step="2"
                    min={currentPageCount}
                    max="200"
                    value={settings.maxPages}
                    onChange={handleMaxPagesChange}
                    className="settings-input"
                />
                <span className="text-muted settings-hint">
                    Currently: {currentPageCount} pages
                </span>
            </div>
        </div>
    );
};
