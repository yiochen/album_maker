import React, { useMemo } from 'react';
import type {
  PhysicalUnit,
  PhysicalPadding,
  TemplateDefinition,
  TemplateLeafNode,
  TemplateNode,
  Unit,
} from '../types';

interface LayoutRect {
  width: number;
  height: number;
}

interface TemplatePreviewProps {
  template: TemplateDefinition;
  pageAspectRatio: number;
  pageWidth: number;
  pageHeight: number;
  pageUnit: Unit;
  maxWidth?: number;
  maxHeight?: number;
}

function toInches(length: PhysicalUnit): number {
  return length.unit === 'mm' ? length.value / 25.4 : length.value;
}

function albumUnitToInches(value: number, unit: Unit): number {
  return unit === 'cm' ? value / 2.54 : value;
}

function paddingToPx(padding: PhysicalPadding | undefined, scale: number): React.CSSProperties {
  return {
    paddingTop: padding?.top ? toInches(padding.top) * scale : 0,
    paddingRight: padding?.right ? toInches(padding.right) * scale : 0,
    paddingBottom: padding?.bottom ? toInches(padding.bottom) * scale : 0,
    paddingLeft: padding?.left ? toInches(padding.left) * scale : 0,
  };
}

function insetRectByPadding(rect: LayoutRect, node: TemplateNode): LayoutRect {
  const top = node.padding?.top ? toInches(node.padding.top) : 0;
  const right = node.padding?.right ? toInches(node.padding.right) : 0;
  const bottom = node.padding?.bottom ? toInches(node.padding.bottom) : 0;
  const left = node.padding?.left ? toInches(node.padding.left) : 0;
  return {
    width: Math.max(0, rect.width - left - right),
    height: Math.max(0, rect.height - top - bottom),
  };
}

function resolveLeafContent(leaf: TemplateLeafNode, leafRect: LayoutRect): React.ReactNode {
  const content = leaf.content;
  if (!content || content.type === 'image') {
    const ratio = content?.aspectRatio ?? null;
    let imageStyle: React.CSSProperties = { width: '100%', height: '100%' };
    if (typeof ratio === 'number' && Number.isFinite(ratio) && ratio > 0) {
      const leafRatio = leafRect.width > 0 && leafRect.height > 0
        ? leafRect.width / leafRect.height
        : 1;
      if (leafRatio >= ratio) {
        imageStyle = {
          height: '100%',
          maxWidth: '100%',
          aspectRatio: `${ratio}`,
        };
      } else {
        imageStyle = {
          width: '100%',
          maxHeight: '100%',
          aspectRatio: `${ratio}`,
        };
      }
    }

    const boxAlignment = content?.boxAlignment ?? 'center';
    const justifyContent =
      boxAlignment === 'left' ? 'flex-start' :
        boxAlignment === 'right' ? 'flex-end' :
          'center';
    const alignItems =
      boxAlignment === 'top' ? 'flex-start' :
        boxAlignment === 'bottom' ? 'flex-end' :
          'center';

    return (
      <div className="template-preview-leaf-shell" style={{ justifyContent, alignItems }}>
        <div className="template-preview-leaf-image" style={imageStyle} />
      </div>
    );
  }

  return (
    <div className="template-preview-leaf-shell">
      <div className="template-preview-leaf-text" />
    </div>
  );
}

function renderNode(node: TemplateNode, scale: number, key: string, rect: LayoutRect): React.ReactNode {
  const innerRect = insetRectByPadding(rect, node);
  const baseStyle: React.CSSProperties = {
    minWidth: 0,
    minHeight: 0,
    boxSizing: 'border-box',
    flexShrink: 1,
    flexGrow: node.flexGrow ?? (node.fixedWidth || node.fixedHeight ? 0 : 1),
    ...paddingToPx(node.padding, scale),
  };

  if (!node.fixedWidth && !node.fixedHeight) {
    baseStyle.flexBasis = 0;
  }
  if (node.fixedWidth) {
    baseStyle.width = `${toInches(node.fixedWidth) * scale}px`;
  }
  if (node.fixedHeight) {
    baseStyle.height = `${toInches(node.fixedHeight) * scale}px`;
  }

  if (node.nodeType === 'branch') {
    const children = node.children;
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

    return (
      <div
        key={key}
        className="template-preview-node template-preview-branch"
        style={{
          ...baseStyle,
          display: 'flex',
          flexDirection: node.direction,
          gap: node.gap ? `${toInches(node.gap) * scale}px` : 0,
        }}
      >
        {children.map((child, index) => {
          const fixedMain =
            node.direction === 'row'
              ? child.fixedWidth ? toInches(child.fixedWidth) : undefined
              : child.fixedHeight ? toInches(child.fixedHeight) : undefined;
          const childMain = fixedMain ?? (remainingMain * ((child.flexGrow ?? 1) / safeFlexSum));

          const fixedCross =
            node.direction === 'row'
              ? child.fixedHeight ? toInches(child.fixedHeight) : undefined
              : child.fixedWidth ? toInches(child.fixedWidth) : undefined;
          const childCross = Math.min(crossSize, fixedCross ?? crossSize);

          const childRect: LayoutRect = node.direction === 'row'
            ? { width: Math.max(0, childMain), height: Math.max(0, childCross) }
            : { width: Math.max(0, childCross), height: Math.max(0, childMain) };

          return renderNode(child, scale, `${key}-${index}`, childRect);
        })}
      </div>
    );
  }

  return (
    <div key={key} className="template-preview-node template-preview-leaf" style={baseStyle}>
      {resolveLeafContent(node, innerRect)}
    </div>
  );
}

export const TemplatePreview: React.FC<TemplatePreviewProps> = ({
  template,
  pageAspectRatio,
  pageWidth,
  pageHeight,
  pageUnit,
  maxWidth = 200,
  maxHeight = 120,
}) => {
  const previewSize = useMemo(() => {
    const safeAspect = pageAspectRatio > 0 ? pageAspectRatio : 1;
    let width = Math.min(maxWidth, maxHeight * safeAspect);
    let height = width / safeAspect;
    if (height > maxHeight) {
      height = maxHeight;
      width = height * safeAspect;
    }
    return { width, height };
  }, [pageAspectRatio, maxWidth, maxHeight]);

  const pageWidthInches = albumUnitToInches(pageWidth, pageUnit);
  const pageHeightInches = albumUnitToInches(pageHeight, pageUnit);
  const scale = previewSize.width / pageWidthInches;
  const defaultMarginPx = toInches(template.pageContext.defaultMargin) * scale;

  const rootStyle: React.CSSProperties = {
    width: `${previewSize.width}px`,
    height: `${previewSize.height}px`,
    padding: `${defaultMarginPx}px`,
    boxSizing: 'border-box',
  };

  // Keep scale consistent in case malformed settings create tiny/zero dimensions.
  if (pageWidthInches <= 0 || pageHeightInches <= 0) {
    return (
      <div className="template-preview template-preview-frame" style={rootStyle} />
    );
  }

  return (
    <div
      className="template-preview template-preview-frame"
      style={rootStyle}
      data-testid={`template-preview-${template.id}`}
    >
      {renderNode(
        template.root,
        scale,
        template.root.id,
        {
          width: Math.max(0, pageWidthInches - toInches(template.pageContext.defaultMargin) * 2),
          height: Math.max(0, pageHeightInches - toInches(template.pageContext.defaultMargin) * 2),
        }
      )}
    </div>
  );
};
