import type { TemplateDefinition } from '../types';

export const twoStackedImageTemplate: TemplateDefinition = {
  id: 'two-stacked-images',
  name: 'Two Stacked Images',
  pageContext: {
    defaultMargin: { value: 0, unit: 'in' },
  },
  validAspectRatio: {},
  root: {
    id: 'root',
    nodeType: 'branch',
    direction: 'column',
    padding: {
      top: { value: 0.5, unit: 'in' },
      right: { value: 0.75, unit: 'in' },
      bottom: { value: 0.5, unit: 'in' },
      left: { value: 0.75, unit: 'in' },
    },
    gap: { value: 0.25, unit: 'in' },
    children: [
      {
        id: 'top-image',
        nodeType: 'leaf',
        flexGrow: 1,
        content: {
          type: 'image',
          aspectRatio: null,
          boxAlignment: 'center',
        },
      },
      {
        id: 'bottom-image',
        nodeType: 'leaf',
        flexGrow: 1,
        content: {
          type: 'image',
          aspectRatio: null,
          boxAlignment: 'center',
        },
      },
    ],
  },
};
