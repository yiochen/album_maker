import React, { useMemo } from 'react';
import type { TemplateDefinition, Unit } from '../types';
import { TemplatePreview } from './TemplatePreview';
import { countTemplateImageElements, isTemplateAspectRatioValid } from '../services/templateLayout';

interface SelectedImageTemplatePanelProps {
    templates: TemplateDefinition[];
    selectedCount: number;
    pageAspectRatio: number;
    pageWidth: number;
    pageHeight: number;
    pageUnit: Unit;
    selectedPageElementCount: number;
    selectedPageLabel: string;
    selectedPageNumber: number;
    onApply: (template: TemplateDefinition) => void;
}

export const SelectedImageTemplatePanel: React.FC<SelectedImageTemplatePanelProps> = ({
    templates,
    selectedCount,
    pageAspectRatio,
    pageWidth,
    pageHeight,
    pageUnit,
    selectedPageElementCount,
    selectedPageLabel,
    selectedPageNumber,
    onApply,
}) => {
    const filteredTemplates = useMemo(() => (
        templates.filter((template) => (
            countTemplateImageElements(template) === selectedCount &&
            isTemplateAspectRatioValid(template, pageAspectRatio)
        ))
    ), [templates, selectedCount, pageAspectRatio]);

    const title = selectedCount === 1
        ? 'Use Selected Image'
        : `Use ${selectedCount} Selected Images`;

    return (
        <div className="selected-image-template-panel" data-testid="selected-image-template-panel">
            <div className="layout-picker-header">
                <span className="layout-picker-title">{title}</span>
            </div>

            <div className="selected-image-template-context">
                {selectedPageLabel} — Page {selectedPageNumber}
            </div>

            {selectedPageElementCount > 0 && (
                <p className="layout-warning-text" data-testid="selected-image-layout-warning-text">
                    Warning: This page already has {selectedPageElementCount} element{selectedPageElementCount > 1 ? 's' : ''}. Applying a layout will replace them.
                </p>
            )}

            {filteredTemplates.length === 0 ? (
                <div className="selected-image-template-empty" data-testid="selected-image-template-empty">
                    No templates available for exactly {selectedCount} image{selectedCount === 1 ? '' : 's'}.
                </div>
            ) : (
                <div className="selected-image-template-grid" data-testid="selected-image-template-grid">
                    {filteredTemplates.map((template) => (
                        <button
                            key={template.id}
                            type="button"
                            className="template-option"
                            data-testid={`selected-image-layout-option-${template.id}`}
                            onClick={() => onApply(template)}
                        >
                            <TemplatePreview
                                template={template}
                                pageAspectRatio={pageAspectRatio}
                                pageWidth={pageWidth}
                                pageHeight={pageHeight}
                                pageUnit={pageUnit}
                                maxWidth={120}
                                maxHeight={80}
                            />
                            <span className="template-name">{template.name}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
