import React from 'react';
import type { Spread, AlbumSettings } from '../../types';
import { PropertySection } from '../common/PropertySection';
import { PanelPropertyRow } from '../common/PanelPropertyRow';

interface SpreadPropertiesProps {
    spread: Spread;
    settings: AlbumSettings;
}

export const SpreadProperties: React.FC<SpreadPropertiesProps> = ({
    spread,
    settings,
}) => {
    return (
        <>
            <PropertySection title="Spread Size">
                <PanelPropertyRow label="Width">
                    <span style={{ color: 'var(--color-text-primary)' }}>
                        {settings.pageWidth * 2} {settings.unit}
                    </span>
                </PanelPropertyRow>
                <PanelPropertyRow label="Height">
                    <span style={{ color: 'var(--color-text-primary)' }}>
                        {settings.pageHeight} {settings.unit}
                    </span>
                </PanelPropertyRow>
            </PropertySection>

            <PropertySection title="Spread Info">
                <PanelPropertyRow label="Total Elements">
                    <span style={{ color: 'var(--color-text-primary)' }}>{spread.elements.length}</span>
                </PanelPropertyRow>
            </PropertySection>
        </>
    );
};
