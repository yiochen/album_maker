# Services Directory (`src/services`)

## Purpose
Contains pure business logic and external integrations, such as export generation and storage abstraction layers.

## Key Logic
- **Storage (`storage.ts`)**:
  - Album create/load/save/import/export.
  - Debounced + immediate save flows for IndexedDB persistence.
- **Image Upload (`imageUploadService.ts`)**:
  - Handles HEIC/HEIF conversion fallback.
  - Extracts metadata (EXIF), generates preview/thumbnail blobs, and writes uploaded assets into IndexedDB.
- **Template Layout (`templateLayout.ts`)**:
  - Converts template definitions to normalized `PageElement.box` values for selected spread side.
- **Text Editing Services**:
  - `textEditorExtensions.ts`: Tiptap extension setup.
  - `textEditorLayout.ts`: Overlay/editor sizing math.
  - `textLayoutMeasurementService.ts`: DOM measurement host for text layout.
  - `textSnapshot.ts`: Serialize editor DOM to runs/snapshots.

## Rules of Engagement
- **Do** keep services stateless where possible.
- **Do** handle errors gracefully and propagate them to the UI layer.
- **Do not** depend on UI components or React hooks within services (pure logic only).
- **Do** keep file/IO boundaries in services and keep render math in `src/utils/*Renderer.ts`.
