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
- **Fabric Renderer (`fabricRenderer.ts`)**: Central utility for the **Main Thread (Editor)**. It handles incremental synchronization, layout, z-ordering, and zoom-compensated handles. In Fabric v7, `uniformScaling` is managed at the canvas level during synchronization to ensure consistent selection behavior.
- **Offscreen Renderer (`offscreenCanvasRenderer.ts`)**: Pure headless renderer for **Web Workers (Export)**. Uses native 2D Canvas API for maximum speed and compatibility without DOM dependencies. It supports full image orientation (rotation/flip) to match the editor's quality.

## Rules of Engagement
- **Keep it Pure**: Utility functions should be stateless and deterministic.
- **Unit Awareness**: Always verify whether a function expects Model Pixels (PPI-indexed) or Canvas Pixels (Screen-indexed).
- **No Side Effects**: Do not access `localStorage` or `window` directly; pass necessary dependencies as arguments.
