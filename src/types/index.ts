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
  pages: Page[];
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

export interface Page {
  id: string;
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
  position: Position;
  size: Size;
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
  | { type: 'ADD_PAGE'; payload?: { templateId?: TemplateId } }
  | { type: 'ADD_PAGES'; payload?: { count?: number; templateId?: TemplateId } }
  | { type: 'DELETE_PAGE'; payload: string }
  | { type: 'REORDER_PAGES'; payload: { fromIndex: number; toIndex: number } }
  | { type: 'UPDATE_PAGE'; payload: { pageId: string; updates: Partial<Page> } }
  | { type: 'ADD_ELEMENT'; payload: { pageId: string; element: PageElement } }
  | { type: 'UPDATE_ELEMENT'; payload: { pageId: string; elementId: string; updates: Partial<PageElement> } }
  | { type: 'DELETE_ELEMENT'; payload: { pageId: string; elementId: string } }
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
