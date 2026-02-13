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

    const ppi = 300; // Ideally use APP_CONFIG.PPI or pass it, but utils use default.
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
            <div className="property-section">
                <h3 className="property-section-title">
                    Size ({settings.unit})
                </h3>
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
            </div>

            <div className="property-section">
                <h3 className="property-section-title">Position ({settings.unit})</h3>
                <div className="property-row">
                    <span className="property-label">X</span>
                    <NumberInput
                        className="property-input"
                        value={xInUnits}
                        onChange={(val) => handlePositionChange('x', val)}
                        step={0.1}
                        immediate={true}
                    />
                </div>
                <div className="property-row">
                    <span className="property-label">Y</span>
                    <NumberInput
                        className="property-input"
                        value={yInUnits}
                        onChange={(val) => handlePositionChange('y', val)}
                        step={0.1}
                        immediate={true}
                    />
                </div>
            </div>

            <div className="property-section">
                <h3 className="property-section-title">Actions</h3>
                <div className="image-action-grid">
                    <button
                        className="image-action-button"
                        type="button"
                        title="Zoom in"
                        onClick={() => handleZoomChange(currentZoom + 0.1)}
                        disabled={currentZoom >= 3}
                    >
                        <ZoomInIcon />
                        <span>Zoom in</span>
                    </button>
                    <button
                        className="image-action-button"
                        type="button"
                        title="Zoom out"
                        onClick={() => handleZoomChange(currentZoom - 0.1)}
                        disabled={currentZoom <= 1}
                    >
                        <ZoomOutIcon />
                        <span>Zoom out</span>
                    </button>
                    <button
                        className="image-action-button"
                        type="button"
                        title="Center content"
                        onClick={handleCenterContent}
                    >
                        <CenterContentIcon />
                        <span>Center content</span>
                    </button>
                    <button className="image-action-button" type="button" title="Flip horizontal" onClick={handleFlipH}>
                        <FlipHorizontalIcon />
                        <span>Flip horizontal</span>
                    </button>
                    <button className="image-action-button" type="button" title="Flip vertical" onClick={handleFlipV}>
                        <FlipVerticalIcon />
                        <span>Flip vertical</span>
                    </button>
                    <button className="image-action-button" type="button" title="Rotate 90°" onClick={handleRotate90}>
                        <RotateCwIcon />
                        <span>Rotate 90°</span>
                    </button>
                    <button
                        className="image-action-button"
                        type="button"
                        title="Bring forward"
                        disabled={!canBringForward}
                        onClick={onBringForward}
                    >
                        <MoveForwardIcon />
                        <span>Bring forward</span>
                    </button>
                    <button
                        className="image-action-button"
                        type="button"
                        title="Send backward"
                        disabled={!canSendBackward}
                        onClick={onSendBackward}
                    >
                        <MoveBackwardIcon />
                        <span>Send backward</span>
                    </button>
                    <button
                        className="image-action-button image-action-delete"
                        type="button"
                        title="Delete"
                        onClick={onDelete}
                    >
                        <TrashIcon style={{ color: 'var(--color-error, #e53935)' }} />
                        <span>Delete</span>
                    </button>
                </div>
            </div>
        </>
    );
};
