import React from 'react';
import { Page, PageElement, TemplateId } from '../types';
import { getTemplateList, getTemplate } from '../templates/pageTemplates';

interface PropertiesPanelProps {
    page: Page;
    selectedElement: PageElement | null;
    onTemplateChange: (templateId: TemplateId) => void;
    onElementUpdate: (updates: Partial<PageElement>) => void;
    onElementDelete: () => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
    page,
    selectedElement,
    onTemplateChange,
    onElementUpdate,
    onElementDelete,
}) => {
    const templates = getTemplateList();
    const currentTemplate = getTemplate(page.templateId);

    return (
        <aside className="properties-panel">
            <div className="properties-header">
                <h2 className="properties-title">
                    {selectedElement ? 'Image Properties' : 'Page Properties'}
                </h2>
            </div>

            <div className="properties-content">
                {selectedElement ? (
                    <ElementProperties
                        element={selectedElement}
                        onUpdate={onElementUpdate}
                        onDelete={onElementDelete}
                    />
                ) : (
                    <PageProperties
                        page={page}
                        templates={templates}
                        currentTemplate={currentTemplate}
                        onTemplateChange={onTemplateChange}
                    />
                )}
            </div>
        </aside>
    );
};

interface PagePropertiesProps {
    page: Page;
    templates: ReturnType<typeof getTemplateList>;
    currentTemplate: ReturnType<typeof getTemplate>;
    onTemplateChange: (templateId: TemplateId) => void;
}

const PageProperties: React.FC<PagePropertiesProps> = ({
    page,
    templates,
    currentTemplate,
    onTemplateChange,
}) => {
    return (
        <>
            <div className="property-section">
                <h3 className="property-section-title">Template</h3>
                <div className="template-grid">
                    {templates.map(template => (
                        <button
                            key={template.id}
                            className={`template-option ${template.id === page.templateId ? 'active' : ''}`}
                            onClick={() => onTemplateChange(template.id)}
                            title={template.description}
                        >
                            <div className="template-preview" style={getTemplatePreviewStyle(template.id)} />
                            <span className="template-name">{template.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="property-section">
                <h3 className="property-section-title">Export Size</h3>
                <div className="property-row">
                    <span className="property-label">Width</span>
                    <span style={{ color: 'var(--color-text-primary)' }}>{currentTemplate.exportWidth}px</span>
                </div>
                <div className="property-row">
                    <span className="property-label">Height</span>
                    <span style={{ color: 'var(--color-text-primary)' }}>{currentTemplate.exportHeight}px</span>
                </div>
            </div>

            <div className="property-section">
                <h3 className="property-section-title">Page Info</h3>
                <div className="property-row">
                    <span className="property-label">Elements</span>
                    <span style={{ color: 'var(--color-text-primary)' }}>{page.elements.length}</span>
                </div>
            </div>
        </>
    );
};

interface ElementPropertiesProps {
    element: PageElement;
    onUpdate: (updates: Partial<PageElement>) => void;
    onDelete: () => void;
}

const ElementProperties: React.FC<ElementPropertiesProps> = ({
    element,
    onUpdate,
    onDelete,
}) => {
    const handlePositionChange = (axis: 'x' | 'y', value: string) => {
        const numValue = parseFloat(value) || 0;
        onUpdate({
            position: {
                ...element.position,
                [axis]: Math.max(0, Math.min(100, numValue)),
            },
        });
    };

    const handleSizeChange = (dimension: 'width' | 'height', value: string) => {
        const numValue = parseFloat(value) || 0;
        onUpdate({
            size: {
                ...element.size,
                [dimension]: Math.max(1, Math.min(100, numValue)),
            },
        });
    };

    return (
        <>
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
            </div>

            <div className="property-section">
                <h3 className="property-section-title">Quick Actions</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={() => onUpdate({ position: { x: 0, y: 0 }, size: { width: 100, height: 100 } })}
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
                            });
                        }}
                    >
                        Center Square
                    </button>
                    <button className="btn btn-secondary" onClick={onDelete} style={{ color: 'var(--color-error)' }}>
                        Delete Image
                    </button>
                </div>
            </div>
        </>
    );
};

// Get preview style for template thumbnails
const getTemplatePreviewStyle = (templateId: TemplateId): React.CSSProperties => {
    const styles: Record<TemplateId, React.CSSProperties> = {
        'fullpage': { width: '100%', height: '100%' },
        'square-center': { width: '70%', height: '70%', aspectRatio: '1' },
        'portrait': { width: '60%', height: '80%' },
        'landscape': { width: '80%', height: '60%' },
        'polaroid': { width: '70%', height: '55%', marginBottom: '15%' },
        'grid-2x2': {
            background: 'repeating-linear-gradient(to right, var(--color-bg-tertiary) 0%, var(--color-bg-tertiary) 48%, transparent 48%, transparent 52%, var(--color-bg-tertiary) 52%, var(--color-bg-tertiary) 100%), repeating-linear-gradient(to bottom, var(--color-bg-tertiary) 0%, var(--color-bg-tertiary) 48%, transparent 48%, transparent 52%, var(--color-bg-tertiary) 52%, var(--color-bg-tertiary) 100%)',
            width: '80%',
            height: '80%',
        },
        'grid-1-2': { width: '80%', height: '80%' },
    };
    return styles[templateId] || {};
};
