import React from 'react';
import type { AlbumSettings, Unit } from '../types';
import { NumberInput } from './common/NumberInput';

/**
 * Props for the AlbumSettingsPanel component.
 */
interface AlbumSettingsPanelProps {
    /** The current album settings. */
    settings: AlbumSettings;
    /** Callback fired when settings are changed. */
    onSettingsChange: (settings: Partial<AlbumSettings>) => void;
    /** The current number of pages in the album (for validation). */
    currentPageCount: number;
}

/**
 * AlbumSettingsPanel component allows users to configure album-wide settings
 * such as page dimensions, units, and maximum page count.
 */
export const AlbumSettingsPanel: React.FC<AlbumSettingsPanelProps> = ({
    settings,
    onSettingsChange,
    currentPageCount,
}) => {
    const handleWidthChange = (val: string) => {
        const value = parseFloat(val);
        if (!isNaN(value) && value >= 1) {
            if (settings.isSquare) {
                onSettingsChange({ pageWidth: value, pageHeight: value });
            } else {
                onSettingsChange({ pageWidth: value });
            }
        }
    };

    const handleHeightChange = (val: string) => {
        const value = parseFloat(val);
        if (!isNaN(value) && value >= 1) {
            onSettingsChange({ pageHeight: value });
        }
    };

    const handleMaxPagesChange = (val: string) => {
        const value = parseInt(val);
        if (!isNaN(value) && value >= currentPageCount) {
            onSettingsChange({ maxPages: value });
        }
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


    return (
        <div data-testid="album-settings-panel">
            <div className="settings-group">
                <label className="settings-label">
                    <span>Page Size ({settings.unit})</span>
                </label>

                <div className="size-inputs">
                    <div className="input-group">
                        <label htmlFor="page-width">
                            {settings.isSquare ? 'Size' : 'Width'}
                        </label>
                        <NumberInput
                            id="page-width"
                            step={0.25}
                            min={1}
                            max={24}
                            value={settings.pageWidth}
                            onChange={handleWidthChange}
                            className="settings-input"
                            data-testid="page-width-input"
                        />
                    </div>

                    {!settings.isSquare && (
                        <div className="input-group">
                            <label htmlFor="page-height">Height</label>
                            <NumberInput
                                id="page-height"
                                step={0.25}
                                min={1}
                                max={24}
                                value={settings.pageHeight}
                                onChange={handleHeightChange}
                                className="settings-input"
                                data-testid="page-height-input"
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
                    data-testid="unit-select"
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
                        data-testid="square-checkbox"
                    />
                    <span>Square pages</span>
                </label>
            </div>

            <div className="settings-group">
                <label className="settings-label">
                    <span>Max Pages</span>
                </label>
                <NumberInput
                    step={2}
                    min={currentPageCount}
                    max={200}
                    value={settings.maxPages}
                    onChange={handleMaxPagesChange}
                    className="settings-input"
                    data-testid="max-pages-input"
                />
                <span className="text-muted settings-hint" data-testid="page-count-hint">
                    Currently: {currentPageCount} pages
                </span>
            </div>
        </div>
    );
};
