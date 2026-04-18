import React from 'react';
import type { ShapePreset } from '../utils/shapePresets';
import { SHAPE_PRESETS } from '../utils/shapePresets';

interface ShapePanelProps {
    onAddShape: (preset: ShapePreset) => void;
}

export const ShapePanel: React.FC<ShapePanelProps> = ({ onAddShape }) => {
    return (
        <div className="shape-panel" data-testid="shape-panel">
            <div className="shape-panel-grid">
                {SHAPE_PRESETS.map((preset) => (
                    <button
                        key={preset.id}
                        type="button"
                        className="shape-preset-card"
                        onClick={() => onAddShape(preset)}
                        data-testid={`shape-preset-${preset.id}`}
                    >
                        <span className="shape-preset-preview" aria-hidden="true">
                            {preset.id === 'rectangle' && <span className="shape-preview-rect" />}
                            {preset.id === 'ellipse' && <span className="shape-preview-ellipse" />}
                            {preset.id === 'triangle' && <span className="shape-preview-triangle" />}
                        </span>
                        <span className="shape-preset-label">{preset.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};
