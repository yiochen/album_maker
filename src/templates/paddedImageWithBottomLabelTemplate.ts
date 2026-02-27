import type { TemplateDefinition } from '../types';

export const paddedImageWithBottomLabelTemplate: TemplateDefinition = {
  id: 'padded-image-bottom-label',
  name: 'Padded Image + Bottom Label',
  pageContext: {
    defaultMargin: { value: 0, unit: 'in' },
  },
  validAspectRatio: {},
  root: {
    id: 'root',
    nodeType: 'branch',
    direction: 'column',
    padding: {
      top: { value: 1, unit: 'in' },
      right: { value: 1, unit: 'in' },
      left: { value: 1, unit: 'in' },
    },
    children: [
      {
        id: 'main-image',
        nodeType: 'leaf',
        flexGrow: 1,
        content: {
          type: 'image',
          aspectRatio: null,
          boxAlignment: 'center',
        },
      },
      {
        id: 'bottom-label',
        nodeType: 'leaf',
        fixedHeight: { value: 1, unit: 'in' },
        content: {
          type: 'text',
          horizontalAlign: 'center',
          verticalAlign: 'center',
          text: 'Photo caption',
        },
      },
    ],
  },
};
