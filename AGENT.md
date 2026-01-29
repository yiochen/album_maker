# Photo Album Editor

## Project Overview

A web-based photo album editor built with React + TypeScript. It provides a Google Slides-like interface for creating photo album pages with drag-and-drop image placement, customizable templates, and multi-source photo import.

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Database**: IndexedDB via Dexie.js
- **Styling**: Vanilla CSS with design tokens

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        App.tsx                          │
│  (Main orchestrator, album state, routing)             │
└─────────────────────────────────────────────────────────┘
         │
         ├──────────────────────────────────────┐
         │                                      │
         ▼                                      ▼
┌─────────────────┐                    ┌─────────────────┐
│    Components   │                    │     Hooks       │
│  ├── Canvas     │                    │  ├── useAlbum   │
│  ├── PageNav    │                    │  ├── useAutoSave│
│  ├── Properties │                    │  └── useImageWkr│
│  ├── ImagePool  │                    └─────────────────┘
│  └── AlbumSelect│
└─────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│                      Services                            │
│  ├── storage.ts     (IndexedDB CRUD via Dexie)         │
│  ├── thumbnailCache (Blob caching in IndexedDB)        │
│  └── export.ts      (Canvas rendering, PNG export)     │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│                  Photo Sources                           │
│  Interface: PhotoSource                                  │
│  ├── googlePhotos.ts  (Google Photos API)              │
│  └── dummyColors.ts   (Test color images)              │
└─────────────────────────────────────────────────────────┘
```

## Directory Structure

```
src/
├── components/          # React UI components
│   ├── AlbumSelector    # Multi-album dropdown
│   ├── Canvas           # Main editing canvas
│   ├── ImagePool        # Bottom image library
│   ├── PageNavigator    # Left sidebar thumbnails
│   └── PropertiesPanel  # Right properties panel
├── db/
│   └── index.ts         # Dexie.js database config
├── hooks/
│   ├── useAlbum.ts      # Album state reducer
│   ├── useAutoSave.ts   # IndexedDB persistence
│   └── useImageWorker   # Web Worker communication
├── services/
│   ├── export.ts        # Page export logic
│   ├── storage.ts       # Album CRUD operations
│   └── thumbnailCache   # Image caching
├── sources/             # Photo source plugins
│   ├── types.ts         # PhotoSource interface
│   ├── googlePhotos.ts  # Google Photos implementation
│   ├── dummyColors.ts   # Test color images
│   └── index.ts         # Source registry
├── templates/
│   └── pageTemplates.ts # Layout template definitions
├── types/
│   └── index.ts         # TypeScript type definitions
├── workers/
│   └── imageFetcher     # Background image loading
├── App.tsx              # Main application
├── main.tsx             # React entry point
└── index.css            # Design system
```

## Key Abstractions

### PhotoSource Interface

All image sources implement this interface (see `src/sources/types.ts`):

```typescript
interface PhotoSource {
  id: string;
  name: string;
  icon: React.ReactNode;
  requiresAuth: boolean;
  isAuthenticated(): boolean;
  connect(): Promise<void>;
  disconnect(): void;
  fetchImages(options?): Promise<FetchImagesResult>;
  getThumbnailUrl(image, size): string;
  getFullUrl(image, maxWidth?, maxHeight?): string;
}
```

To add a new source:
1. Create `src/sources/yourSource.ts` implementing `PhotoSource`
2. Register in `src/sources/index.ts`

### Album State Management

Uses React's `useReducer` pattern. See `src/hooks/useAlbum.ts`:

```typescript
type AlbumAction =
  | { type: 'SET_ALBUM'; payload: Album }
  | { type: 'ADD_PAGE'; payload?: { templateId?: TemplateId } }
  | { type: 'UPDATE_ELEMENT'; payload: { pageId, elementId, updates } }
  // ... etc
```

### IndexedDB Schema (Dexie)

Tables defined in `src/db/index.ts`:
- `albums`: Album data (id, name, lastModified, data)
- `thumbnailCache`: Cached image blobs (url, blob, timestamp)
- `settings`: App settings key-value store

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Type check
npx tsc --noEmit

# Build for production
npm run build
```

## Common Tasks

### Adding a New Template

Edit `src/templates/pageTemplates.ts`:

```typescript
'your-template': {
  id: 'your-template',
  name: 'Your Template',
  description: 'Description',
  exportWidth: 2400,
  exportHeight: 1800,
  padding: { top: 100, right: 100, bottom: 100, left: 100 },
  slots: [{ id: 'slot1', x: 10, y: 10, width: 80, height: 80 }],
}
```

### Adding a New Photo Source

1. Create `src/sources/newSource.ts`:

```typescript
import { PhotoSource } from './types';

class NewSource implements PhotoSource {
  readonly id = 'new-source';
  readonly name = 'New Source';
  // ... implement all methods
}

export const newSource = new NewSource();
```

2. Register in `src/sources/index.ts`:

```typescript
import { newSource } from './newSource';
sources.set(newSource.id, newSource);
```

### Enabling Google Photos

1. Create Google Cloud project
2. Enable Google Photos Library API
3. Configure OAuth consent screen
4. Create OAuth credentials
5. Update `src/sources/googlePhotos.ts`:

```typescript
const CLIENT_ID = 'your-client-id.apps.googleusercontent.com';
```

## Testing Notes

- **Dummy Colors source** is always available for layout testing
- Check IndexedDB in DevTools → Application → IndexedDB → AlbumEditorDB
- Web Worker activity visible in DevTools → Sources → Workers

## Known Limitations

- Google Photos requires OAuth setup (placeholder credentials)
- Export uses HTML Canvas (may have CORS issues with external images)
- No undo/redo yet
