import type { Alignment, PhysicalUnit, TemplateDefinition, TemplateLeafNode, TemplateNode } from '../types';

const inch = (value: number): PhysicalUnit => ({ value, unit: 'in' });

function image(id: string, aspectRatio: number | null = null, boxAlignment: Alignment = 'center'): TemplateLeafNode {
  return {
    id,
    nodeType: 'leaf',
    flexGrow: 1,
    content: {
      type: 'image',
      aspectRatio,
      boxAlignment,
    },
  };
}

function text(id: string, textValue = 'Photo caption', horizontalAlign: 'left' | 'center' | 'right' = 'left'): TemplateLeafNode {
  return {
    id,
    nodeType: 'leaf',
    content: {
      type: 'text',
      horizontalAlign,
      verticalAlign: 'center',
      text: textValue,
    },
  };
}

function spacer(id: string, flexGrow = 1): TemplateNode {
  return {
    id,
    nodeType: 'branch',
    direction: 'column',
    flexGrow,
    children: [],
  };
}

function row(
  id: string,
  children: TemplateNode[],
  options: {
    flexGrow?: number;
    gap?: number;
    padding?: { top?: number; right?: number; bottom?: number; left?: number };
    fixedHeight?: number;
  } = {}
): TemplateNode {
  return {
    id,
    nodeType: 'branch',
    direction: 'row',
    children,
    ...(options.flexGrow !== undefined ? { flexGrow: options.flexGrow } : {}),
    ...(options.gap !== undefined ? { gap: inch(options.gap) } : {}),
    ...(options.fixedHeight !== undefined ? { fixedHeight: inch(options.fixedHeight) } : {}),
    ...(options.padding ? {
      padding: {
        ...(options.padding.top !== undefined ? { top: inch(options.padding.top) } : {}),
        ...(options.padding.right !== undefined ? { right: inch(options.padding.right) } : {}),
        ...(options.padding.bottom !== undefined ? { bottom: inch(options.padding.bottom) } : {}),
        ...(options.padding.left !== undefined ? { left: inch(options.padding.left) } : {}),
      },
    } : {}),
  };
}

function column(
  id: string,
  children: TemplateNode[],
  options: {
    flexGrow?: number;
    gap?: number;
    padding?: { top?: number; right?: number; bottom?: number; left?: number };
    fixedWidth?: number;
  } = {}
): TemplateNode {
  return {
    id,
    nodeType: 'branch',
    direction: 'column',
    children,
    ...(options.flexGrow !== undefined ? { flexGrow: options.flexGrow } : {}),
    ...(options.gap !== undefined ? { gap: inch(options.gap) } : {}),
    ...(options.fixedWidth !== undefined ? { fixedWidth: inch(options.fixedWidth) } : {}),
    ...(options.padding ? {
      padding: {
        ...(options.padding.top !== undefined ? { top: inch(options.padding.top) } : {}),
        ...(options.padding.right !== undefined ? { right: inch(options.padding.right) } : {}),
        ...(options.padding.bottom !== undefined ? { bottom: inch(options.padding.bottom) } : {}),
        ...(options.padding.left !== undefined ? { left: inch(options.padding.left) } : {}),
      },
    } : {}),
  };
}

function withPadding(node: TemplateNode, padding: { top?: number; right?: number; bottom?: number; left?: number }): TemplateNode {
  return {
    ...node,
    padding: {
      ...(padding.top !== undefined ? { top: inch(padding.top) } : {}),
      ...(padding.right !== undefined ? { right: inch(padding.right) } : {}),
      ...(padding.bottom !== undefined ? { bottom: inch(padding.bottom) } : {}),
      ...(padding.left !== undefined ? { left: inch(padding.left) } : {}),
    },
  };
}

function template(id: string, name: string, root: TemplateNode): TemplateDefinition {
  return {
    id,
    name,
    pageContext: {
      defaultMargin: inch(0),
    },
    validAspectRatio: {},
    root,
  };
}

