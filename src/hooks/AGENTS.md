# Hooks Directory (`src/hooks`)

## Purpose
Contains custom React hooks that encapsulate state management and complex logic, separating it from UI components.

## Key Hooks

### App Lifecycle
- **`useAppInitialization`**: Handles the initial loading of the application, including data migration (localStorage to IndexedDB) and source initialization.
- **`useKeyboardShortcuts`**: Manages global keyboard shortcuts (e.g., Undo/Redo).

### Canvas Logic
- **`useCanvasRender`**: Manages the Fabric.js canvas instance, initialization, rendering cycle, zoom state, and syncing React state to Fabric objects.

- **`useCanvasInteraction`**: Handles user interactions on the canvas, including selection, movement/snapping, modification updates, and drag-and-drop.
  > **Note**: Snapping is a runtime-only interaction behavior. Snap constraints are calculated during drag/resize to guide positioning but are **not persisted** in the state or database. Elements retain their absolute position once placed.
- **`useCanvasThumbnail`**: Logic for generating spread thumbnails.

### State Management
- **`useHistory`**: Manages the application state stack (past/present/future) and integrates with the Command Pattern.
- **`useAlbum`**: High-level hook exposing album actions (add spread, update element, etc.) wrapping `useHistory`.
- **`useAutoSave`**: Handles auto-saving album data to IndexedDB.

## Rules of Engagement
- **Do** separate complex logic from components into custom hooks.
- **Do** use `useHistory` for any state that requires Undo/Redo support.
- **Do** use `APP_CONFIG` for constants used within hooks.
- **Do not** use `useEffect` to sync state with props if it can be derived during render.
