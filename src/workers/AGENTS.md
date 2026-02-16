# Workers Directory (`src/workers`)

## Purpose
Contains Web Workers to handle heavy or I/O-bound tasks off the main thread, ensuring the UI remains responsive.

## Key Logic
- **`exportProcessor.ts`**: Handles parallel image rendering for export. Uses a direct 2D context on an `OffscreenCanvas` to bypass DOM dependencies required by heavy canvas libraries like Fabric.js.

## Rules of Engagement
- **Do** use workers for heavy computation or high-volume network requests.
- **Do** handle message passing asynchronously.
- **Do not** access the DOM or global `window` object within a worker.
- **Do** use `OffscreenCanvas` and direct 2D context for worker-side rendering to ensure environment compatibility.
- **Do not** import heavy main-thread-only dependencies (like full Fabric.js) into workers unless absolutely shimmed.
