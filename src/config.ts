import { AlbumSettings } from './types';

// App Configuration
export const APP_CONFIG = {
  // Canvas Settings
  PPI: 300,
  SCREEN_PPI: 96,
  BLEED_MARGIN: 50,

  // UI Sizes (Zoom compensated base values)
  BASE_UI_SIZES: {
    cornerSize: 10,
    borderWidth: 1,
    seamStrokeWidth: 2,
    seamDash: 5,
    snapLineStrokeWidth: 1,
    snapLineDash: 4,
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

  // Storage
  SAVE_DELAY: 1000,
  CURRENT_ALBUM_KEY: 'currentAlbumId',
  LOCAL_STORAGE_KEY: 'albumEditor_album',
};