const oneImageTemplates: TemplateDefinition[] = [
  template('one-image-full-bleed', 'Full Bleed', image('hero', null)),
  template('one-image-gallery-border', 'Gallery Border', withPadding(image('hero', null), { top: 0.65, right: 0.65, bottom: 0.65, left: 0.65 })),
  template('one-image-tall-window', 'Tall Window', withPadding(image('hero', 0.72), { top: 0.45, right: 1.2, bottom: 0.45, left: 1.2 })),
  template('one-image-wide-stage', 'Wide Stage', withPadding(image('hero', 1.7), { top: 1.1, right: 0.55, bottom: 1.1, left: 0.55 })),
  template('one-image-poster-center', 'Poster Center', withPadding(image('hero', 0.8), { top: 0.6, right: 1, bottom: 0.85, left: 1 })),
  template('one-image-floating-square', 'Floating Square', withPadding(image('hero', 1), { top: 1.15, right: 0.95, bottom: 1.15, left: 0.95 })),
  template('one-image-soft-panorama', 'Soft Panorama', withPadding(image('hero', 1.5), { top: 1.35, right: 0.8, bottom: 0.9, left: 0.8 })),
  template('one-image-museum-mat', 'Museum Mat', withPadding(image('hero', 1.15), { top: 0.8, right: 0.8, bottom: 1.2, left: 0.8 })),
  template('one-image-right-tall-slice', 'Right Tall Slice', row('root', [
    column('label-rail', [
      { ...text('caption', 'Story title', 'left'), fixedHeight: inch(0.7) },
      spacer('left-spacer'),
    ], { flexGrow: 1, padding: { top: 0.45, left: 0.45, right: 0.18, bottom: 0.45 } }),
    { ...image('hero', null, 'center'), flexGrow: 3 },
  ])),
  template('one-image-left-tall-slice', 'Left Tall Slice', row('root', [
    { ...image('hero', null, 'center'), flexGrow: 3 },
    column('label-rail', [
      { ...text('caption', 'Story title', 'right'), fixedHeight: inch(0.7) },
      spacer('right-spacer'),
    ], { flexGrow: 1, padding: { top: 0.45, left: 0.18, right: 0.45, bottom: 0.45 } }),
  ])),
  template('one-image-studio-offset', 'Studio Offset', row('root', [
    { ...image('hero', 0.82), flexGrow: 0.72 },
    spacer('breathing-room', 0.28),
  ], { padding: { top: 0.55, right: 0.8, bottom: 0.55, left: 0.8 } })),
  template('one-image-editorial-still', 'Editorial Still', column('root', [
    { ...text('caption', 'Location / Date', 'left'), fixedHeight: inch(0.5) },
    row('content', [
      column('photo-wrap', [
        image('hero', 0.72),
      ], { flexGrow: 0.68 }),
      spacer('right-air', 0.32),
    ], { flexGrow: 1 }),
  ], { padding: { top: 0.35, right: 0.6, bottom: 0.45, left: 0.6 } })),
];

const twoImageTemplates: TemplateDefinition[] = [
  template('two-image-full-bleed-vertical', 'Full Bleed Vertical', row('root', [
    image('left', 0.72, 'top'),
    image('right', 0.72, 'top'),
  ], { gap: 0.03 })),
  template('two-image-full-bleed-horizontal', 'Full Bleed Horizontal', column('root', [
    image('top', 1.8, 'top'),
    image('bottom', 1.8, 'top'),
  ], { gap: 0.03 })),
  template('two-image-inset-diptych', 'Inset Diptych', withPadding(row('root', [
    image('left', 0.72),
    image('right', 0.72),
  ], { gap: 0.08 }), { top: 0.45, right: 0.45, bottom: 0.45, left: 0.45 })),
  template('two-image-stacked-bands', 'Stacked Bands', withPadding(column('root', [
    image('top', 1.85),
    image('bottom', 1.85),
  ], { gap: 0.12 }), { top: 0.35, right: 0.35, bottom: 0.35, left: 0.35 })),
  template('two-image-split-caption', 'Split Caption', row('root', [
    column('left', [
      { ...image('left', 0.72, 'top'), flexGrow: 0.7 },
      spacer('left-caption-space', 0.3),
    ], { gap: 0.14, flexGrow: 1.08 }),
    column('right', [
      { ...image('right-top', 1.2, 'top'), flexGrow: 0.7 },
      { ...text('caption', 'Photo caption', 'left'), flexGrow: 0.3 },
    ], { gap: 0.14, flexGrow: 0.92 }),
  ], { gap: 0.14, padding: { top: 0.35, right: 0.4, bottom: 0.35, left: 0.4 } })),
  template('two-image-dual-bottom-note', 'Dual Bottom Note', column('root', [
    row('images', [
      image('left', 0.9),
      image('right', 0.9),
    ], { gap: 0.12, flexGrow: 1 }),
    { ...text('caption', 'Photo caption', 'left'), fixedHeight: inch(0.9) },
  ], { gap: 0.14, padding: { top: 0.35, right: 0.4, bottom: 0.35, left: 0.4 } })),
  template('two-image-left-hero-note', 'Left Hero Note', row('root', [
    { ...image('left', 0.72), flexGrow: 1.1 },
    column('right', [
      { ...image('right-top', 1.1), flexGrow: 0.58 },
      { ...text('caption', 'Photo caption', 'left'), flexGrow: 0.42 },
    ], { gap: 0.14, flexGrow: 0.9 }),
  ], { gap: 0.14, padding: { top: 0.32, right: 0.38, bottom: 0.32, left: 0.38 } })),
  template('two-image-top-title', 'Top Title', column('root', [
    { ...text('title', 'Story title', 'left'), fixedHeight: inch(0.78) },
    row('images', [
      image('left', 0.84),
      image('right', 0.84),
    ], { gap: 0.12 }),
  ], { gap: 0.12, padding: { top: 0.28, right: 0.38, bottom: 0.38, left: 0.38 } })),
];

