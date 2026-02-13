# Utilities Directory (`src/utils`)

## Purpose
This directory contains pure utility functions and stateless logic used across the application.

## Key Modules

### Orientation Matrix (`orientationMatrix.ts`)
Handles the **D4 symmetry group** operations (8 possible combinations of 90° rotations and flips) using 2x2 integer matrices `[a, b, c, d]`.

- **Internal Model**: View-space transforms (flip what you see).
- **Rendering**: Decomposed for Fabric.js/Canvas 2D which apply `Flip_local → Rotate`.
- **Composition**: Left-multiplication `compose(A, B)` means A is applied AFTER B.
- **Button Actions**:
    - `applyRotate90`: Left-multiplies `ROTATE_90_CW`. Resets zoom/pan.
    - `applyFlipH`/`applyFlipV`: Left-multiplies flip matrix. Keeps zoom, mirrors pan.

## Rules of Engagement
- **Keep it Pure**: Utility functions should be stateless and deterministic.
- **Orientation Pipeline**: Always use `decomposeForRendering` when mapping the orientation matrix to rendering engine properties (like Fabric's `angle` and `flipX`) to ensure the correct transform order.
- **Dimension Awareness**: Use `getOrientedDimensions` when calculating cover/fit logic to account for width/height swaps during 90°/270° rotations.
