/**
 * Template DOM model for the print-layout engine.
 *
 * Core principles:
 * 1) Layout first, content second: branch nodes split space; leaf nodes render inside that box.
 * 2) Strict node separation: a node is either branch (structure) or leaf (content), never both.
 * 3) Print-safe units: fixed sizing, margins, paddings, and gaps use physical units.
 * 4) No circular sizing: aspect-ratio constraints live only on image content payloads.
 */
export type PhysicalUnitKind = 'in' | 'mm';

/** Physical measurement used for print-aware dimensions (inches or millimeters). */
export interface PhysicalUnit {
  value: number;
  unit: PhysicalUnitKind;
}

/** Optional per-side inset applied before child layout is computed. */
export interface PhysicalPadding {
  top?: PhysicalUnit;
  right?: PhysicalUnit;
  bottom?: PhysicalUnit;
  left?: PhysicalUnit;
}

export type Alignment = 'top' | 'bottom' | 'center' | 'left' | 'right';

export type HorizontalAlignment = Extract<Alignment, 'left' | 'center' | 'right'>;
export type VerticalAlignment = Extract<Alignment, 'top' | 'center' | 'bottom'>;

/** Leaf payload for images (real source or empty placeholder). */
export interface ImageTemplateContent {
  type: 'image';
  /** Optional image aspect ratio constraint. Null means stretch to fill the leaf box. */
  aspectRatio: number | null;
  /** Positioning anchor used when content letterboxes/crops inside the leaf box. */
  boxAlignment: Alignment;
  /** Optional source URI/identifier. Omitted means placeholder slot. */
  imageSrc?: string;
}

/** Leaf payload for text. Text flows inside fixed layout bounds and does not drive parent size. */
export interface TextTemplateContent {
  type: 'text';
  horizontalAlign: HorizontalAlignment;
  verticalAlign: VerticalAlignment;
  text?: string;
  style?: TemplateTextStyle;
}

/** Basic text styling tokens for template-time defaults/placeholders. */
export interface TemplateTextStyle {
  fontFamily?: string;
  fontSize?: PhysicalUnit;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  color?: string;
  underline?: boolean;
}

export type TemplateContent = ImageTemplateContent | TextTemplateContent;

/** Shared sizing properties used by both branch and leaf nodes. */
export interface BaseTemplateNode {
  id: string;
  /** Relative share of remaining space among siblings in the parent axis. */
  flexGrow?: number;
  /** Fixed physical width override (main/cross-axis interpretation depends on parent direction). */
  fixedWidth?: PhysicalUnit;
  /** Fixed physical height override (main/cross-axis interpretation depends on parent direction). */
  fixedHeight?: PhysicalUnit;
  /** Optional fill color rendered for the node box before content. */
  backgroundColor?: string;
  /** Inset applied before computing child layout or placing leaf content. */
  padding?: PhysicalPadding;
}

/** Layout container node: owns structure only, never content. */
export interface TemplateBranchNode extends BaseTemplateNode {
  nodeType: 'branch';
  direction: 'row' | 'column';
  /** Physical spacing inserted between adjacent children. */
  gap?: PhysicalUnit;
  children: TemplateNode[];
  content?: never;
}

/** Content node: owns payload only, never children/layout direction. */
export interface TemplateLeafNode extends BaseTemplateNode {
  nodeType: 'leaf';
  /** Null means explicit empty placeholder cell. */
  content: TemplateContent | null;
  direction?: never;
  gap?: never;
  children?: never;
}

export type TemplateNode = TemplateBranchNode | TemplateLeafNode;

export interface TemplatePageContext {
  /** Outer page inset applied before root layout begins. */
  defaultMargin: PhysicalUnit;
}

/** Optional page-ratio compatibility filter for template selection. */
export interface AspectRatioRange {
  min?: number;
  max?: number;
}

/** Top-level template wrapper used for storage, filtering, and runtime layout. */
export interface TemplateDefinition {
  id: string;
  name: string;
  pageContext: TemplatePageContext;
  validAspectRatio: AspectRatioRange;
  root: TemplateNode;
}