const threeImageTemplates: TemplateDefinition[] = [
  template('three-image-full-bleed-right-stack', 'Full Bleed Right Stack', row('root', [
    { ...image('left', 0.72, 'top'), flexGrow: 1.1 },
    column('right', [
      image('top-right', 1.25, 'top'),
      image('bottom-right', 1.25, 'top'),
    ], { gap: 0.03, flexGrow: 0.9 }),
  ], { gap: 0.03 })),
  template('three-image-full-bleed-wide-top', 'Full Bleed Wide Top', column('root', [
    { ...image('top', 1.8, 'top'), flexGrow: 1.06 },
    row('bottom', [
      image('bottom-left', 1.25, 'top'),
      image('bottom-right', 1.25, 'top'),
    ], { gap: 0.03, flexGrow: 0.94 }),
  ], { gap: 0.03 })),
  template('three-image-right-stack-hero', 'Right Stack Hero', row('root', [
    { ...image('left', 0.72, 'top'), flexGrow: 1.12 },
    column('right', [
      image('top-right', 1.25, 'top'),
      image('bottom-right', 1.25, 'top'),
    ], { gap: 0.1, flexGrow: 0.88 }),
  ], { gap: 0.1, padding: { top: 0.32, right: 0.36, bottom: 0.32, left: 0.36 } })),
  template('three-image-left-stack-hero', 'Left Stack Hero', row('root', [
    column('left', [
      image('top-left', 1.25, 'top'),
      image('bottom-left', 1.25, 'top'),
    ], { gap: 0.1, flexGrow: 0.88 }),
    { ...image('right', 0.72, 'top'), flexGrow: 1.12 },
  ], { gap: 0.1, padding: { top: 0.32, right: 0.36, bottom: 0.32, left: 0.36 } })),
  template('three-image-wide-top-trio', 'Wide Top Trio', column('root', [
    { ...image('top', 1.75, 'top'), flexGrow: 1.08 },
    row('bottom', [
      image('bottom-left', 1.35, 'top'),
      image('bottom-right', 1.35, 'top'),
    ], { gap: 0.1, flexGrow: 0.92 }),
  ], { gap: 0.1, padding: { top: 0.34, right: 0.38, bottom: 0.34, left: 0.38 } })),
  template('three-image-wide-bottom-trio', 'Wide Bottom Trio', column('root', [
    row('top', [
      image('top-left', 1.35, 'top'),
      image('top-right', 1.35, 'top'),
    ], { gap: 0.1, flexGrow: 0.92 }),
    { ...image('bottom', 1.75, 'top'), flexGrow: 1.08 },
  ], { gap: 0.1, padding: { top: 0.34, right: 0.38, bottom: 0.34, left: 0.38 } })),
  template('three-image-top-right-accent', 'Top Right Accent', row('root', [
    { ...image('left', 0.74, 'top'), flexGrow: 1.05 },
    column('right', [
      image('top-right', 1.4, 'top'),
      image('bottom-right', 0.9, 'top'),
    ], { gap: 0.1, flexGrow: 0.95 }),
  ], { gap: 0.1, padding: { top: 0.34, right: 0.38, bottom: 0.34, left: 0.38 } })),
  template('three-image-bottom-right-accent', 'Bottom Right Accent', row('root', [
    { ...image('left', 0.74, 'top'), flexGrow: 1.05 },
    column('right', [
      image('top-right', 0.9, 'top'),
      image('bottom-right', 1.4, 'top'),
    ], { gap: 0.1, flexGrow: 0.95 }),
  ], { gap: 0.1, padding: { top: 0.34, right: 0.38, bottom: 0.34, left: 0.38 } })),
  template('three-image-band-and-cards', 'Band And Cards', column('root', [
    { ...image('top', 1.9, 'top'), flexGrow: 1.05 },
    row('bottom', [
      image('bottom-left', 1.1, 'top'),
      image('bottom-right', 1.1, 'top'),
    ], { gap: 0.08, flexGrow: 0.95 }),
  ], { gap: 0.12, padding: { top: 0.36, right: 0.42, bottom: 0.36, left: 0.42 } })),
  template('three-image-vertical-ribbon', 'Vertical Ribbon', row('root', [
    { ...image('left', 0.78, 'top'), flexGrow: 1.08 },
    { ...image('middle', 0.78, 'top'), flexGrow: 0.74 },
    { ...image('right', 0.78, 'top'), flexGrow: 0.74 },
  ], { gap: 0.08, padding: { top: 0.34, right: 0.42, bottom: 0.34, left: 0.42 } })),
  template('three-image-spotlight-right', 'Spotlight Right', row('root', [
    column('left', [
      image('top-left', 1.15, 'top'),
      image('bottom-left', 1.15, 'top'),
    ], { gap: 0.1, flexGrow: 0.82 }),
    { ...image('right', 0.7, 'top'), flexGrow: 1.18 },
  ], { gap: 0.1, padding: { top: 0.3, right: 0.38, bottom: 0.3, left: 0.38 } })),
  template('three-image-spotlight-left', 'Spotlight Left', row('root', [
    { ...image('left', 0.7, 'top'), flexGrow: 1.18 },
    column('right', [
      image('top-right', 1.15, 'top'),
      image('bottom-right', 1.15, 'top'),
    ], { gap: 0.1, flexGrow: 0.82 }),
  ], { gap: 0.1, padding: { top: 0.3, right: 0.38, bottom: 0.3, left: 0.38 } })),
];

