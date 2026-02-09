import React from 'react';
import type { Spread, PageElement, AlbumSettings } from '../types';
import { useAlbumImagePool } from '../states/albumStore';
import { applyCoverTransform } from '../utils/imageUtils';
import { NumberInput } from './common/NumberInput';

interface PropertiesPanelProps {
    spread: Spread;
    settings: AlbumSettings;
    selectedElement: PageElement | null;
    selectedPageId: string | null;
    onTemplateChange: (spreadId: string, templateId: string) => void;
    onElementUpdate: (updates: Partial<PageElement>, groupId?: string) => void;
    onElementDelete: () => void;
}

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
    const [panX, setPanX] = React.useState(element.contentTransform?.panX ?? 0.5);
    const [panY, setPanY] = React.useState(element.contentTransform?.panY ?? 0.5);

    // Sync local state when element changes (e.g. via undo/redo or different selection)
    React.useEffect(() => {
        setZoom(element.contentTransform?.zoom || 1);
        setPanX(element.contentTransform?.panX ?? 0.5);
        setPanY(element.contentTransform?.panY ?? 0.5);
    }, [element.contentTransform]);

    const ppi = 300;
    const spreadWidth = settings.pageWidth * 2 * ppi;
    const spreadHeight = settings.pageHeight * ppi;

    // Get original image dimensions from image pool
    const pool = useAlbumImagePool();
    const sourceImage = pool.find(img =>
        img.sourceId === element.sourceId &&
        img.sourceImageId === element.sourceImageId
    );

    const box = element.box;
    const currentWidthPx = (box.x2 - box.x1) * spreadWidth;
    const currentHeightPx = (box.y2 - box.y1) * spreadHeight;

    // Calculate coverage info
    const coverage = sourceImage?.width && sourceImage?.height ? applyCoverTransform(
        currentWidthPx,
        currentHeightPx,
        sourceImage.width,
        sourceImage.height,
        element.contentTransform
    ) : null;

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

    const handleAspectRatioToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        onUpdate({ lockAspectRatio: e.target.checked });
    };

    const handleTransformChange = (key: 'zoom' | 'panX' | 'panY', value: number) => {
        // Update local state immediately for smoothness
        if (key === 'zoom') setZoom(value);
        if (key === 'panX') setPanX(value);
        if (key === 'panY') setPanY(value);

        const newTransform = {
            zoom: 1,
            panX: 0.5,
            panY: 0.5,
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
                <div className="property-row">
                    <span className="property-label">Width</span>
                    <NumberInput
                        className="property-input"
                        value={widthInUnits}
                        onChange={(val) => handleSizeChange('width', val)}
                        step={0.1}
                        immediate={true}
                    />
                </div>
                <div className="property-row">
                    <span className="property-label">Height</span>
                    <NumberInput
                        className="property-input"
                        value={heightInUnits}
                        onChange={(val) => handleSizeChange('height', val)}
                        step={0.1}
                        immediate={true}
                    />
                </div>

                {/* Aspect Ratio Lock Toggle */}
                <label className="property-checkbox" style={{ marginTop: 'var(--space-2)' }}>
                    <input
                        type="checkbox"
                        checked={element.lockAspectRatio || false}
                        onChange={handleAspectRatioToggle}
                    />
                    <span>Lock aspect ratio</span>
                </label>
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
                <div className="property-row" style={{ opacity: coverage?.canPanX ? 1 : 0.5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: 'var(--space-1)' }}>
                        <span className="property-label">Pan X</span>
                        {coverage?.canPanX && (
                            <span className="text-muted" style={{ fontSize: 'var(--font-xs)' }}>
                                {pxToUnit(coverage.overflowWidth).toFixed(1)} {settings.unit} overflow
                            </span>
                        )}
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.005"
                        value={panX}
                        disabled={!coverage?.canPanX}
                        onChange={(e) => handleTransformChange('panX', parseFloat(e.target.value))}
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            handleInteractionStart();
                        }}
                        onPointerUp={handleInteractionEnd}
                        onPointerCancel={handleInteractionEnd}
                        style={{ flex: 1 }}
                    />
                </div>
                <div className="property-row" style={{ opacity: coverage?.canPanY ? 1 : 0.5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: 'var(--space-1)' }}>
                        <span className="property-label">Pan Y</span>
                        {coverage?.canPanY && (
                            <span className="text-muted" style={{ fontSize: 'var(--font-xs)' }}>
                                {pxToUnit(coverage.overflowHeight).toFixed(1)} {settings.unit} overflow
                            </span>
                        )}
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.005"
                        value={panY}
                        disabled={!coverage?.canPanY}
                        onChange={(e) => handleTransformChange('panY', parseFloat(e.target.value))}
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            handleInteractionStart();
                        }}
                        onPointerUp={handleInteractionEnd}
                        onPointerCancel={handleInteractionEnd}
                        style={{ flex: 1 }}
                    />
                </div>
                {!coverage?.canPanX && !coverage?.canPanY && (
                    <div className="text-muted" style={{ fontSize: 'var(--font-xs)', marginTop: 'var(--space-1)', textAlign: 'center' }}>
                        Image fits perfectly - no room to pan.
                    </div>
                )}
            </div>

            <div className="property-section">
                <h3 className="property-section-title">Quick Actions</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={() => {
                            setPanX(0.5);
                            setPanY(0.5);
                            onUpdate({
                                contentTransform: {
                                    ...(element.contentTransform || { zoom: 1 }),
                                    panX: 0.5,
                                    panY: 0.5,
                                }
                            });
                        }}
                    >
                        Center Content
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={onDelete}
                        style={{ color: 'var(--color-error)' }}
                    >
                        Delete Image
                    </button>
                </div>
            </div>
        </>
    );
};
