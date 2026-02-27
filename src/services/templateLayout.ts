import type {
  AlbumSettings,
  PageElement,
  TemplateContent,
  TemplateDefinition,
  TemplateLeafNode,
  TemplateNode,
  TemplateTextStyle,
  PhysicalUnit,
} from '../types';

interface LayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface LayoutLeaf {
  node: TemplateLeafNode;
  rect: LayoutRect;
}

type PageSide = 'left' | 'right';

function toInches(unit: PhysicalUnit): number {
  return unit.unit === 'mm' ? unit.value / 25.4 : unit.value;
}

function albumLengthToInches(value: number, unit: AlbumSettings['unit']): number {
  return unit === 'cm' ? value / 2.54 : value;
}

function toPt(style?: TemplateTextStyle): number {
  if (!style?.fontSize) return 24;
  return toInches(style.fontSize) * 72;
}

function isNodeInSide(node: PageElement, side: PageSide): boolean {
  if (side === 'left') return node.box.x1 >= 0 && node.box.x2 <= 0.5;
  return node.box.x1 >= 0.5 && node.box.x2 <= 1;
}

function insetRect(rect: LayoutRect, node: TemplateNode): LayoutRect {
  const top = node.padding?.top ? toInches(node.padding.top) : 0;
  const right = node.padding?.right ? toInches(node.padding.right) : 0;
  const bottom = node.padding?.bottom ? toInches(node.padding.bottom) : 0;
  const left = node.padding?.left ? toInches(node.padding.left) : 0;

  const width = Math.max(0, rect.width - left - right);
  const height = Math.max(0, rect.height - top - bottom);
  return {
    x: rect.x + left,
    y: rect.y + top,
    width,
    height,
  };
}

function collectLeafLayouts(node: TemplateNode, rect: LayoutRect, out: LayoutLeaf[]): void {
  const innerRect = insetRect(rect, node);
  if (node.nodeType === 'leaf') {
    out.push({ node, rect: innerRect });
    return;
  }

  const children = node.children;
  if (children.length === 0) return;

  const gap = node.gap ? toInches(node.gap) : 0;
  const mainSize = node.direction === 'row' ? innerRect.width : innerRect.height;
  const crossSize = node.direction === 'row' ? innerRect.height : innerRect.width;
  const totalGap = gap * Math.max(0, children.length - 1);
  const availableMain = Math.max(0, mainSize - totalGap);

  let fixedMainSum = 0;
  for (const child of children) {
    const fixedMain =
      node.direction === 'row'
        ? child.fixedWidth ? toInches(child.fixedWidth) : undefined
        : child.fixedHeight ? toInches(child.fixedHeight) : undefined;
    if (fixedMain !== undefined) fixedMainSum += fixedMain;
  }

  const remainingMain = Math.max(0, availableMain - fixedMainSum);
  let flexSum = 0;
  for (const child of children) {
    const fixedMain =
      node.direction === 'row'
        ? child.fixedWidth ? toInches(child.fixedWidth) : undefined
        : child.fixedHeight ? toInches(child.fixedHeight) : undefined;
    if (fixedMain === undefined) flexSum += child.flexGrow ?? 1;
  }
  const safeFlexSum = flexSum > 0 ? flexSum : 1;

  let cursor = 0;
  for (const child of children) {
    const fixedMain =
      node.direction === 'row'
        ? child.fixedWidth ? toInches(child.fixedWidth) : undefined
        : child.fixedHeight ? toInches(child.fixedHeight) : undefined;
    const main = fixedMain ?? (remainingMain * ((child.flexGrow ?? 1) / safeFlexSum));

    const fixedCross =
      node.direction === 'row'
        ? child.fixedHeight ? toInches(child.fixedHeight) : undefined
        : child.fixedWidth ? toInches(child.fixedWidth) : undefined;
    const cross = Math.min(crossSize, fixedCross ?? crossSize);

    const childRect: LayoutRect = node.direction === 'row'
      ? {
        x: innerRect.x + cursor,
        y: innerRect.y,
        width: Math.max(0, main),
        height: Math.max(0, cross),
      }
      : {
        x: innerRect.x,
        y: innerRect.y + cursor,
        width: Math.max(0, cross),
        height: Math.max(0, main),
      };

    collectLeafLayouts(child, childRect, out);
    cursor += Math.max(0, main) + gap;
  }
}

