import type { TemplateDefinition } from '../types';
import { fullPageImageTemplate } from './fullPageImageTemplate';
import { paddedSquareImageTemplate } from './paddedSquareImageTemplate';
import { paddedImageWithBottomLabelTemplate } from './paddedImageWithBottomLabelTemplate';

export const templates: TemplateDefinition[] = [
  fullPageImageTemplate,
  paddedSquareImageTemplate,
  paddedImageWithBottomLabelTemplate,
];
