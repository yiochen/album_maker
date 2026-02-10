import React from 'react';
import type { Spread, PageElement, AlbumSettings } from '../types';
import { NumberInput } from './common/NumberInput';
import { LockIcon } from './icons/LockIcon';
import { UnlockIcon } from './icons/UnlockIcon';
import { ZoomInIcon } from './icons/ZoomInIcon';
import { ZoomOutIcon } from './icons/ZoomOutIcon';
import { CenterContentIcon } from './icons/CenterContentIcon';
import { FlipHorizontalIcon } from './icons/FlipHorizontalIcon';
import { FlipVerticalIcon } from './icons/FlipVerticalIcon';
import { RotateCwIcon } from './icons/RotateCwIcon';
import { RotateCcwIcon } from './icons/RotateCcwIcon';
import { MoveForwardIcon } from './icons/MoveForwardIcon';
import { MoveBackwardIcon } from './icons/MoveBackwardIcon';

/**
 * Props for the PropertiesPanel component.
 */
interface PropertiesPanelProps {
    /** The current spread being edited. */
    spread: Spread;
    /** The global album settings. */
    settings: AlbumSettings;
    /** The currently selected element (if any). */
    selectedElement: PageElement | null;
    /** The ID of the currently selected page (spread). */
    selectedPageId: string | null;
    /** Callback fired when the spread template is changed. */
    onTemplateChange: (spreadId: string, templateId: string) => void;
    /** Callback fired when an element's properties are updated. */
    onElementUpdate: (updates: Partial<PageElement>, groupId?: string) => void;
    /** Callback fired when the selected element is deleted. */
    onElementDelete: () => void;
}

/**
 * PropertiesPanel component displays context-aware properties for the current selection.
 * If an element is selected, it shows image properties (size, position, crop).
 * Otherwise, it shows general spread properties.
 */
export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
    spread,
    settings,
    selectedElement,
    onElementUpdate,
    onElementDelete,
}) => {
    return (
        <aside className="properties-panel">
            <div className="properties-header">
                <h2 className="properties-title">
                    {selectedElement ? 'Image Properties' : 'Spread Properties'}
                </h2>
            </div>

            <div className="properties-content">
                {selectedElement ? (
                    <ElementProperties
                        element={selectedElement}
                        settings={settings}
                        onUpdate={onElementUpdate}
                        onDelete={onElementDelete}
                    />
                ) : (
                    <SpreadProperties
                        spread={spread}
                        settings={settings}
                    />
                )}
            </div>
        </aside>
    );
};

interface SpreadPropertiesProps {
    spread: Spread;
    settings: AlbumSettings;
}

const SpreadProperties: React.FC<SpreadPropertiesProps> = ({
    spread,
    settings,
}) => {
    return (
        <>
            <div className="property-section">
                <h3 className="property-section-title">Spread Size</h3>
                <div className="property-row">
                    <span className="property-label">Width</span>
                    <span style={{ color: 'var(--color-text-primary)' }}>
                        {settings.pageWidth * 2} {settings.unit}
                    </span>
                </div>
                <div className="property-row">
                    <span className="property-label">Height</span>
                    <span style={{ color: 'var(--color-text-primary)' }}>
                        {settings.pageHeight} {settings.unit}
                    </span>
                </div>
            </div>

            <div className="property-section">
                <h3 className="property-section-title">Spread Info</h3>
                <div className="property-row">
                    <span className="property-label">Total Elements</span>
                    <span style={{ color: 'var(--color-text-primary)' }}>{spread.elements.length}</span>
                </div>
            </div>
        </>
    );
};

interface ElementPropertiesProps {
    element: PageElement;
    settings: AlbumSettings;
    onUpdate: (updates: Partial<PageElement>, groupId?: string) => void;
    onDelete: () => void;
}

