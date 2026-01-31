# Workers Directory (`src/workers`)

## Purpose
Contains Web Workers to handle heavy or I/O-bound tasks off the main thread, ensuring the UI remains responsive.

## Key Logic
- **`imageFetcher.worker.ts`**: Handles parallel image fetching. It accepts request messages, performs `fetch` operations, and posts results (blobs or errors) back to the main thread.

## Rules of Engagement
- **Do** use workers for heavy computation or high-volume network requests.
- **Do** handle message passing asynchronously.
- **Do not** access the DOM or global `window` object within a worker.
- **Do not** import heavy main-thread-only dependencies into workers.
