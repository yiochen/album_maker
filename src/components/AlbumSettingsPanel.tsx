import React, { useState, useEffect } from 'react';
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
    // Local state for input values to allow temporary empty state
    const [widthValue, setWidthValue] = useState(String(settings.pageWidth));
    const [heightValue, setHeightValue] = useState(String(settings.pageHeight));
    const [maxPagesValue, setMaxPagesValue] = useState(String(settings.maxPages));

    // Sync local state when settings change externally
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setWidthValue(String(settings.pageWidth));
    }, [settings.pageWidth]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setHeightValue(String(settings.pageHeight));
    }, [settings.pageHeight]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMaxPagesValue(String(settings.maxPages));
    }, [settings.maxPages]);

    const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;
        setWidthValue(inputValue);

        const value = parseFloat(inputValue);
        if (!isNaN(value) && value >= 1) {
            if (settings.isSquare) {
                onSettingsChange({ pageWidth: value, pageHeight: value });
            } else {
                onSettingsChange({ pageWidth: value });
            }
        }
    };

    const handleWidthBlur = () => {
        // Revert to current setting if empty or invalid
        const value = parseFloat(widthValue);
        if (isNaN(value) || value < 1) {
            setWidthValue(String(settings.pageWidth));
        }
    };

    const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;
        setHeightValue(inputValue);

        const value = parseFloat(inputValue);
        if (!isNaN(value) && value >= 1) {
            onSettingsChange({ pageHeight: value });
        }
    };

    const handleHeightBlur = () => {
        // Revert to current setting if empty or invalid
        const value = parseFloat(heightValue);
        if (isNaN(value) || value < 1) {
            setHeightValue(String(settings.pageHeight));
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

    const handleMaxPagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;
        setMaxPagesValue(inputValue);

        const value = parseInt(inputValue);
        if (!isNaN(value) && value >= currentPageCount) {
            onSettingsChange({ maxPages: value });
        }
    };

    const handleMaxPagesBlur = () => {
        // Revert to current setting if empty or invalid
        const value = parseInt(maxPagesValue);
        if (isNaN(value) || value < currentPageCount) {
            setMaxPagesValue(String(settings.maxPages));
        }
    };

    return (
        <div className="album-settings-panel" data-testid="album-settings-panel">
            <h3 className="panel-title" data-testid="settings-title">Album Settings</h3>

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
                            value={widthValue}
                            onChange={handleWidthChange}
                            onBlur={handleWidthBlur}
                            className="settings-input"
                            data-testid="page-width-input"
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
                                value={heightValue}
                                onChange={handleHeightChange}
                                onBlur={handleHeightBlur}
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
                <input
                    type="number"
                    step="2"
                    min={currentPageCount}
                    max="200"
                    value={maxPagesValue}
                    onChange={handleMaxPagesChange}
                    onBlur={handleMaxPagesBlur}
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
