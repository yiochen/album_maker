import React from 'react';
import type { PageElement, AlbumSettings } from '../../types';
import { useAlbumImagePool } from '../../states/albumStore';
import { applyRotate90, applyFlipH, applyFlipV, CONTENT_TRANSFORM_DEFAULTS } from '../../utils/orientationMatrix';
import {
    pxToUnit,
    calculateNewBoxPosition,
    calculateNewBoxSize,
    calculateNewZoomTransform
} from '../../utils/propertyUtils';
import { PropertySection } from '../common/PropertySection';
import { PanelPropertyRow } from '../common/PanelPropertyRow';
import { PanelActionButton } from '../common/PanelActionButton';
import { NumberInput } from '../common/NumberInput';
import { LockIcon } from '../icons/LockIcon';
import { UnlockIcon } from '../icons/UnlockIcon';
import { ZoomInIcon } from '../icons/ZoomInIcon';
import { ZoomOutIcon } from '../icons/ZoomOutIcon';
import { CenterContentIcon } from '../icons/CenterContentIcon';
import { FlipHorizontalIcon } from '../icons/FlipHorizontalIcon';
import { FlipVerticalIcon } from '../icons/FlipVerticalIcon';
import { RotateCwIcon } from '../icons/RotateCwIcon';
import { MoveForwardIcon } from '../icons/MoveForwardIcon';
import { MoveBackwardIcon } from '../icons/MoveBackwardIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { APP_CONFIG } from '../../config';

interface ElementPropertiesProps {
    element: PageElement;
    settings: AlbumSettings;
    onUpdate: (updates: Partial<PageElement>, groupId?: string) => void;
    onDelete: () => void;
    canBringForward: boolean;
    canSendBackward: boolean;
    onBringForward: () => void;
    onSendBackward: () => void;
}

export const ElementProperties: React.FC<ElementPropertiesProps> = ({
    element,
    settings,
    onUpdate,
    onDelete,
    canBringForward,
    canSendBackward,
    onBringForward,
    onSendBackward,
}) => {
    const currentZoom = element.content.contentTransform?.zoom ?? 1;

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
            axis,
            value,
            element.box,
            spreadWidth,
            spreadHeight,
            settings.unit,
            ppi
        );
        onUpdate({ box: newBox });
    };

    const handleSizeChange = (dimension: 'width' | 'height', value: string) => {
        const newBox = calculateNewBoxSize(
            dimension,
            value,
            element.box,
            spreadWidth,
            spreadHeight,
            settings.unit,
            element.content.lockAspectRatio,
            ppi
        );
        onUpdate({ box: newBox });
    };

    const handleAspectRatioToggle = () => {
        onUpdate({ content: { ...element.content, lockAspectRatio: !element.content.lockAspectRatio } });
    };

    const pool = useAlbumImagePool();
    const sourceImage = pool.find(img =>
        img.sourceId === element.content.sourceId &&
        img.sourceImageId === element.content.sourceImageId
    );

    const handleZoomChange = (value: number) => {
        const newTransform = calculateNewZoomTransform(
            value,
            element.content.contentTransform,
            currentWidthPx,
            currentHeightPx,
            sourceImage?.width,
            sourceImage?.height
        );

        onUpdate({
            content: { ...element.content, contentTransform: newTransform },
        });
    };

    const handleCenterContent = () => {
        const defaults = {
            zoom: 1,
            panX: 0.5,
            panY: 0.5,
        };

        onUpdate({
            content: {
                ...element.content,
                contentTransform: {
                    ...defaults,
                    ...(element.content.contentTransform || {}),
                    panX: 0.5,
                    panY: 0.5,
                },
            },
        });
    };

    const handleRotate90 = () => {
        const ct = element.content.contentTransform ?? CONTENT_TRANSFORM_DEFAULTS;
        const newCt = applyRotate90(ct);
        onUpdate({ content: { ...element.content, contentTransform: newCt } });
    };

    const handleFlipH = () => {
        const ct = element.content.contentTransform ?? CONTENT_TRANSFORM_DEFAULTS;
        const newCt = applyFlipH(ct);
        onUpdate({ content: { ...element.content, contentTransform: newCt } });
    };

    const handleFlipV = () => {
        const ct = element.content.contentTransform ?? CONTENT_TRANSFORM_DEFAULTS;
        const newCt = applyFlipV(ct);
        onUpdate({ content: { ...element.content, contentTransform: newCt } });
    };

    return (
        <>
            <PropertySection title={`Size (${settings.unit})`}>
                <div className="property-size-grid">
                    <span className="property-label">Width</span>
                    <div className="aspect-lock-cell">
                        <button
                            type="button"
                            className="aspect-lock-button"
                            onClick={handleAspectRatioToggle}
                            aria-label={element.content.lockAspectRatio ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                            aria-pressed={element.content.lockAspectRatio || false}
                            title={element.content.lockAspectRatio ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                        >
                            {element.content.lockAspectRatio ? <LockIcon /> : <UnlockIcon />}
                        </button>
                    </div>
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

            <PropertySection title="Actions">
                <div className="image-action-grid">
                    <PanelActionButton
                        title="Zoom in"
                        onClick={() => handleZoomChange(currentZoom + 0.1)}
                        disabled={currentZoom >= 3}
                        icon={<ZoomInIcon />}
                        label="Zoom in"
                    />
                    <PanelActionButton
                        title="Zoom out"
                        onClick={() => handleZoomChange(currentZoom - 0.1)}
                        disabled={currentZoom <= 1}
                        icon={<ZoomOutIcon />}
                        label="Zoom out"
                    />
                    <PanelActionButton
                        title="Center content"
                        onClick={handleCenterContent}
                        icon={<CenterContentIcon />}
                        label="Center content"
                    />
                    <PanelActionButton
                        title="Flip horizontal"
                        onClick={handleFlipH}
                        icon={<FlipHorizontalIcon />}
                        label="Flip horizontal"
                    />
                    <PanelActionButton
                        title="Flip vertical"
                        onClick={handleFlipV}
                        icon={<FlipVerticalIcon />}
                        label="Flip vertical"
                    />
                    <PanelActionButton
                        title="Rotate 90°"
                        onClick={handleRotate90}
                        icon={<RotateCwIcon />}
                        label="Rotate 90°"
                    />
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
