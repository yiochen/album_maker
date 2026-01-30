import React from 'react';
import type { Page, PageElement, AlbumSettings } from '../types';
import { percentToUnit } from '../utils/snapping';

interface PropertiesPanelProps {
    pages: Page[];  // Current spread (2 pages)
    settings: AlbumSettings;
    selectedElement: PageElement | null;
    onElementUpdate: (updates: Partial<PageElement>) => void;
    onElementDelete: () => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
    pages,
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
                        pages={pages}
                        settings={settings}
                    />
                )}
            </div>
        </aside>
    );
};

interface SpreadPropertiesProps {
    pages: Page[];
    settings: AlbumSettings;
}

const SpreadProperties: React.FC<SpreadPropertiesProps> = ({
    pages,
    settings,
}) => {
    const totalElements = pages.reduce((sum, p) => sum + p.elements.length, 0);

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
                    <span style={{ color: 'var(--color-text-primary)' }}>{totalElements}</span>
                </div>
                <div className="property-row">
                    <span className="property-label">Left Page</span>
                    <span style={{ color: 'var(--color-text-primary)' }}>
                        {pages[0]?.elements.length || 0} elements
                    </span>
                </div>
                <div className="property-row">
                    <span className="property-label">Right Page</span>
                    <span style={{ color: 'var(--color-text-primary)' }}>
                        {pages[1]?.elements.length || 0} elements
                    </span>
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
    // Calculate size in physical units
    const widthInUnits = percentToUnit(element.size.width, settings.pageWidth);
    const heightInUnits = percentToUnit(element.size.height, settings.pageHeight);

    const handlePositionChange = (axis: 'x' | 'y', value: string) => {
        const numValue = parseFloat(value) || 0;
        onUpdate({
            position: {
                ...element.position,
                [axis]: Math.max(0, Math.min(100, numValue)),
            },
            snapConstraints: undefined, // Clear snap constraints on manual edit
        });
    };

    const handleSizeChange = (dimension: 'width' | 'height', value: string) => {
        const numValue = parseFloat(value) || 0;
        let newWidth = dimension === 'width' ? numValue : element.size.width;
        let newHeight = dimension === 'height' ? numValue : element.size.height;

        // Enforce aspect ratio if locked
        if (element.lockAspectRatio && element.originalAspectRatio) {
            if (dimension === 'width') {
                newHeight = newWidth / element.originalAspectRatio;
            } else {
                newWidth = newHeight * element.originalAspectRatio;
            }
        }

        onUpdate({
            size: {
                width: Math.max(1, Math.min(100, newWidth)),
                height: Math.max(1, Math.min(100, newHeight)),
            },
        });
    };

    const handleAspectRatioToggle = () => {
        const newLocked = !element.lockAspectRatio;
        onUpdate({
            lockAspectRatio: newLocked,
            // Store current aspect ratio when locking
            originalAspectRatio: newLocked
                ? element.size.width / element.size.height
                : element.originalAspectRatio,
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
                    <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>
                        {widthInUnits.toFixed(2)} {settings.unit}
                    </span>
                </div>
                <div className="property-row">
                    <span className="property-label">Height</span>
                    <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>
                        {heightInUnits.toFixed(2)} {settings.unit}
                    </span>
                </div>
            </div>

            <div className="property-section">
                <h3 className="property-section-title">Position (%)</h3>
                <div className="property-row">
                    <span className="property-label">X</span>
                    <input
                        type="number"
                        className="property-input"
                        value={element.position.x.toFixed(1)}
                        onChange={(e) => handlePositionChange('x', e.target.value)}
                        min={0}
                        max={100}
                        step={0.5}
                    />
                </div>
                <div className="property-row">
                    <span className="property-label">Y</span>
                    <input
                        type="number"
                        className="property-input"
                        value={element.position.y.toFixed(1)}
                        onChange={(e) => handlePositionChange('y', e.target.value)}
                        min={0}
                        max={100}
                        step={0.5}
                    />
                </div>
            </div>

            <div className="property-section">
                <h3 className="property-section-title">Size (%)</h3>
                <div className="property-row">
                    <span className="property-label">Width</span>
                    <input
                        type="number"
                        className="property-input"
                        value={element.size.width.toFixed(1)}
                        onChange={(e) => handleSizeChange('width', e.target.value)}
                        min={1}
                        max={100}
                        step={0.5}
                    />
                </div>
                <div className="property-row">
                    <span className="property-label">Height</span>
                    <input
                        type="number"
                        className="property-input"
                        value={element.size.height.toFixed(1)}
                        onChange={(e) => handleSizeChange('height', e.target.value)}
                        min={1}
                        max={100}
                        step={0.5}
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
                <h3 className="property-section-title">Quick Actions</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={() => onUpdate({
                            position: { x: 0, y: 0 },
                            size: { width: 100, height: 100 },
                            snapConstraints: undefined,
                        })}
                    >
                        Fill Page
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={() => {
                            const size = Math.min(element.size.width, element.size.height);
                            onUpdate({
                                position: { x: (100 - size) / 2, y: (100 - size) / 2 },
                                size: { width: size, height: size },
                                snapConstraints: undefined,
                            });
                        }}
                    >
                        Center Square
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
