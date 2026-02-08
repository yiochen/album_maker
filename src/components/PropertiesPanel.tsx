import React from 'react';
import type { Spread, PageElement, AlbumSettings } from '../types';
import { APP_CONFIG } from '../config';

interface PropertiesPanelProps {
    spread: Spread;
    settings: AlbumSettings;
    selectedElement: PageElement | null;
    selectedPageId: string | null;
    onTemplateChange: (spreadId: string, templateId: string) => void;
    onElementUpdate: (spreadId: string, elementId: string, updates: Partial<PageElement>) => void;
    onElementDelete: (spreadId: string, elementId: string) => void;
}

const PPI = APP_CONFIG.PPI;

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
    spread,
    settings,
    selectedElement,
    onElementUpdate,
    onElementDelete,
}) => {
    // Wrapper to simplify update call
    const handleUpdate = (updates: Partial<PageElement>) => {
        if (selectedElement) {
            onElementUpdate(spread.id, selectedElement.id, updates);
        }
    };

    const handleDelete = () => {
        if (selectedElement) {
            onElementDelete(spread.id, selectedElement.id);
        }
    };

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
                        onUpdate={handleUpdate}
                        onDelete={handleDelete}
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
    // Helper to get dimensions in pixels regardless of storage format
    const getDims = () => {
        if (element.box) {
            const spreadWidth = settings.pageWidth * 2 * PPI;
            const spreadHeight = settings.pageHeight * PPI;

            const w = (element.box.x2 - element.box.x1) * spreadWidth;
            const h = (element.box.y2 - element.box.y1) * spreadHeight;
            const x = ((element.box.x1 + element.box.x2) / 2) * spreadWidth;
            const y = ((element.box.y1 + element.box.y2) / 2) * spreadHeight;
            return { x, y, width: w, height: h };
        }
        return {
            x: element.position?.x ?? 0,
            y: element.position?.y ?? 0,
            width: element.size?.width ?? 0,
            height: element.size?.height ?? 0
        };
    };

    const dims = getDims();

    // Conversion Helper: Pixels to Units (Inch/CM)
    const pxToUnit = (px: number) => {
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

    const widthInUnits = pxToUnit(dims.width);
    const heightInUnits = pxToUnit(dims.height);
    const xInUnits = pxToUnit(dims.x);
    const yInUnits = pxToUnit(dims.y);

    const handlePositionChange = (axis: 'x' | 'y', value: string) => {
        const numValue = parseFloat(value) || 0;
        const newPx = unitToPx(numValue);

        if (element.box) {
            const spreadWidth = settings.pageWidth * 2 * PPI;
            const spreadHeight = settings.pageHeight * PPI;

            const currentW = (element.box.x2 - element.box.x1) * spreadWidth;
            const currentH = (element.box.y2 - element.box.y1) * spreadHeight;

            // New Center Position
            const newCenterX = axis === 'x' ? newPx : dims.x;
            const newCenterY = axis === 'y' ? newPx : dims.y;

            // Recalculate box
            const x1 = (newCenterX - currentW / 2) / spreadWidth;
            const y1 = (newCenterY - currentH / 2) / spreadHeight;
            const x2 = (newCenterX + currentW / 2) / spreadWidth;
            const y2 = (newCenterY + currentH / 2) / spreadHeight;

            onUpdate({
                box: {
                    x1: Math.max(0, Math.min(1, x1)),
                    y1: Math.max(0, Math.min(1, y1)),
                    x2: Math.max(0, Math.min(1, x2)),
                    y2: Math.max(0, Math.min(1, y2))
                }
            });
        } else {
            // Legacy
            onUpdate({
                position: {
                    x: axis === 'x' ? newPx : (element.position?.x ?? 0),
                    y: axis === 'y' ? newPx : (element.position?.y ?? 0),
                }
            });
        }
    };

    const handleSizeChange = (dimension: 'width' | 'height', value: string) => {
        const numValue = parseFloat(value) || 0;
        let newPx = unitToPx(numValue);
        newPx = Math.max(1, newPx); // Safety 1px min

        let newWidth = dimension === 'width' ? newPx : dims.width;
        let newHeight = dimension === 'height' ? newPx : dims.height;

        // Enforce aspect ratio if locked
        if (element.lockAspectRatio) {
            const currentRatio = dims.width / dims.height;
            if (dimension === 'width') {
                newHeight = newWidth / currentRatio;
            } else {
                newWidth = newHeight * currentRatio;
            }
        }

        if (element.box) {
             const spreadWidth = settings.pageWidth * 2 * PPI;
             const spreadHeight = settings.pageHeight * PPI;

             // Keep Center Fixed
             const centerX = dims.x;
             const centerY = dims.y;

             const x1 = (centerX - newWidth / 2) / spreadWidth;
             const y1 = (centerY - newHeight / 2) / spreadHeight;
             const x2 = (centerX + newWidth / 2) / spreadWidth;
             const y2 = (centerY + newHeight / 2) / spreadHeight;

             onUpdate({
                box: {
                    x1: Math.max(0, Math.min(1, x1)),
                    y1: Math.max(0, Math.min(1, y1)),
                    x2: Math.max(0, Math.min(1, x2)),
                    y2: Math.max(0, Math.min(1, y2))
                }
            });
        } else {
            onUpdate({
                size: {
                    width: newWidth,
                    height: newHeight,
                },
            });
        }
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
