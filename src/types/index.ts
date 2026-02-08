// Album settings
export type Unit = 'inch' | 'cm';

// Snap edge for runtime snapping calculations
export type SnapEdge =
  | 'left' | 'right' | 'top' | 'bottom'
  | 'seam'
  | 'left-center-h' | 'left-center-v'
  | 'right-center-h' | 'right-center-v';

export interface AlbumSettings {
  pageWidth: number;
  pageHeight: number;
  unit: Unit;
  isSquare: boolean;
  maxPages: number;
}



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
  type: 'image' | 'smartFrame';
  imageUrl: string;
  thumbnailUrl: string;
  /** Identifies which photo source/provider this image came from (e.g., "google-photos", "dummy-colors") */
  sourceId: string;
  /** The unique ID of this image within its source (e.g., Google Photos media item ID) */
  sourceImageId: string;

  // --- NEW GAPLESS LAYOUT ---
  /** Normalized coordinates (0.0 - 1.0) relative to the spread */
  box?: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };

  /** Transform for the inner content (image) relative to the frame */
  contentTransform?: {
    zoom: number;    // Scale relative to 'cover' size (1.0 = cover)
    panX: number;    // 0.0 - 1.0 (relative to frame width)
    panY: number;    // 0.0 - 1.0 (relative to frame height)
    rotation?: number; // In degrees
  };

  // --- DEPRECATED (Keep for migration) ---
  /**
   * Center position in MODEL PIXELS (at print PPI, e.g., 300 PPI).
   * Use toCanvasPx() to convert to screen pixels for rendering.
   * @deprecated Use 'box' instead
   */
  position?: Position;
  /**
   * Dimensions in MODEL PIXELS (at print PPI, e.g., 300 PPI).
   * Use toCanvasPx() to convert to screen pixels for rendering.
   * @deprecated Use 'box' instead
   */
  size?: Size;
  /** @deprecated Use 'contentTransform' instead */
  crop?: CropArea;

  lockAspectRatio?: boolean;

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

/**
 * Image stored in the album's image pool, imported from any photo source.
 * The combination of sourceId + sourceImageId uniquely identifies an image globally.
 */
export interface PoolImage {
  id: string;
  /** Identifies which photo source/provider this image came from (e.g., "google-photos", "dummy-colors") */
  sourceId: string;
  /** The unique ID of this image within its source (e.g., Google Photos media item ID) */
  sourceImageId: string;
  baseUrl: string;
  thumbnailUrl?: string;
  filename: string;
  mimeType: string;
  /** Original width of the image in pixels (full resolution) */
  width?: number;
  /** Original height of the image in pixels (full resolution) */
  height?: number;
  /** Actual width of the thumbnail image in pixels */
  thumbnailWidth?: number;
  /** Actual height of the thumbnail image in pixels */
  thumbnailHeight?: number;
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
