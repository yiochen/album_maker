# Utils Directory

This directory contains pure utility functions and stateless components used across the application.

## Core Services

### Image Utilities (`imageUtils.ts`)
Handles unit conversions and coordinate transforms.
- **`toModelPx`**: Converts browser pixels (96 DPI) to album pixels (300 DPI).
- **`toCanvasPx`**: Converts album pixels (300 DPI) to browser pixels (96 DPI).
- **Coordinate Wrappers**: Functions like `getCenterInPixels` ensure layout math is consistent across the editor and export worker.

### Transformation Logic (`transforms.ts`)
Manages non-destructive image manipulation (pan, zoom, flip, rotate).
- **Matrix-based math**: Uses linear algebra to maintain precision during complex multi-step transforms.
- **Atomic Operations**: 
    - `applyZoom`: Updates scale and compensates pan to keep center point stable.
    - `applyRotate90`: Left-multiplies `ROTATE_90_CW`. Resets zoom/pan.
    - `applyFlipH`/`applyFlipV`: Left-multiplies flip matrix. Keeps zoom, mirrors pan.

### Rendering Engine
The application uses two specialized renderers that share a common visual logic:
- **`rendererTypes.ts`**: Defines the shared `BaseRenderOptions`, `FabricRenderOptions`, and `OffscreenRenderOptions`.
- **Fabric Renderer (`fabricRenderer.ts`)**: Central utility for the **Main Thread (Editor)**. It handles incremental synchronization, layout, z-ordering, and zoom-compensated handles. Fabric is used for **static text rendering only** (`editable: false`); rich text editing is handled by a DOM-based Tiptap overlay (`components/canvas/TiptapTextEditor.tsx`).
- **Offscreen Renderer (`offscreenCanvasRenderer.ts`)**: Pure headless renderer for **Web Workers (Export)**. Uses native 2D Canvas API for maximum speed and compatibility. Text elements are rendered using layout coordinates (`x`, `baselineY`) pre-computed by Fabric.js — no text wrapping or measurement is done here.

### Text Style Utilities (`textStyleUtils.ts`)
Converts between our `TextRun[]` data model and Fabric.js's per-character style format.
- **`runsToFabricStyles`**: TextRun[] → Fabric format (for React→Fabric sync).
- **`fabricLinesToRuns`**: Fabric visual lines → TextRun[] with layout coordinates `x`/`baselineY` in pt (for Fabric→React sync + offscreen rendering). Splits runs at visual line boundaries.
- **`fabricStylesToRuns`**: Legacy flat conversion without layout coordinates.

## Rules of Engagement
- **Keep it Pure**: Utility functions should be stateless and deterministic.
- **Unit Awareness**: Always verify whether a function expects Model Pixels (PPI-indexed) or Canvas Pixels (Screen-indexed).
- **No Side Effects**: Do not access `localStorage` or `window` directly; pass necessary dependencies as arguments.
