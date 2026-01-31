// Album settings
export type Unit = 'inch' | 'cm';

export interface AlbumSettings {
  pageWidth: number;
  pageHeight: number;
  unit: Unit;
  isSquare: boolean;
  maxPages: number;
}

// Snap constraint for smart positioning
export type SnapEdge =
  | 'left' | 'right' | 'top' | 'bottom'
  | 'seam'
  | 'left-center-h' | 'left-center-v'
  | 'right-center-h' | 'right-center-v';

export interface SnapConstraint {
  edge: SnapEdge;
  offset: number; // Distance from snap target in percentage
}

export interface SnapConstraints {
  horizontal?: SnapConstraint; // x-axis snap
  vertical?: SnapConstraint;   // y-axis snap
}

// Default album settings
export const DEFAULT_ALBUM_SETTINGS: AlbumSettings = {
  pageWidth: 8,
  pageHeight: 10,
  unit: 'inch',
  isSquare: false,
  maxPages: 40,
};

// Album and page related types
export interface Album {
  id: string;
  name: string;
  settings: AlbumSettings;
  createdAt: number;
  updatedAt: number;
  spreads: Spread[];
  imagePool: PoolImage[];
}

// Album metadata (for list view, without full data)
export interface AlbumMetadata {
  id: string;
  name: string;
  lastModified: number;
  pageCount?: number;
  thumbnailUrl?: string;
}

export interface Spread {
  id: string; // ID of the spread (can be same as left page ID)
  templateId: TemplateId;
  elements: PageElement[];
  background?: string;
}

export interface PageElement {
  id: string;
  type: 'image';
  imageUrl: string;
  thumbnailUrl: string;
  sourceId: string;
  sourceImageId: string;
  position: Position; // Absolute coordinates in pixels
  size: Size; // Absolute dimensions in pixels
  crop?: CropArea;
  lockAspectRatio?: boolean;
  snapConstraints?: SnapConstraints;
  // Original aspect ratio (stored when image added)
  originalAspectRatio?: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Image pool (imported from any source)
export interface PoolImage {
  id: string;
  sourceId: string;
  sourceImageId: string;
  baseUrl: string;
  thumbnailUrl?: string;
  filename: string;
  mimeType: string;
  width?: number;
  height?: number;
  createdAt?: number;
}

// Template types
export type TemplateId =
  | 'fullpage'
  | 'square-center'
  | 'portrait'
  | 'landscape'
  | 'polaroid'
  | 'grid-2x2'
  | 'grid-1-2';

export interface PageTemplate {
  id: TemplateId;
  name: string;
  description: string;
  exportWidth: number;
  exportHeight: number;
  padding: Padding;
  slots: TemplateSlot[];
}

export interface Padding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface TemplateSlot {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  aspectRatio?: number;
}

// App state types
export interface AppState {
  album: Album;
  currentPageIndex: number;
  selectedElementId: string | null;
  isImagePoolOpen: boolean;
  activeSourceId: string | null;
  isSnappingEnabled: boolean;
}

export interface SelectionState {
  type: 'none' | 'page' | 'element';
  pageId?: string;
  elementId?: string;
}

// Action types for state management
export type AlbumAction =
  | { type: 'SET_ALBUM'; payload: Album }
  | { type: 'SET_NAME'; payload: string }
  | { type: 'SET_SETTINGS'; payload: Partial<AlbumSettings> }
  | { type: 'ADD_SPREAD'; payload?: { templateId?: TemplateId } }
  | { type: 'ADD_SPREADS'; payload?: { count?: number; templateId?: TemplateId } }
  | { type: 'DELETE_SPREAD'; payload: string }
  | { type: 'REORDER_SPREADS'; payload: { fromIndex: number; toIndex: number } }
  | { type: 'UPDATE_SPREAD'; payload: { spreadId: string; updates: Partial<Spread> } }
  | { type: 'ADD_ELEMENT'; payload: { spreadId: string; element: PageElement } }
  | { type: 'UPDATE_ELEMENT'; payload: { spreadId: string; elementId: string; updates: Partial<PageElement> } }
  | { type: 'DELETE_ELEMENT'; payload: { spreadId: string; elementId: string } }
  | { type: 'MOVE_ELEMENT'; payload: { fromSpreadId: string; toSpreadId: string; elementId: string } }
  | { type: 'ADD_TO_POOL'; payload: PoolImage[] }
  | { type: 'REMOVE_FROM_POOL'; payload: string }
  | { type: 'CLEAR_POOL' };

// Export types
export interface ExportOptions {
  format: 'png' | 'jpeg';
  quality: number;
  includePageNumbers: boolean;
  filenamePrefix: string;
}

export interface ExportProgress {
  currentPage: number;
  totalPages: number;
  status: 'idle' | 'exporting' | 'complete' | 'error';
  error?: string;
}
