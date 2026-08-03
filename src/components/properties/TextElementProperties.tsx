/**
 * TextElementProperties — Properties panel for text elements.
 *
 * Shows position/size controls (shared with images via propertyUtils).
 * Z-order and delete actions are also included.
 */
import React from 'react';
import type { PageElement, AlbumSettings } from '../../types';
import { isTextElement } from '../../types';
import {
    pxToUnit,
    calculateNewBoxPosition,
    calculateNewBoxSize,
} from '../../utils/propertyUtils';
import { PropertySection } from '../common/PropertySection';
import { PanelPropertyRow } from '../common/PanelPropertyRow';
import { PanelActionButton } from '../common/PanelActionButton';
import { NumberInput } from '../common/NumberInput';
import { MoveForwardIcon } from '../icons/MoveForwardIcon';
import { MoveBackwardIcon } from '../icons/MoveBackwardIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { APP_CONFIG } from '../../config';
import { ShadowPresetSection } from './ShadowPresetSection';

interface TextElementPropertiesProps {
    element: PageElement;
    settings: AlbumSettings;
    onUpdate: (updates: Partial<PageElement>, groupId?: string) => void;
    onDelete: () => void;
    canBringForward: boolean;
    canSendBackward: boolean;
    onBringForward: () => void;
    onSendBackward: () => void;
}

export const TextElementProperties: React.FC<TextElementPropertiesProps> = ({
    element,
    settings,
    onUpdate,
    onDelete,
    canBringForward,
    canSendBackward,
    onBringForward,
    onSendBackward,
}) => {
    if (!isTextElement(element)) return null;

    const ppi = APP_CONFIG.PPI;
    const spreadWidth = settings.pageWidth * 2 * ppi;
    const spreadHeight = settings.pageHeight * ppi;

    const box = element.box;
    const currentWidthPx = (box.x2 - box.x1) * spreadWidth;
    const currentXPx = box.x1 * spreadWidth;
    const currentYPx = box.y1 * spreadHeight;

    const widthInUnits = pxToUnit(currentWidthPx, settings.unit, ppi);
    const xInUnits = pxToUnit(currentXPx, settings.unit, ppi);
    const yInUnits = pxToUnit(currentYPx, settings.unit, ppi);

    const handlePositionChange = (axis: 'x' | 'y', value: string) => {
        const newBox = calculateNewBoxPosition(
            axis, value, element.box, spreadWidth, spreadHeight, settings.unit, ppi
        );
        onUpdate({ box: newBox });
    };

    const handleSizeChange = (dimension: 'width', value: string) => {
        const newBox = calculateNewBoxSize(
            dimension, value, element.box, spreadWidth, spreadHeight, settings.unit, false, ppi
        );
        onUpdate({ box: newBox });
    };

    return (
        <>
            <PropertySection title={`Size (${settings.unit})`}>
                <div className="property-size-grid">
                    <span className="property-label">Width</span>
                    <div className="aspect-lock-cell" />
                    <NumberInput
                        className="property-input property-size-input"
                        value={widthInUnits}
                        onChange={(val) => handleSizeChange('width', val)}
                        step={0.1}
                        immediate={true}
                    />
                </div>
            </PropertySection>

            <PropertySection title={`Position (${settings.unit})`}>
                <PanelPropertyRow label="X">
                    <NumberInput
                        className="property-input"
                        value={xInUnits}
                        onChange={(val) => handlePositionChange('x', val)}
                        step={0.1}
                        immediate={true}
                    />
                </PanelPropertyRow>
                <PanelPropertyRow label="Y">
                    <NumberInput
                        className="property-input"
                        value={yInUnits}
                        onChange={(val) => handlePositionChange('y', val)}
                        step={0.1}
                        immediate={true}
                    />
                </PanelPropertyRow>
            </PropertySection>

            <ShadowPresetSection element={element} onUpdate={onUpdate} />

            <PropertySection title="Actions">
                <div className="image-action-grid">
                    <PanelActionButton
                        title="Bring forward"
                        onClick={onBringForward}
                        disabled={!canBringForward}
                        icon={<MoveForwardIcon />}
                        label="Bring forward"
                    />
                    <PanelActionButton
                        title="Send backward"
                        onClick={onSendBackward}
                        disabled={!canSendBackward}
                        icon={<MoveBackwardIcon />}
                        label="Send backward"
                    />
                    <PanelActionButton
                        title="Delete"
                        onClick={onDelete}
                        icon={<TrashIcon style={{ color: 'var(--color-error, #e53935)' }} />}
                        label="Delete"
                        className="image-action-delete"
                    />
                </div>
            </PropertySection>
        </>
    );
};
