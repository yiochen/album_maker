/**
 * TextElementProperties — Properties panel for text elements.
 *
 * Shows position/size controls (shared with images via propertyUtils)
 * and text-specific settings: default font, size, color, alignment.
 * Z-order and delete actions are also included.
 */
import React, { useCallback } from 'react';
import type { PageElement, AlbumSettings, TextContent, TextStyle } from '../../types';
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
    /**
     * Update a default style property and propagate to React state.
     */
    const updateDefaultStyle = useCallback((updates: Partial<TextStyle>) => {
        if (!isTextElement(element)) return;
        const newContent: TextContent = {
            ...element.content,
            defaultStyle: { ...element.content.defaultStyle, ...updates },
        };
        onUpdate({ content: newContent });
    }, [element, onUpdate]);

    const handleAlignmentChange = useCallback((align: TextContent['textAlign']) => {
        if (!isTextElement(element)) return;
        onUpdate({
            content: { ...element.content, textAlign: align },
        });
    }, [element, onUpdate]);

    if (!isTextElement(element)) return null;

    const textContent = element.content;
    const defaultStyle = textContent.defaultStyle;
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

    const handlePositionChange = (axis: 'x' | 'y', value: string) => {
        const newBox = calculateNewBoxPosition(
            axis, value, element.box, spreadWidth, spreadHeight, settings.unit, ppi
        );
        onUpdate({ box: newBox });
    };

    const handleSizeChange = (dimension: 'width' | 'height', value: string) => {
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

            <PropertySection title="Text Style">
                <PanelPropertyRow label="Font">
                    <input
                        className="property-input"
                        type="text"
                        value={defaultStyle.fontFamily}
                        onChange={(e) => updateDefaultStyle({ fontFamily: e.target.value })}
                        data-testid="text-font-input"
                    />
                </PanelPropertyRow>
                <PanelPropertyRow label="Size (pt)">
                    <NumberInput
                        className="property-input"
                        value={defaultStyle.fontSize}
                        onChange={(val) => updateDefaultStyle({ fontSize: parseFloat(val) || defaultStyle.fontSize })}
                        step={1}
                        immediate={true}
                        data-testid="text-size-input"
                    />
                </PanelPropertyRow>
                <PanelPropertyRow label="Color">
                    <input
                        type="color"
                        className="text-toolbar-color"
                        value={defaultStyle.fill}
                        onChange={(e) => updateDefaultStyle({ fill: e.target.value })}
                        data-testid="text-color-panel-input"
                    />
                </PanelPropertyRow>
                <PanelPropertyRow label="Align">
                    <div className="text-align-buttons" data-testid="text-align-buttons">
                        {(['left', 'center', 'right'] as const).map((align) => (
                            <button
                                key={align}
                                className={`text-toolbar-btn ${textContent.textAlign === align ? 'active' : ''}`}
                                onClick={() => handleAlignmentChange(align)}
                                title={`Align ${align}`}
                                data-testid={`text-align-${align}`}
                            >
                                {align === 'left' ? '⫷' : align === 'center' ? '☰' : '⫸'}
                            </button>
                        ))}
                    </div>
                </PanelPropertyRow>
            </PropertySection>

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
