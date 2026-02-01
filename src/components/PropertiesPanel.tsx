import React from 'react';
import type { Spread, PageElement, AlbumSettings } from '../types';

interface PropertiesPanelProps {
    spread: Spread; // Still need this or derive it?
    settings: AlbumSettings;
    selectedElement: PageElement | null;
    selectedPageId: string | null;
    onTemplateChange: (spreadId: string, templateId: string) => void;
    onElementUpdate: (updates: Partial<PageElement>) => void;
    onElementDelete: () => void;
}

const PPI = 300;

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
    spread,
    settings,
    selectedElement,
    // selectedPageId,
    // onTemplateChange,
    onElementUpdate,
    onElementDelete,
}) => {
    // If we wanted to go full store, we would select `selectedElement` here using IDs from UI store.
    // But AlbumEditor already did that and passed it.
    // I'll stick to props for the "passed down" data to avoid duplicate logic,
    // but the `onElementUpdate` and `onElementDelete` could be replaced by store actions
    // IF we knew the spreadId and elementId.
    // We do know them from `selectedElement` and `selectedPageId`.

    // For now, I'll keep the props as the main refactor was prop drilling in AlbumEditor (which we solved by using stores there).
    // The previous step refactored AlbumEditor to use stores.
    // This file seems fine to stay as a presentational component mostly.

    // Actually, I can use store logic inside `ElementProperties`.

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
    onUpdate: (updates: Partial<PageElement>) => void;
    onDelete: () => void;
}

const ElementProperties: React.FC<ElementPropertiesProps> = ({
    element,
    settings,
    onUpdate,
    onDelete,
}) => {
    // Conversion Helper: Pixels to Units (Inch/CM)
    const pxToUnit = (px: number) => {
        // We assume settings.unit is 'inch' for now.
        // Even if 'cm', we normally base strictly on PPI=300 unless we have conversion logic.
        // settings.pageWidth is in 'settings.unit'.
        // Canvas pixel scale is 300 PPI.

        const inches = px / PPI;
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
        return inches * PPI;
    };

    const widthInUnits = pxToUnit(element.size.width);
    const heightInUnits = pxToUnit(element.size.height);
    const xInUnits = pxToUnit(element.position.x);
    const yInUnits = pxToUnit(element.position.y);

    const handlePositionChange = (axis: 'x' | 'y', value: string) => {
        const numValue = parseFloat(value) || 0;
        const pxValue = unitToPx(numValue);
        onUpdate({
            position: {
                ...element.position,
                [axis]: pxValue,
            },
            snapConstraints: undefined,
        });
    };

    const handleSizeChange = (dimension: 'width' | 'height', value: string) => {
        const numValue = parseFloat(value) || 0;
        let newPx = unitToPx(numValue);
        newPx = Math.max(1, newPx); // Safety 1px min

        let newWidth = dimension === 'width' ? newPx : element.size.width;
        let newHeight = dimension === 'height' ? newPx : element.size.height;

        // Enforce aspect ratio if locked
        if (element.lockAspectRatio) {
            const currentRatio = element.size.width / element.size.height;
            if (dimension === 'width') {
                newHeight = newWidth / currentRatio;
            } else {
                // Height changed
                newWidth = newHeight * currentRatio;
            }
        }

        onUpdate({
            size: {
                width: newWidth,
                height: newHeight,
            },
        });
    };

    const handleAspectRatioToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newLocked = e.target.checked;
        onUpdate({
            lockAspectRatio: newLocked,
        });
    };

    return (
        <>
            <div className="property-section">
                <h3 className="property-section-title">
                    Size ({settings.unit})
                </h3>
                <div className="property-row">
                    <span className="property-label">Width</span>
                    <input
                        type="number"
                        className="property-input"
                        value={widthInUnits.toFixed(2)}
                        onChange={(e) => handleSizeChange('width', e.target.value)}
                        step={0.1}
                    />
                </div>
                <div className="property-row">
                    <span className="property-label">Height</span>
                    <input
                        type="number"
                        className="property-input"
                        value={heightInUnits.toFixed(2)}
                        onChange={(e) => handleSizeChange('height', e.target.value)}
                        step={0.1}
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
                    <input
                        type="number"
                        className="property-input"
                        value={xInUnits.toFixed(2)}
                        onChange={(e) => handlePositionChange('x', e.target.value)}
                        step={0.1}
                    />
                </div>
                <div className="property-row">
                    <span className="property-label">Y</span>
                    <input
                        type="number"
                        className="property-input"
                        value={yInUnits.toFixed(2)}
                        onChange={(e) => handlePositionChange('y', e.target.value)}
                        step={0.1}
                    />
                </div>
            </div>

            <div className="property-section">
                <h3 className="property-section-title">Quick Actions</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={() => {
                            // Center in spread
                            const spreadWidthPx = settings.pageWidth * 2 * PPI;
                            const spreadHeightPx = settings.pageHeight * PPI;

                            const x = (spreadWidthPx - element.size.width) / 2;
                            const y = (spreadHeightPx - element.size.height) / 2;

                            onUpdate({
                                position: { x, y },
                                snapConstraints: undefined,
                            });
                        }}
                    >
                        Center on Spread
                    </button>
                    {element.originalAspectRatio && (
                        <button
                            className="btn btn-secondary"
                            onClick={() => {
                                // Reset to "reasonable" size (e.g. 50% of page width)
                                const spreadWidthPx = settings.pageWidth * 2 * PPI;
                                const targetWidth = spreadWidthPx * 0.25; // Quarter spread width?
                                const targetHeight = targetWidth / element.originalAspectRatio!;
                                onUpdate({
                                    size: { width: targetWidth, height: targetHeight },
                                    snapConstraints: undefined,
                                });
                            }}
                        >
                            Reset Image Size
                        </button>
                    )}
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
