import type { TemplateDefinition } from '../types';
import { fullPageImageTemplate } from './fullPageImageTemplate';
import { paddedSquareImageTemplate } from './paddedSquareImageTemplate';
import { paddedImageWithBottomLabelTemplate } from './paddedImageWithBottomLabelTemplate';
import { twoUpVerticalTemplate } from './twoUpVerticalTemplate';
import { twoStackedImageTemplate } from './twoStackedImageTemplate';
import { twoImageTopCaptionTemplate } from './twoImageTopCaptionTemplate';

export const templates: TemplateDefinition[] = [
  fullPageImageTemplate,
  paddedSquareImageTemplate,
  paddedImageWithBottomLabelTemplate,
  twoUpVerticalTemplate,
  twoStackedImageTemplate,
  twoImageTopCaptionTemplate,
];
