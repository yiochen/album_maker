import type { TemplateDefinition } from '../types';

export const twoImageTopCaptionTemplate: TemplateDefinition = {
  id: 'two-images-top-caption',
  name: 'Two Images + Caption',
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
        id: 'image-row',
        nodeType: 'branch',
        direction: 'row',
        flexGrow: 1,
        gap: { value: 0.25, unit: 'in' },
        children: [
          {
            id: 'image-left',
            nodeType: 'leaf',
            flexGrow: 1,
            content: {
              type: 'image',
              aspectRatio: 1,
              boxAlignment: 'center',
            },
          },
          {
            id: 'image-right',
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
      {
        id: 'caption',
        nodeType: 'leaf',
        fixedHeight: { value: 0.8, unit: 'in' },
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