function templateContentToElement(
  content: TemplateContent | null,
  leafRect: LayoutRect,
  pageWidthInches: number,
  pageHeightInches: number,
  side: PageSide
): PageElement | null {
  const x1Page = leafRect.x / pageWidthInches;
  const y1 = leafRect.y / pageHeightInches;
  const x2Page = (leafRect.x + leafRect.width) / pageWidthInches;
  const y2 = (leafRect.y + leafRect.height) / pageHeightInches;

  const xOffset = side === 'left' ? 0 : 0.5;
  const x1 = xOffset + (x1Page * 0.5);
  const x2 = xOffset + (x2Page * 0.5);

  if (content === null || content.type === 'image') {
    const aspectRatio = content?.aspectRatio ?? null;
    const imageSrc = content?.imageSrc;
    const isPlaceholder = !imageSrc;
    return {
      id: crypto.randomUUID(),
      type: 'image',
      content: {
        fullUrl: imageSrc ?? '',
        previewUrl: imageSrc ?? '',
        thumbnailUrl: imageSrc ?? '',
        sourceId: isPlaceholder ? 'placeholder' : 'template',
        sourceImageId: isPlaceholder ? `placeholder-${Date.now()}-${crypto.randomUUID()}` : `template-${crypto.randomUUID()}`,
        contentTransform: {
          zoom: 1,
          panX: 0.5,
          panY: 0.5,
        },
        originalAspectRatio: aspectRatio ?? 1,
        lockAspectRatio: aspectRatio !== null,
        isPlaceholder,
      },
      box: { x1, y1, x2, y2 },
    };
  }

  return {
    id: crypto.randomUUID(),
    type: 'text',
    content: {
      runs: [{ text: '' }],
      defaultStyle: {
        fontFamily: content.style?.fontFamily ?? 'Inter, sans-serif',
        fontSize: toPt(content.style),
        fontWeight: content.style?.fontWeight ?? 'normal',
        fontStyle: content.style?.fontStyle ?? 'normal',
        fill: content.style?.color ?? '#000000',
        underline: content.style?.underline ?? false,
      },
      placeholderText: content.text ?? 'Text',
      textAlign: content.horizontalAlign,
      lineHeight: 1.2,
    },
    box: { x1, y1, x2, y2 },
  };
}

export function isTemplateAspectRatioValid(template: TemplateDefinition, pageAspectRatio: number): boolean {
  if (template.validAspectRatio.min !== undefined && pageAspectRatio < template.validAspectRatio.min) return false;
  if (template.validAspectRatio.max !== undefined && pageAspectRatio > template.validAspectRatio.max) return false;
  return true;
}

export function applyTemplateToSpreadSide(
  spreadElements: PageElement[],
  template: TemplateDefinition,
  settings: AlbumSettings,
  side: PageSide
): PageElement[] {
  const pageWidthInches = albumLengthToInches(settings.pageWidth, settings.unit);
  const pageHeightInches = albumLengthToInches(settings.pageHeight, settings.unit);
  const margin = toInches(template.pageContext.defaultMargin);

  const rootRect: LayoutRect = {
    x: margin,
    y: margin,
    width: Math.max(0, pageWidthInches - margin * 2),
    height: Math.max(0, pageHeightInches - margin * 2),
  };

  const leafLayouts: LayoutLeaf[] = [];
  collectLeafLayouts(template.root, rootRect, leafLayouts);

  const generated = leafLayouts
    .map(({ node, rect }) => templateContentToElement(node.content, rect, pageWidthInches, pageHeightInches, side))
    .filter((el): el is PageElement => el !== null);

  const retained = spreadElements.filter(el => !isNodeInSide(el, side));
  return [...retained, ...generated];
}
