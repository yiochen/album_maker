# Hooks Directory (`src/hooks`)

## Purpose
Contains custom React hooks that encapsulate state management and complex logic, separating it from UI components.

## Pixel Coordinate System
The application uses a **normalized box model** for storage and a two-tier pixel system for rendering:

### 1. Normalized Box (Storage)
-   Stored in `PageElement.box` as unit-less floats (`0.0` to `1.0`).
-   `x1, y1` is top-left, `x2, y2` is bottom-right.
-   Allows for spread resizing without complex math.

### 2. Model Pixels (Print Resolution, 300 PPI)
-   Used for high-precision calculations.
-   Layouts are defined relative to a 300 PPI print resolution.

### 3. Canvas Pixels (Screen Resolution, 96 PPI)
-   Used for FabricJS rendering.
-   Converted via `toCanvasPx(modelPx)` and `toModelPx(canvasPx)`.

### FabricJS Origin & Grouping
-   **`CanvasImageElement`**: Uses `originX: 'left', originY: 'top'` for the container group.
-   **Internal Offsets**: Fabric groups use center-relative coordinates for children by default. To align images correctly, internal children (rects, images) are offset by `-width/2` and `-height/2` within the group. 
-   **Gapless Rendering**: `useReactToFabricSync` calls `calculateGaplessRect()` to convert normalized floats to integer-rounded pixels, ensuring adjacent elements touch perfectly without white seams.

---

## Key Hooks

### App Lifecycle
- **`useAppInitialization`**: Handles the initial loading of the application, including data migration (localStorage to IndexedDB) and source initialization.
- **`useKeyboardShortcuts`**: Manages global keyboard shortcuts (e.g., Undo/Redo).

### Canvas Logic
- **`useCanvasRender`**: Orchestrates canvas initialization, zoom, viewport layout, and React-to-Fabric sync.
- **`useCanvasViewportLayout`**: Computes centered/scrollable viewport wrapper dimensions for zoomed canvas presentation.
- **`useCanvasInitialization`**: Owns Fabric canvas lifecycle and registration into `editorInfraStore`.

- **`useCanvasInteraction`**: Handles user interactions on the canvas, including selection, movement/snapping, and modification updates.
-   **Resolution**: While layout is normalized, the application targets **300 PPI** (Pixels Per Inch) as the base print resolution for all scaling calculations.
-   **No Bleed**: This project does not currently handle print bleed. The canvas edges are treated as the final trim edges, and elements can be positioned freely across them if desired for simple overflow, but no explicit bleed safety logic is enforced.
  > **Note**: Snapping is a runtime-only interaction behavior. Snap constraints are calculated during drag/resize to guide positioning but are **not persisted** in the state or database. Elements retain their absolute position once placed.
  > **Note**: Drag-and-drop from the ImagePool is handled by `@dnd-kit/core` via `DndWrapper` and `DndDropContext`.

- **`useReactToFabricSync`**: Syncs PageElement state to FabricJS objects. Converts MODEL PIXELS → CANVAS PIXELS for rendering.
  - Also applies zoom-compensated UI sizes (handles, seam line, image pan control, low-res badge).

- **`useCanvasSnapping`**: Handles snapping. Works in CANVAS PIXELS internally, converts to MODEL PIXELS for state updates. Note: This project does not enforce bleed constraints; elements can be positioned freely beyond canvas boundaries.
- **`useCanvasPersistence`**: Commits Fabric object geometry/contentTransform back to album store on interaction completion.

- **`useElementActions`**: Creates/updates elements. All inputs and outputs are in MODEL PIXELS.
  - When binding an image to an element, persist `originalWidth`/`originalHeight` into `ImageContent` for quality checks.

### Text Editing Hooks
- **`useTextEditing`**: Coordinates active text element, toolbar positioning, and shared Tiptap editor registration.
- **`useTextEditorTransition`**: Manages commit/close transitions for text editing lifecycle.
- **`useTextEditingAlignmentState`**: Holds text/vertical alignment state during active editing.
- **`canvasTextObject.ts`**: Shared helpers to locate text Fabric object and compute toolbar position.

### State Management
- **`useAlbum`**: High-level hook exposing album actions (add spread, update element, etc.) via `useAlbumStore`.
- **`useAutoSave`**: Handles auto-saving album data to IndexedDB.
- **Shared Infra Store Usage**: Hooks should use `editorInfraStore` to reference runtime Fabric and Tiptap instances instead of ad-hoc globals.

## Rules of Engagement
- **Do** separate complex logic from components into custom hooks.
- **Do** use `APP_CONFIG` for constants used within hooks.
- **Do** document which pixel coordinate system each function expects/returns.
- **Do not** use `useEffect` to sync state with props if it can be derived during render.
