import React from 'react';
import type { AlbumSettings, PageElement } from '../../types';
import { isShapeElement } from '../../types';
import { SHAPE_PRESETS } from '../../utils/shapePresets';
import { pxToUnit, calculateNewBoxPosition, calculateNewBoxSize } from '../../utils/propertyUtils';
import { getShapeBorder, normalizeShapeContent } from '../../utils/shapeUtils';
import { PropertySection } from '../common/PropertySection';
import { PanelPropertyRow } from '../common/PanelPropertyRow';
import { PanelActionButton } from '../common/PanelActionButton';
import { NumberInput } from '../common/NumberInput';
import { MoveForwardIcon } from '../icons/MoveForwardIcon';
import { MoveBackwardIcon } from '../icons/MoveBackwardIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { APP_CONFIG } from '../../config';
import { ShadowPresetSection } from './ShadowPresetSection';

interface ShapeElementPropertiesProps {
    element: PageElement;
    settings: AlbumSettings;
    onUpdate: (updates: Partial<PageElement>, groupId?: string) => void;
    onDelete: () => void;
    canBringForward: boolean;
    canSendBackward: boolean;
    onBringForward: () => void;
    onSendBackward: () => void;
}

export const ShapeElementProperties: React.FC<ShapeElementPropertiesProps> = ({
    element,
    settings,
    onUpdate,
    onDelete,
    canBringForward,
    canSendBackward,
    onBringForward,
    onSendBackward,
}) => {
    if (!isShapeElement(element)) {
        return null;
    }

    const shapeContent = normalizeShapeContent(element.content);
    const shapeBorder = getShapeBorder(shapeContent);
    const ppi = APP_CONFIG.PPI;
    const spreadWidth = settings.pageWidth * 2 * ppi;
    const spreadHeight = settings.pageHeight * ppi;
    const box = element.box;
    const currentWidthPx = (box.x2 - box.x1) * spreadWidth;
    const currentHeightPx = (box.y2 - box.y1) * spreadHeight;
    const currentXPx = box.x1 * spreadWidth;
    const currentYPx = box.y1 * spreadHeight;
    const widthInUnits = pxToUnit(currentWidthPx, settings.unit, ppi);
    const heightInUnits = pxToUnit(currentHeightPx, settings.unit, ppi);
    const xInUnits = pxToUnit(currentXPx, settings.unit, ppi);
    const yInUnits = pxToUnit(currentYPx, settings.unit, ppi);

    const serializedSubpaths = JSON.stringify(shapeContent.subpaths);
    const selectedPresetId = SHAPE_PRESETS.find(
        (preset) => JSON.stringify(normalizeShapeContent(preset.content).subpaths) === serializedSubpaths
    )?.id ?? SHAPE_PRESETS[0].id;

    const handlePositionChange = (axis: 'x' | 'y', value: string) => {
        onUpdate({
            box: calculateNewBoxPosition(
                axis,
                value,
                element.box,
                spreadWidth,
                spreadHeight,
                settings.unit,
                ppi
            ),
        });
    };

    const handleSizeChange = (dimension: 'width' | 'height', value: string) => {
        onUpdate({
            box: calculateNewBoxSize(
                dimension,
                value,
                element.box,
                spreadWidth,
                spreadHeight,
                settings.unit,
                false,
                ppi
            ),
        });
    };

    const handleFillChange = (fill: string) => {
        onUpdate({
            content: {
                ...shapeContent,
                fill,
            },
        });
    };

    const handleBorderWidthChange = (value: string) => {
        const widthPt = Math.max(0, Math.min(72, parseFloat(value) || 0));
        onUpdate({
            content: {
                ...shapeContent,
                border: {
                    color: shapeBorder.color,
                    widthPt,
                },
            },
        });
    };

    const handleBorderColorChange = (value: string) => {
        onUpdate({
            content: {
                ...shapeContent,
                border: {
                    color: value,
                    widthPt: shapeBorder.widthPt,
                },
            },
        });
    };

    const handlePresetChange = (presetId: string) => {
        const preset = SHAPE_PRESETS.find((item) => item.id === presetId);
        if (!preset) return;
        const normalizedPreset = normalizeShapeContent(preset.content);
        onUpdate({
            content: {
                ...shapeContent,
                subpaths: normalizedPreset.subpaths,
                fillRule: normalizedPreset.fillRule,
            },
        });
    };

    return (
        <>
            <PropertySection title="Shape">
                <PanelPropertyRow label="Preset">
                    <select
                        className="property-select"
                        value={selectedPresetId}
                        onChange={(e) => handlePresetChange(e.target.value)}
                        data-testid="shape-preset-select"
                    >
                        {SHAPE_PRESETS.map((preset) => (
                            <option key={preset.id} value={preset.id}>{preset.label}</option>
                        ))}
                    </select>
                </PanelPropertyRow>
            </PropertySection>

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
                    <span className="property-label">Height</span>
                    <NumberInput
                        className="property-input property-size-input"
                        value={heightInUnits}
                        onChange={(val) => handleSizeChange('height', val)}
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

            <PropertySection title="Appearance">
                <PanelPropertyRow label="Fill">
                    <input
                        type="color"
                        className="property-color-input"
                        value={shapeContent.fill ?? '#000000'}
                        onChange={(e) => handleFillChange(e.target.value)}
                        data-testid="shape-fill-color-input"
                    />
                </PanelPropertyRow>
                <PanelPropertyRow label="Border (pt)">
                    <NumberInput
                        className="property-input"
                        value={shapeBorder.widthPt}
                        onChange={handleBorderWidthChange}
                        step={0.5}
                        min={0}
                        max={72}
                        precision={1}
                        data-testid="shape-border-width-input"
                    />
                </PanelPropertyRow>
                <PanelPropertyRow label="Border Color">
                    <input
                        type="color"
                        className="property-color-input"
                        value={shapeBorder.color}
                        onChange={(e) => handleBorderColorChange(e.target.value)}
                        data-testid="shape-border-color-input"
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
