// Album and page related types
export interface Album {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  pages: Page[];
  imagePool: PoolImage[];
}

export interface Page {
  id: string;
  templateId: TemplateId;
  elements: PageElement[];
}

export interface PageElement {
  id: string;
  type: 'image';
  imageUrl: string;
  thumbnailUrl: string;
  googleMediaId: string;
  position: Position;
  size: Size;
  crop?: CropArea;
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

// Image pool (imported from Google Photos)
export interface PoolImage {
  id: string;
  googleMediaId: string;
  baseUrl: string;
  filename: string;
  mimeType: string;
  width: number;
  height: number;
  creationTime: string;
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
  x: number; // percentage
  y: number; // percentage
  width: number; // percentage
  height: number; // percentage
  aspectRatio?: number;
}

// Google Photos API types
export interface GoogleMediaItem {
  id: string;
  baseUrl: string;
  filename: string;
  mimeType: string;
  mediaMetadata: {
    width: string;
    height: string;
    creationTime: string;
    photo?: {
      cameraMake?: string;
      cameraModel?: string;
    };
  };
}

export interface GoogleAlbum {
  id: string;
  title: string;
  productUrl: string;
  mediaItemsCount: string;
  coverPhotoBaseUrl?: string;
}

// App state types
export interface AppState {
  album: Album;
  currentPageIndex: number;
  selectedElementId: string | null;
  isImagePoolOpen: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
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
  | { type: 'ADD_PAGE'; payload?: { templateId?: TemplateId } }
  | { type: 'DELETE_PAGE'; payload: string }
  | { type: 'REORDER_PAGES'; payload: { fromIndex: number; toIndex: number } }
  | { type: 'UPDATE_PAGE'; payload: { pageId: string; updates: Partial<Page> } }
  | { type: 'ADD_ELEMENT'; payload: { pageId: string; element: PageElement } }
  | { type: 'UPDATE_ELEMENT'; payload: { pageId: string; elementId: string; updates: Partial<PageElement> } }
  | { type: 'DELETE_ELEMENT'; payload: { pageId: string; elementId: string } }
  | { type: 'ADD_TO_POOL'; payload: PoolImage[] }
  | { type: 'CLEAR_POOL' };

// Export types
export interface ExportOptions {
  format: 'png' | 'jpeg';
  quality: number; // 0-1 for jpeg
  includePageNumbers: boolean;
  filenamePrefix: string;
}

export interface ExportProgress {
  currentPage: number;
  totalPages: number;
  status: 'idle' | 'exporting' | 'complete' | 'error';
  error?: string;
}
