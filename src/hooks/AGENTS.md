# Hooks Directory (`src/hooks`)

## Purpose
Contains custom React hooks that encapsulate state management and complex logic, separating it from UI components.

## Pixel Coordinate System

The application uses two coordinate systems:

### Model Pixels (at PPI, e.g., 300 PPI)
- Used for **storage** and **state** (PageElement position/size)
- Represents print-resolution coordinates
- 1 inch = PPI pixels (e.g., 300 pixels for 300 PPI)

### Canvas/Screen Pixels (at SCREEN_PPI, e.g., 96 PPI)
- Used for **rendering** on the FabricJS canvas
- Represents screen display coordinates
- 1 inch = SCREEN_PPI pixels (e.g., 96 pixels)

### Conversion Functions (in `utils/imageUtils.ts`)
- `toCanvasPx(modelPx)`: Model → Canvas (multiply by SCREEN_PPI/PPI)
- `toModelPx(canvasPx)`: Canvas → Model (multiply by PPI/SCREEN_PPI)

### FabricJS Origin
All objects use **center origin** (`originX: 'center'`, `originY: 'center'`), so `left`/`top` represent the center position of an element, not the top-left corner.

---

## Key Hooks

### App Lifecycle
- **`useAppInitialization`**: Handles the initial loading of the application, including data migration (localStorage to IndexedDB) and source initialization.
- **`useKeyboardShortcuts`**: Manages global keyboard shortcuts (e.g., Undo/Redo).

### Canvas Logic
- **`useCanvasRender`**: Manages the Fabric.js canvas instance, initialization, rendering cycle, zoom state, and syncing React state to Fabric objects.

- **`useCanvasInteraction`**: Handles user interactions on the canvas, including selection, movement/snapping, modification updates, and drag-and-drop.
  > **Note**: Snapping is a runtime-only interaction behavior. Snap constraints are calculated during drag/resize to guide positioning but are **not persisted** in the state or database. Elements retain their absolute position once placed.
- **`useCanvasThumbnail`**: Logic for generating spread thumbnails.

- **`useCanvasObjects`**: Syncs PageElement state to FabricJS objects. Converts MODEL PIXELS → CANVAS PIXELS for rendering.
  
  **Data Flow - Avoiding Circular Updates:**
  - During editing: FabricJS → React State (via `object:modified`)
  - User drags/resizes → FabricJS updates visually in real-time (no React)
  - Mouse release → `object:modified` → `useCanvasSnapping` → `updateElement()` → Zustand store
  - Zustand update triggers React re-render, but `useCanvasObjects` **intentionally skips** re-positioning objects unless the user switched spreads
  - This prevents FabricJS and React from fighting over positions during editing

- **`useCanvasSnapping`**: Handles snapping/constraints. Works in CANVAS PIXELS internally, converts to MODEL PIXELS for state updates.
  > **Gotcha - Snap Line Pooling**: Do NOT attempt to pre-create pooled snap lines (show/hide instead of add/remove). FabricJS canvas object references become stale or corrupted after `object:modified` events due to how `useCanvasObjects` syncs React state to canvas objects. The current approach of creating fresh line instances per move event and removing them on release is intentional and works reliably.

- **`useCanvasDragDrop`**: Handles image drop. Converts DOM coordinates → CANVAS PIXELS → MODEL PIXELS.

- **`useElementActions`**: Creates/updates elements. All inputs and outputs are in MODEL PIXELS.

### State Management
- **`useHistory`**: Manages the application state stack (past/present/future) and integrates with the Command Pattern.
- **`useAlbum`**: High-level hook exposing album actions (add spread, update element, etc.) wrapping `useHistory`.
- **`useAutoSave`**: Handles auto-saving album data to IndexedDB.

## Rules of Engagement
- **Do** separate complex logic from components into custom hooks.
- **Do** use `useHistory` for any state that requires Undo/Redo support.
- **Do** use `APP_CONFIG` for constants used within hooks.
- **Do** document which pixel coordinate system each function expects/returns.
- **Do not** use `useEffect` to sync state with props if it can be derived during render.