const fourImageTemplates: TemplateDefinition[] = [
  template('four-image-full-bleed-grid', 'Full Bleed Grid', column('root', [
    row('top', [image('a', 1.35, 'top'), image('b', 1.35, 'top')], { gap: 0.03 }),
    row('bottom', [image('c', 1.35, 'top'), image('d', 1.35, 'top')], { gap: 0.03 }),
  ], { gap: 0.03 })),
  template('four-image-full-bleed-hero-stack', 'Full Bleed Hero Stack', row('root', [
    { ...image('left', 0.72, 'top'), flexGrow: 1.12 },
    column('right', [
      image('top-right', 1.35, 'top'),
      image('mid-right', 1.35, 'top'),
      image('bottom-right', 1.35, 'top'),
    ], { gap: 0.03, flexGrow: 0.88 }),
  ], { gap: 0.03 })),
  template('four-image-clean-grid', 'Clean Grid', withPadding(column('root', [
    row('top', [image('a', 1.35, 'top'), image('b', 1.35, 'top')], { gap: 0.08 }),
    row('bottom', [image('c', 1.35, 'top'), image('d', 1.35, 'top')], { gap: 0.08 }),
  ], { gap: 0.08 }), { top: 0.36, right: 0.38, bottom: 0.36, left: 0.38 })),
  template('four-image-clean-grid-wide', 'Clean Grid Wide', withPadding(column('root', [
    row('top', [image('a', 1.75, 'top'), image('b', 1.75, 'top')], { gap: 0.08 }),
    row('bottom', [image('c', 1.75, 'top'), image('d', 1.75, 'top')], { gap: 0.08 }),
  ], { gap: 0.08 }), { top: 0.34, right: 0.34, bottom: 0.34, left: 0.34 })),
  template('four-image-four-up-cards', 'Four Up Cards', withPadding(column('root', [
    row('top', [image('a', 1.1, 'top'), image('b', 1.1, 'top')], { gap: 0.08 }),
    row('bottom', [image('c', 1.1, 'top'), image('d', 1.1, 'top')], { gap: 0.08 }),
  ], { gap: 0.08 }), { top: 0.44, right: 0.44, bottom: 0.44, left: 0.44 })),
  template('four-image-hero-right-stack', 'Hero Right Stack', row('root', [
    { ...image('left', 0.72, 'top'), flexGrow: 1.12 },
    column('right', [
      image('top-right', 1.35, 'top'),
      image('mid-right', 1.35, 'top'),
      image('bottom-right', 1.35, 'top'),
    ], { gap: 0.08, flexGrow: 0.88 }),
  ], { gap: 0.08, padding: { top: 0.3, right: 0.34, bottom: 0.3, left: 0.34 } })),
  template('four-image-hero-left-stack', 'Hero Left Stack', row('root', [
    column('left', [
      image('top-left', 1.35, 'top'),
      image('mid-left', 1.35, 'top'),
      image('bottom-left', 1.35, 'top'),
    ], { gap: 0.08, flexGrow: 0.88 }),
    { ...image('right', 0.72, 'top'), flexGrow: 1.12 },
  ], { gap: 0.08, padding: { top: 0.3, right: 0.34, bottom: 0.3, left: 0.34 } })),
  template('four-image-wide-top-pair-bottom', 'Wide Top Pair Bottom', column('root', [
    { ...image('top', 1.9, 'top'), flexGrow: 1.06 },
    row('bottom', [
      image('bottom-left', 1.25, 'top'),
      image('bottom-mid', 1.25, 'top'),
      image('bottom-right', 1.25, 'top'),
    ], { gap: 0.08, flexGrow: 0.94 }),
  ], { gap: 0.1, padding: { top: 0.34, right: 0.38, bottom: 0.34, left: 0.38 } })),
  template('four-image-wide-bottom-pair-top', 'Wide Bottom Pair Top', column('root', [
    row('top', [
      image('top-left', 1.25, 'top'),
      image('top-mid', 1.25, 'top'),
      image('top-right', 1.25, 'top'),
    ], { gap: 0.08, flexGrow: 0.94 }),
    { ...image('bottom', 1.9, 'top'), flexGrow: 1.06 },
  ], { gap: 0.1, padding: { top: 0.34, right: 0.38, bottom: 0.34, left: 0.38 } })),
  template('four-image-bottom-strip-right-hero', 'Bottom Strip Right Hero', column('root', [
    row('upper', [
      image('top-left', 1.5, 'top'),
      { ...image('right-hero', 0.82, 'top'), flexGrow: 1.1 },
    ], { gap: 0.08, flexGrow: 1.04 }),
    row('bottom-strip', [
      image('a', 1.1, 'top'),
      image('b', 1.1, 'top'),
      image('c', 1.1, 'top'),
    ], { gap: 0.08, flexGrow: 0.96 }),
  ], { gap: 0.08, padding: { top: 0.34, right: 0.38, bottom: 0.34, left: 0.38 } })),
  template('four-image-hero-with-caption-band', 'Hero With Caption Band', column('root', [
    row('top', [
      image('top-left', 1.2, 'top'),
      image('top-right', 1.2, 'top'),
    ], { gap: 0.08, flexGrow: 0.86 }),
    { ...text('caption', 'Photo caption', 'left'), fixedHeight: inch(0.72) },
    row('bottom', [
      image('bottom-left', 1.45, 'top'),
      image('bottom-right', 1.45, 'top'),
    ], { gap: 0.08, flexGrow: 1.14 }),
  ], { gap: 0.08, padding: { top: 0.32, right: 0.36, bottom: 0.32, left: 0.36 } })),
  template('four-image-side-note-grid', 'Side Note Grid', row('root', [
    column('left-note', [
      { ...text('caption', 'Photo caption', 'left'), fixedHeight: inch(0.86) },
      spacer('left-note-space'),
    ], { flexGrow: 0.42, padding: { top: 0.24, left: 0.08, right: 0.08, bottom: 0.24 } }),
    column('grid', [
      row('top', [image('a', 1.15, 'top'), image('b', 1.15, 'top')], { gap: 0.08 }),
      row('bottom', [image('c', 1.15, 'top'), image('d', 1.15, 'top')], { gap: 0.08 }),
    ], { gap: 0.08, flexGrow: 1.58 }),
  ], { gap: 0.1, padding: { top: 0.34, right: 0.34, bottom: 0.34, left: 0.34 } })),
];

