import React, { useMemo, useState } from 'react';
import type { TemplateDefinition, Unit } from '../types';
import { TemplatePreview } from './TemplatePreview';
import { isTemplateAspectRatioValid, countTemplateImageElements } from '../services/templateLayout';

interface LayoutPickerProps {
  templates: TemplateDefinition[];
  pageAspectRatio: number;
  pageWidth: number;
  pageHeight: number;
  pageUnit: Unit;
  selectedPageElementCount: number;
  selectedPageLabel: string;
  selectedPageNumber: number;
  onApply: (template: TemplateDefinition) => void;
}

export const LayoutPicker: React.FC<LayoutPickerProps> = ({
  templates,
  pageAspectRatio,
  pageWidth,
  pageHeight,
  pageUnit,
  selectedPageElementCount,
  selectedPageLabel,
  selectedPageNumber,
  onApply,
}) => {
  const [imageCountFilter, setImageCountFilter] = useState<number | null>(null);

  const templateImageCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of templates) {
      map.set(t.id, countTemplateImageElements(t));
    }
    return map;
  }, [templates]);

  const availableCounts = useMemo(() => {
    const counts = new Set(templateImageCounts.values());
    return Array.from(counts).sort((a, b) => a - b);
  }, [templateImageCounts]);

  const filteredTemplates = useMemo(() => {
    if (imageCountFilter === null) return templates;
    return templates.filter((t) => templateImageCounts.get(t.id) === imageCountFilter);
  }, [templates, imageCountFilter, templateImageCounts]);

  return (
    <div className="layout-picker" data-testid="layout-picker">
      <div className="layout-picker-header">
        <span className="layout-picker-title">
          {selectedPageLabel} — Page {selectedPageNumber}
        </span>
      </div>

      <div className="layout-picker-filter" data-testid="layout-picker-filter">
        <button
          type="button"
          className={`layout-filter-chip ${imageCountFilter === null ? 'active' : ''}`}
          onClick={() => setImageCountFilter(null)}
          data-testid="layout-filter-all"
        >
          All
        </button>
        {availableCounts.map((count) => (
          <button
            key={count}
            type="button"
            className={`layout-filter-chip ${imageCountFilter === count ? 'active' : ''}`}
            onClick={() => setImageCountFilter(count)}
            data-testid={`layout-filter-${count}`}
          >
            {count} {count === 1 ? 'image' : 'images'}
          </button>
        ))}
      </div>

      {selectedPageElementCount > 0 && (
        <p className="layout-warning-text" data-testid="layout-warning-text">
          Warning: This page already has {selectedPageElementCount} element{selectedPageElementCount > 1 ? 's' : ''}. Applying a layout will replace them.
        </p>
      )}

      <div className="template-grid" data-testid="layout-picker-grid">
        {filteredTemplates.map((template) => {
          const isCompatible = isTemplateAspectRatioValid(template, pageAspectRatio);
          return (
            <button
              key={template.id}
              type="button"
              className="template-option"
              data-testid={`layout-option-${template.id}`}
              disabled={!isCompatible}
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
          );
        })}
      </div>
    </div>
  );
};