const ElementProperties: React.FC<ElementPropertiesProps> = ({
    element,
    settings,
    onUpdate,
    onDelete,
}) => {
    const groupIdRef = React.useRef<string | null>(null);

    const handleInteractionStart = () => {
        groupIdRef.current = crypto.randomUUID();
    };

    const handleInteractionEnd = () => {
        groupIdRef.current = null;
    };
    const [zoom, setZoom] = React.useState(element.contentTransform?.zoom || 1);

    // Sync local state when element changes (e.g. via undo/redo or different selection)
    React.useEffect(() => {
        setZoom(element.contentTransform?.zoom || 1);
    }, [element.contentTransform]);

    const ppi = 300;
    const spreadWidth = settings.pageWidth * 2 * ppi;
    const spreadHeight = settings.pageHeight * ppi;

    const box = element.box;
    const currentWidthPx = (box.x2 - box.x1) * spreadWidth;
    const currentHeightPx = (box.y2 - box.y1) * spreadHeight;

    // Conversion Helper: Pixels to Units (Inch/CM)
    const pxToUnit = (px: number) => {
        const inches = px / ppi;
        if (settings.unit === 'cm') {
            return inches * 2.54;
        }
        return inches;
    };

    const unitToPx = (unitVal: number) => {
        let inches = unitVal;
        if (settings.unit === 'cm') {
            inches = unitVal / 2.54;
        }
        return inches * ppi;
    };

    const currentXPx = box.x1 * spreadWidth;
    const currentYPx = box.y1 * spreadHeight;

    const widthInUnits = pxToUnit(currentWidthPx);
    const heightInUnits = pxToUnit(currentHeightPx);
    const xInUnits = pxToUnit(currentXPx);
    const yInUnits = pxToUnit(currentYPx);

    const handlePositionChange = (axis: 'x' | 'y', value: string) => {
        const numValue = parseFloat(value) || 0;
        const pxValue = unitToPx(numValue);

        const newBox = { ...element.box };
        if (axis === 'x') {
            const width = newBox.x2 - newBox.x1;
            newBox.x1 = pxValue / spreadWidth;
            newBox.x2 = newBox.x1 + width;
        } else {
            const height = newBox.y2 - newBox.y1;
            newBox.y1 = pxValue / spreadHeight;
            newBox.y2 = newBox.y1 + height;
        }

        onUpdate({ box: newBox });
    };

    const handleSizeChange = (dimension: 'width' | 'height', value: string) => {
        const numValue = parseFloat(value) || 0;
        const newPx = Math.max(1, unitToPx(numValue));

        const newBox = { ...element.box };
        if (dimension === 'width') {
            const oldWidth = (newBox.x2 - newBox.x1) * spreadWidth;
            const oldHeight = (newBox.y2 - newBox.y1) * spreadHeight;
            newBox.x2 = newBox.x1 + (newPx / spreadWidth);

            if (element.lockAspectRatio) {
                const ratio = oldWidth / oldHeight;
                const newHeightPx = newPx / ratio;
                newBox.y2 = newBox.y1 + (newHeightPx / spreadHeight);
            }
        } else {
            const oldWidth = (newBox.x2 - newBox.x1) * spreadWidth;
            const oldHeight = (newBox.y2 - newBox.y1) * spreadHeight;
            newBox.y2 = newBox.y1 + (newPx / spreadHeight);

            if (element.lockAspectRatio) {
                const ratio = oldWidth / oldHeight;
                const newWidthPx = newPx * ratio;
                newBox.x2 = newBox.x1 + (newWidthPx / spreadWidth);
            }
        }

        onUpdate({ box: newBox });
    };

    const handleAspectRatioToggle = () => {
        onUpdate({ lockAspectRatio: !element.lockAspectRatio });
    };

    const handleTransformChange = (key: 'zoom', value: number) => {
        // Update local state immediately for smoothness
        if (key === 'zoom') setZoom(value);

        const defaults = {
            zoom: 1,
            panX: 0.5,
            panY: 0.5,
        };

        const newTransform = {
            ...defaults,
            ...(element.contentTransform || {}),
            [key]: value,
        };

        onUpdate({
            contentTransform: newTransform,
        }, groupIdRef.current || undefined);
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
                            aria-label={element.lockAspectRatio ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                            aria-pressed={element.lockAspectRatio || false}
                            title={element.lockAspectRatio ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                        >
                            {element.lockAspectRatio ? <LockIcon /> : <UnlockIcon />}
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
                <h3 className="property-section-title">SmartFrame</h3>
                <div className="property-row">
                    <span className="property-label">Zoom</span>
                    <input
                        type="range"
                        min="1"
                        max="3"
                        step="0.01"
                        value={zoom}
                        onChange={(e) => handleTransformChange('zoom', parseFloat(e.target.value))}
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            handleInteractionStart();
                        }}
                        onPointerUp={handleInteractionEnd}
                        onPointerCancel={handleInteractionEnd}
                        style={{ flex: 1 }}
                    />
                </div>
            </div>

            <div className="property-section">
                <h3 className="property-section-title">Actions</h3>
                <div className="image-action-grid">
                    <button className="image-action-button" type="button" title="Zoom in">
                        <ZoomInIcon />
                        <span>Zoom in</span>
                    </button>
                    <button className="image-action-button" type="button" title="Zoom out">
                        <ZoomOutIcon />
                        <span>Zoom out</span>
                    </button>
                    <button className="image-action-button" type="button" title="Center content">
                        <CenterContentIcon />
                        <span>Center</span>
                    </button>
                    <button className="image-action-button" type="button" title="Flip horizontal">
                        <FlipHorizontalIcon />
                        <span>Flip H</span>
                    </button>
                    <button className="image-action-button" type="button" title="Rotate 90°">
                        <RotateCwIcon />
                        <span>Rotate</span>
                    </button>
                    <button className="image-action-button" type="button" title="Rotate -90°">
                        <RotateCcwIcon />
                        <span>Rotate -</span>
                    </button>
                    <button className="image-action-button" type="button" title="Flip vertical">
                        <FlipVerticalIcon />
                        <span>Flip V</span>
                    </button>
                    <button className="image-action-button" type="button" title="Bring forward">
                        <MoveForwardIcon />
                        <span>Forward</span>
                    </button>
                    <button className="image-action-button" type="button" title="Send backward">
                        <MoveBackwardIcon />
                        <span>Backward</span>
                    </button>
                </div>
            </div>

            <div className="property-section">
                <h3 className="property-section-title">Delete</h3>
                <button
                    className="btn btn-secondary"
                    onClick={onDelete}
                    style={{ color: 'var(--color-error)' }}
                >
                    Delete Image
                </button>
            </div>
        </>
    );
};
