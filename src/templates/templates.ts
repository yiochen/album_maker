import type { TemplateDefinition, TemplateLeafNode, TemplateNode } from '../types';
import { fullPageImageTemplate } from './fullPageImageTemplate';
import { paddedSquareImageTemplate } from './paddedSquareImageTemplate';
import { paddedImageWithBottomLabelTemplate } from './paddedImageWithBottomLabelTemplate';
import { twoUpVerticalTemplate } from './twoUpVerticalTemplate';
import { twoStackedImageTemplate } from './twoStackedImageTemplate';
import { twoImageTopCaptionTemplate } from './twoImageTopCaptionTemplate';
import { creativeTemplates } from './creativeTemplates';

const labelExemptTemplateIds = new Set([
  fullPageImageTemplate.id,
  'one-image-full-bleed',
  'two-image-full-bleed-vertical',
  'two-image-full-bleed-horizontal',
  'three-image-full-bleed-right-stack',
  'three-image-full-bleed-wide-top',
  'four-image-full-bleed-grid',
  'four-image-full-bleed-hero-stack',
  'five-image-full-bleed-two-over-three',
  'five-image-full-bleed-hero-right',
  'six-image-full-bleed-three-over-three',
  'six-image-full-bleed-hero-right',
]);

function hasTextNode(node: TemplateNode): boolean {
  if (node.nodeType === 'leaf') {
    return node.content?.type === 'text';
  }

  return node.children.some(hasTextNode);
}

function withPlaceholderLabel(template: TemplateDefinition): TemplateDefinition {
  if (labelExemptTemplateIds.has(template.id) || hasTextNode(template.root)) {
    return template;
  }

  const labelLeaf: TemplateLeafNode = {
    id: `${template.id}-caption`,
    nodeType: 'leaf',
    fixedHeight: { value: 0.65, unit: 'in' },
    padding: {
      left: { value: 0.6, unit: 'in' },
      right: { value: 0.6, unit: 'in' },
      top: { value: 0.08, unit: 'in' },
      bottom: { value: 0.28, unit: 'in' },
    },
    content: {
      type: 'text',
      horizontalAlign: 'left',
      verticalAlign: 'center',
      text: 'Photo caption',
    },
  };

  return {
    ...template,
    root: {
      id: `${template.root.id}-labeled`,
      nodeType: 'branch',
      direction: 'column',
      children: [
        { ...template.root, flexGrow: 1 },
        labelLeaf,
      ],
    },
  };
}

const baseTemplates: TemplateDefinition[] = [
  fullPageImageTemplate,
  paddedSquareImageTemplate,
  paddedImageWithBottomLabelTemplate,
  twoUpVerticalTemplate,
  twoStackedImageTemplate,
  twoImageTopCaptionTemplate,
  ...creativeTemplates,
];

export const templates: TemplateDefinition[] = baseTemplates.map(withPlaceholderLabel);