const fiveImageTemplates: TemplateDefinition[] = [
  template('five-image-full-bleed-two-over-three', 'Full Bleed Two Over Three', column('root', [
    row('top', [image('a', 1.55, 'top'), image('b', 1.55, 'top')], { gap: 0.03, flexGrow: 0.9 }),
    row('bottom', [image('c', 1.15, 'top'), image('d', 1.15, 'top'), image('e', 1.15, 'top')], { gap: 0.03, flexGrow: 1.1 }),
  ], { gap: 0.03 })),
  template('five-image-full-bleed-hero-right', 'Full Bleed Hero Right', row('root', [
    column('left', [
      row('top-left', [image('a', 1.2, 'top'), image('b', 1.2, 'top')], { gap: 0.03 }),
      row('bottom-left', [image('c', 1.2, 'top'), image('d', 1.2, 'top')], { gap: 0.03 }),
    ], { gap: 0.03, flexGrow: 1.08 }),
    { ...image('hero', 0.74, 'top'), flexGrow: 0.92 },
  ], { gap: 0.03 })),
  template('five-image-two-over-three', 'Two Over Three', withPadding(column('root', [
    row('top', [image('a', 1.55, 'top'), image('b', 1.55, 'top')], { gap: 0.08, flexGrow: 0.9 }),
    row('bottom', [image('c', 1.15, 'top'), image('d', 1.15, 'top'), image('e', 1.15, 'top')], { gap: 0.08, flexGrow: 1.1 }),
  ], { gap: 0.08 }), { top: 0.34, right: 0.38, bottom: 0.34, left: 0.38 })),
  template('five-image-hero-right-plus-four', 'Hero Right Plus Four', row('root', [
    column('left', [
      row('top-left', [image('a', 1.2, 'top'), image('b', 1.2, 'top')], { gap: 0.08 }),
      row('bottom-left', [image('c', 1.2, 'top'), image('d', 1.2, 'top')], { gap: 0.08 }),
    ], { gap: 0.08, flexGrow: 1.08 }),
    { ...image('hero', 0.74, 'top'), flexGrow: 0.92 },
  ], { gap: 0.08, padding: { top: 0.32, right: 0.36, bottom: 0.32, left: 0.36 } })),
  template('five-image-hero-left-plus-four', 'Hero Left Plus Four', row('root', [
    { ...image('hero', 0.74, 'top'), flexGrow: 0.92 },
    column('right', [
      row('top-right', [image('a', 1.2, 'top'), image('b', 1.2, 'top')], { gap: 0.08 }),
      row('bottom-right', [image('c', 1.2, 'top'), image('d', 1.2, 'top')], { gap: 0.08 }),
    ], { gap: 0.08, flexGrow: 1.08 }),
  ], { gap: 0.08, padding: { top: 0.32, right: 0.36, bottom: 0.32, left: 0.36 } })),
  template('five-image-top-strip-bottom-pair', 'Top Strip Bottom Pair', column('root', [
    row('top', [image('a', 1.1, 'top'), image('b', 1.1, 'top'), image('c', 1.1, 'top')], { gap: 0.08, flexGrow: 0.72 }),
    row('bottom', [image('d', 1.7, 'top'), image('e', 1.7, 'top')], { gap: 0.08, flexGrow: 1.28 }),
  ], { gap: 0.08, padding: { top: 0.34, right: 0.38, bottom: 0.34, left: 0.38 } })),
  template('five-image-top-pair-bottom-strip', 'Top Pair Bottom Strip', column('root', [
    row('top', [image('a', 1.7, 'top'), image('b', 1.7, 'top')], { gap: 0.08, flexGrow: 1.02 }),
    row('bottom', [image('c', 1.05, 'top'), image('d', 1.05, 'top'), image('e', 1.05, 'top')], { gap: 0.08, flexGrow: 0.98 }),
  ], { gap: 0.08, padding: { top: 0.34, right: 0.38, bottom: 0.34, left: 0.38 } })),
  template('five-image-hero-left-sidebar', 'Hero Left Sidebar', row('root', [
    { ...image('hero', 0.72, 'top'), flexGrow: 1.18 },
    column('right', [
      row('mini-top', [image('a', 1.35, 'top'), image('b', 1.35, 'top')], { gap: 0.08, flexGrow: 0.55 }),
      image('c', 1.25, 'top'),
      image('d', 1.25, 'top'),
    ], { gap: 0.08, flexGrow: 0.82 }),
  ], { gap: 0.08, padding: { top: 0.3, right: 0.34, bottom: 0.3, left: 0.34 } })),
  template('five-image-hero-right-sidebar', 'Hero Right Sidebar', row('root', [
    column('left', [
      row('mini-top', [image('a', 1.35, 'top'), image('b', 1.35, 'top')], { gap: 0.08, flexGrow: 0.55 }),
      image('c', 1.25, 'top'),
      image('d', 1.25, 'top'),
    ], { gap: 0.08, flexGrow: 0.82 }),
    { ...image('hero', 0.72, 'top'), flexGrow: 1.18 },
  ], { gap: 0.08, padding: { top: 0.3, right: 0.34, bottom: 0.3, left: 0.34 } })),
  template('five-image-hero-top-right-stack', 'Hero Top Right Stack', row('root', [
    column('left', [
      { ...image('hero', 1.65, 'top'), flexGrow: 1.08 },
      row('bottom-strip', [image('c', 1.1, 'top'), image('d', 1.1, 'top')], { gap: 0.08, flexGrow: 0.92 }),
    ], { gap: 0.08, flexGrow: 1.08 }),
    column('right', [
      image('a', 1.35, 'top'),
      image('b', 1.35, 'top'),
      image('e', 1.35, 'top'),
    ], { gap: 0.08, flexGrow: 0.92 }),
  ], { gap: 0.08, padding: { top: 0.32, right: 0.36, bottom: 0.32, left: 0.36 } })),
  template('five-image-offset-band', 'Offset Band', column('root', [
    row('top', [
      image('a', 1.45, 'top'),
      image('b', 1.45, 'top'),
    ], { gap: 0.08, flexGrow: 0.8, padding: { right: 0.85 } }),
    row('bottom', [
      image('c', 1.05, 'top'),
      image('d', 1.05, 'top'),
      image('e', 1.05, 'top'),
    ], { gap: 0.08, flexGrow: 1.2 }),
  ], { gap: 0.08, padding: { top: 0.34, right: 0.38, bottom: 0.34, left: 0.38 } })),
  template('five-image-hero-with-caption-strip', 'Hero With Caption Strip', column('root', [
    row('top', [
      { ...image('hero-left', 1.65, 'top'), flexGrow: 1.12 },
      column('right', [
        image('a', 1.35, 'top'),
        image('b', 1.35, 'top'),
      ], { gap: 0.08, flexGrow: 0.88 }),
    ], { gap: 0.08, flexGrow: 1.02 }),
    { ...text('caption', 'Photo caption', 'left'), fixedHeight: inch(0.68) },
    row('bottom', [image('c', 1.1, 'top'), image('d', 1.1, 'top')], { gap: 0.08, flexGrow: 0.9 }),
  ], { gap: 0.08, padding: { top: 0.3, right: 0.34, bottom: 0.3, left: 0.34 } })),
];

