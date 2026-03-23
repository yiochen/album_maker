import { AlbumSettings } from './types';

// App Configuration
export const APP_CONFIG = {
  // Canvas Settings
  PPI: 300,
  SCREEN_PPI: 96,

  // UI Sizes (Zoom compensated base values)
  BASE_UI_SIZES: {
    cornerSize: 6,
    borderWidth: 2,
    selectionLineWidth: 2,
    seamStrokeWidth: 2,
    seamDash: 5,
    snapLineStrokeWidth: 1,
    snapLineDash: 4,
    panControlSize: 22,
    lowResBadgeHeight: 20,
    lowResBadgeFontSize: 11,
    lowResBadgeMargin: 6,
  },

  // Image Pool
  THUMBNAIL_SIZE: 200,
  DRAG_PREVIEW_SIZE: 80,

  // Lazy Loading
  INTERSECTION_THRESHOLD: 0.1,
  INTERSECTION_ROOT_MARGIN: '50px',

  // Defaults
  DEFAULT_ALBUM_SETTINGS: {
    pageWidth: 8,
    pageHeight: 10,
    unit: 'inch',
    isSquare: false,
    maxPages: 40,
  } as AlbumSettings,

  // Thumbnails
  THUMBNAIL_QUALITY: 0.5,
  THUMBNAIL_MULTIPLIER: 0.2,
  THUMBNAIL_PPI: 30, // Resolution for SW-generated thumbnails

  // Storage
  CURRENT_ALBUM_KEY: 'currentAlbumId',
  LOCAL_STORAGE_KEY: 'albumEditor_album',
  CLEAR_INDEX_DB_ON_LOAD_ERROR: true,
};
