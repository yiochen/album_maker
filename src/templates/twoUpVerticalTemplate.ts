import type { TemplateDefinition } from '../types';

export const twoUpVerticalTemplate: TemplateDefinition = {
  id: 'two-up-vertical',
  name: 'Two-Up Vertical',
  pageContext: {
    defaultMargin: { value: 0, unit: 'in' },
  },
  validAspectRatio: {},
  root: {
    id: 'root',
    nodeType: 'branch',
    direction: 'row',
    padding: {
      top: { value: 0.5, unit: 'in' },
      right: { value: 0.5, unit: 'in' },
      bottom: { value: 0.5, unit: 'in' },
      left: { value: 0.5, unit: 'in' },
    },
    gap: { value: 0.25, unit: 'in' },
    children: [
      {
        id: 'left-image',
        nodeType: 'leaf',
        flexGrow: 1,
        content: {
          type: 'image',
          aspectRatio: null,
          boxAlignment: 'center',
        },
      },
      {
        id: 'right-image',
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
