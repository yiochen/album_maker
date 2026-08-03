import React from 'react';
import type { PageElement } from '../../types';
import {
    ELEMENT_SHADOW_PRESETS,
    getShadowPreset,
    getShadowPresetCss,
} from '../../utils/shadowPresets';
import { PropertySection } from '../common/PropertySection';

interface ShadowPresetSectionProps {
    element: PageElement;
    onUpdate: (updates: Partial<PageElement>) => void;
}

export const ShadowPresetSection: React.FC<ShadowPresetSectionProps> = ({ element, onUpdate }) => {
    const selectedPresetId = getShadowPreset(element.shadowPreset)?.id;
    const choices = [
        { id: undefined, label: 'None' },
        ...ELEMENT_SHADOW_PRESETS.map(({ id, label }) => ({ id, label })),
    ];

    return (
        <PropertySection title="Shadow">
            <div className="shadow-preset-grid" role="group" aria-label="Shadow preset">
                {choices.map((choice) => {
                    const isSelected = selectedPresetId === choice.id;
                    return (
                        <button
                            key={choice.id ?? 'none'}
                            type="button"
                            className={`shadow-preset-button ${isSelected ? 'active' : ''}`}
                            aria-label={`${choice.label} shadow`}
                            aria-pressed={isSelected}
                            onClick={() => onUpdate({ shadowPreset: choice.id })}
                            data-testid={`shadow-preset-${choice.id ?? 'none'}`}
                        >
                            <span
                                className="shadow-preset-swatch"
                                style={{ boxShadow: getShadowPresetCss(choice.id) }}
                                aria-hidden="true"
                            />
                            <span className="shadow-preset-label">{choice.label}</span>
                        </button>
                    );
                })}
            </div>
        </PropertySection>
    );
};
