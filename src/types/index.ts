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

/**
 * Content data specific to image elements.
 * Contains all image-related fields: URLs, source identification,
 * inner positioning (SmartFrame), and aspect ratio settings.
 */
export interface ImageContent {
  imageUrl: string;
  thumbnailUrl: string;
  /** Identifies which photo source/provider this image came from (e.g., "google-photos", "dummy-colors") */
  sourceId: string;
  /** The unique ID of this image within its source (e.g., Google Photos media item ID) */
  sourceImageId: string;
  /**
   * Inner image positioning and orientation within the frame (SmartFrame).
   *
   * ## Rendering Pipeline (applied in this order):
   *   1. Source image pixels
   *   2. Apply `orientation` matrix (rotate/flip the source)
   *   3. Compute effective dimensions (width/height swap if 90°/270°)
   *   4. Compute "cover" fit to frame (background-size: cover)
   *   5. Apply `zoom` (scale multiplier on top of cover)
   *   6. Apply `panX`/`panY` (position offset within frame)
   *   7. Clip to frame box
   */
  contentTransform?: {
    /** Scale multiplier on top of the "cover" fit. 1.0 = exactly cover, >1 = zoom in. */
    zoom: number;
    /** Horizontal pan position (0.0 = left edge, 0.5 = centered, 1.0 = right edge). View-relative. */
    panX: number;
    /** Vertical pan position (0.0 = top edge, 0.5 = centered, 1.0 = bottom edge). View-relative. */
    panY: number;
    /**
     * 2×2 orientation matrix [a, b, c, d] representing rotation and/or flip:
     *   | a  b |
     *   | c  d |
     *
     * The 8 possible states (D4 symmetry group):
     *   [1,0,0,1]   = 0° (identity)      [-1,0,0,1]  = flip horizontal
     *   [0,1,-1,0]  = 90° CW             [0,1,1,0]   = flip H + 90°
     *   [-1,0,0,-1] = 180°               [1,0,0,-1]  = flip vertical
     *   [0,-1,1,0]  = 270° CW            [0,-1,-1,0] = flip V + 90°
     *
     * Defaults to [1,0,0,1] (identity) when omitted.
     */
    orientation?: [number, number, number, number];
  };
  lockAspectRatio?: boolean;
  originalAspectRatio?: number;
}

// Future element content types:
// export interface TextContent { text: string; fontSize: number; fontFamily: string; color: string; }

/**
 * A visual element placed on a spread.
 * Uses a discriminated union pattern via `type` + `content` to support
 * different element kinds (image, text, shape, etc.) in the future.
 */
export interface PageElement {
  id: string;
  type: 'image'; // future: 'image' | 'text' | 'shape'
  content: ImageContent; // future: ImageContent | TextContent | ShapeContent
  /**
   * Normalized relative coordinates (0.0 to 1.0) representing the edges.
   * x1: Left, y1: Top, x2: Right, y2: Bottom.
   */
  box: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
}

// Position and Size kept for legacy use or general purposes if needed, 
// though box model is now preferred for PageElements.
export interface Position {
  x: number;
  y: number;
}

export interface Size {
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

export interface SpreadThumbnailRecord {
  id: string;           // albumId-spreadId
  albumId: string;
  spreadId: string;
  dataUrl: string;      // Base64 data URL
  contentHash: string;  // Hash of spread content for cache invalidation
  timestamp: number;
}
