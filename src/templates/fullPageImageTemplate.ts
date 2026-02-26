import type { TemplateDefinition } from '../types';

export const fullPageImageTemplate: TemplateDefinition = {
  id: 'full-page-image',
  name: 'Full Page Image',
  pageContext: {
    defaultMargin: { value: 0, unit: 'in' },
  },
  validAspectRatio: {},
  root: {
    id: 'root',
    nodeType: 'leaf',
    content: {
      type: 'image',
      aspectRatio: null,
      boxAlignment: 'center',
    },
  },
};