const sixImageTemplates: TemplateDefinition[] = [
  template('six-image-full-bleed-three-over-three', 'Full Bleed Three Over Three', column('root', [
    row('top', [image('a', 1.1, 'top'), image('b', 1.1, 'top'), image('c', 1.1, 'top')], { gap: 0.03 }),
    row('bottom', [image('d', 1.1, 'top'), image('e', 1.1, 'top'), image('f', 1.1, 'top')], { gap: 0.03 }),
  ], { gap: 0.03 })),
  template('six-image-full-bleed-hero-right', 'Full Bleed Hero Right', row('root', [
    column('left', [
      { ...image('hero', 0.72, 'top'), flexGrow: 1.08 },
      row('bottom-strip', [image('d', 1.05, 'top'), image('e', 1.05, 'top'), image('f', 1.05, 'top')], { gap: 0.03, flexGrow: 0.92 }),
    ], { gap: 0.03, flexGrow: 1.08 }),
    column('right', [
      row('top-right', [image('a', 1.25, 'top'), image('b', 1.25, 'top')], { gap: 0.03, flexGrow: 0.5 }),
      image('c', 1.25, 'top'),
    ], { gap: 0.03, flexGrow: 0.92 }),
  ], { gap: 0.03 })),
  template('six-image-three-over-three', 'Three Over Three', withPadding(column('root', [
    row('top', [image('a', 1.1, 'top'), image('b', 1.1, 'top'), image('c', 1.1, 'top')], { gap: 0.08 }),
    row('bottom', [image('d', 1.1, 'top'), image('e', 1.1, 'top'), image('f', 1.1, 'top')], { gap: 0.08 }),
  ], { gap: 0.08 }), { top: 0.34, right: 0.38, bottom: 0.34, left: 0.38 })),
  template('six-image-hero-right-five', 'Hero Right Five', row('root', [
    column('left', [
      { ...image('hero', 0.72, 'top'), flexGrow: 1.08 },
      row('bottom-strip', [image('d', 1.05, 'top'), image('e', 1.05, 'top'), image('f', 1.05, 'top')], { gap: 0.08, flexGrow: 0.92 }),
    ], { gap: 0.08, flexGrow: 1.08 }),
    column('right', [
      row('top-right', [image('a', 1.25, 'top'), image('b', 1.25, 'top')], { gap: 0.08, flexGrow: 0.5 }),
      image('c', 1.25, 'top'),
    ], { gap: 0.08, flexGrow: 0.92 }),
  ], { gap: 0.08, padding: { top: 0.3, right: 0.34, bottom: 0.3, left: 0.34 } })),
  template('six-image-hero-left-five', 'Hero Left Five', row('root', [
    column('left', [
      row('top-left', [image('a', 1.25, 'top'), image('b', 1.25, 'top')], { gap: 0.08, flexGrow: 0.5 }),
      image('c', 1.25, 'top'),
    ], { gap: 0.08, flexGrow: 0.92 }),
    column('right', [
      { ...image('hero', 0.72, 'top'), flexGrow: 1.08 },
      row('bottom-strip', [image('d', 1.05, 'top'), image('e', 1.05, 'top'), image('f', 1.05, 'top')], { gap: 0.08, flexGrow: 0.92 }),
    ], { gap: 0.08, flexGrow: 1.08 }),
  ], { gap: 0.08, padding: { top: 0.3, right: 0.34, bottom: 0.3, left: 0.34 } })),
  template('six-image-top-strip-plus-grid', 'Top Strip Plus Grid', column('root', [
    row('top', [image('a', 1.05, 'top'), image('b', 1.05, 'top'), image('c', 1.05, 'top')], { gap: 0.08, flexGrow: 0.62 }),
    row('middle', [image('hero-left', 1.55, 'top'), image('hero-right', 1.55, 'top')], { gap: 0.08, flexGrow: 1.04 }),
    row('bottom', [image('d', 1.05, 'top'), image('e', 1.05, 'top'), image('f', 1.05, 'top')], { gap: 0.08, flexGrow: 0.84 }),
  ], { gap: 0.08, padding: { top: 0.34, right: 0.38, bottom: 0.34, left: 0.38 } })),
  template('six-image-sidebar-grid-right', 'Sidebar Grid Right', row('root', [
    { ...image('hero-left', 0.76, 'top'), flexGrow: 1.08 },
    column('right', [
      row('top-right', [image('a', 1.3, 'top'), image('b', 1.3, 'top')], { gap: 0.08, flexGrow: 0.44 }),
      image('c', 1.15, 'top'),
      image('d', 1.15, 'top'),
      row('bottom-right', [image('e', 1.3, 'top'), image('f', 1.3, 'top')], { gap: 0.08, flexGrow: 0.44 }),
    ], { gap: 0.08, flexGrow: 0.92 }),
  ], { gap: 0.08, padding: { top: 0.3, right: 0.34, bottom: 0.3, left: 0.34 } })),
  template('six-image-sidebar-grid-left', 'Sidebar Grid Left', row('root', [
    column('left', [
      row('top-left', [image('a', 1.3, 'top'), image('b', 1.3, 'top')], { gap: 0.08, flexGrow: 0.44 }),
      image('c', 1.15, 'top'),
      image('d', 1.15, 'top'),
      row('bottom-left', [image('e', 1.3, 'top'), image('f', 1.3, 'top')], { gap: 0.08, flexGrow: 0.44 }),
    ], { gap: 0.08, flexGrow: 0.92 }),
    { ...image('hero-right', 0.76, 'top'), flexGrow: 1.08 },
  ], { gap: 0.08, padding: { top: 0.3, right: 0.34, bottom: 0.3, left: 0.34 } })),
  template('six-image-offset-two-three-one', 'Offset Two Three One', column('root', [
    row('top', [image('a', 1.35, 'top'), image('b', 1.35, 'top')], { gap: 0.08, flexGrow: 0.7, padding: { right: 0.95 } }),
    row('middle', [image('c', 1.05, 'top'), image('d', 1.05, 'top'), image('e', 1.05, 'top')], { gap: 0.08, flexGrow: 0.9 }),
    row('bottom', [image('hero', 1.9, 'top')], { flexGrow: 1.1 }),
  ], { gap: 0.08, padding: { top: 0.34, right: 0.38, bottom: 0.34, left: 0.38 } })),
  template('six-image-hero-with-two-columns', 'Hero With Two Columns', row('root', [
    column('left', [
      { ...image('hero', 0.72, 'top'), flexGrow: 1.08 },
      row('bottom-left', [image('d', 1.2, 'top'), image('e', 1.2, 'top')], { gap: 0.08, flexGrow: 0.92 }),
    ], { gap: 0.08, flexGrow: 1.05 }),
    column('right', [
      row('top-right', [image('a', 1.2, 'top'), image('b', 1.2, 'top')], { gap: 0.08 }),
      row('mid-right', [image('c', 1.2, 'top')], { padding: { right: 0.7 } }),
      row('bottom-right', [image('f', 1.2, 'top')], { padding: { left: 0.7 } }),
    ], { gap: 0.08, flexGrow: 0.95 }),
  ], { gap: 0.08, padding: { top: 0.3, right: 0.34, bottom: 0.3, left: 0.34 } })),
  template('six-image-caption-grid', 'Caption Grid', column('root', [
    row('top', [image('a', 1.15, 'top'), image('b', 1.15, 'top')], { gap: 0.08, flexGrow: 0.64, padding: { right: 1.1 } }),
    { ...text('caption', 'Photo caption', 'left'), fixedHeight: inch(0.68) },
    row('bottom', [image('c', 1.05, 'top'), image('d', 1.05, 'top'), image('e', 1.05, 'top')], { gap: 0.08, flexGrow: 0.72 }),
    row('footer', [image('f', 1.55, 'top')], { flexGrow: 0.96 }),
  ], { gap: 0.08, padding: { top: 0.32, right: 0.36, bottom: 0.32, left: 0.36 } })),
  template('six-image-bottom-heavy-grid', 'Bottom Heavy Grid', column('root', [
    row('top', [image('a', 1.55, 'top'), image('b', 1.55, 'top')], { gap: 0.08, flexGrow: 0.78 }),
    row('middle', [image('c', 1.05, 'top'), image('d', 1.05, 'top'), image('e', 1.05, 'top')], { gap: 0.08, flexGrow: 0.66 }),
    row('bottom', [image('hero-left', 1.55, 'top'), image('hero-right', 1.55, 'top')], { gap: 0.08, flexGrow: 1.12 }),
  ], { gap: 0.08, padding: { top: 0.34, right: 0.38, bottom: 0.34, left: 0.38 } })),
];

export const creativeTemplates: TemplateDefinition[] = [
  ...oneImageTemplates,
  ...twoImageTemplates,
  ...threeImageTemplates,
  ...fourImageTemplates,
  ...fiveImageTemplates,
  ...sixImageTemplates,
];
