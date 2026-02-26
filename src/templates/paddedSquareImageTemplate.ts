import type { TemplateDefinition } from '../types';

export const paddedSquareImageTemplate: TemplateDefinition = {
  id: 'padded-square-image',
  name: 'Padded Square Image',
  pageContext: {
    defaultMargin: { value: 0, unit: 'in' },
  },
  validAspectRatio: {},
  root: {
    id: 'root',
    nodeType: 'branch',
    direction: 'row',
    padding: {
      top: { value: 1, unit: 'in' },
      right: { value: 1, unit: 'in' },
      bottom: { value: 1, unit: 'in' },
      left: { value: 1, unit: 'in' },
    },
    children: [
      {
        id: 'square-image',
        nodeType: 'leaf',
        flexGrow: 1,
        content: {
          type: 'image',
          aspectRatio: 1,
          boxAlignment: 'center',
        },
      },
    ],
  },
};
