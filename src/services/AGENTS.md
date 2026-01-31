# Services Directory (`src/services`)

## Purpose
Contains pure business logic and external integrations, such as export generation and storage abstraction layers.

## Key Logic
- **Export (`export.ts`)**:
  - Uses an off-screen HTML5 `Canvas` (not Fabric.js) to render pages for export.
  - Generates blobs for download without affecting the UI state.
- **Storage**: Provides abstractions over the database or other external storage systems.

## Rules of Engagement
- **Do** keep services stateless where possible.
- **Do** handle errors gracefully and propagate them to the UI layer.
- **Do not** depend on UI components or React hooks within services (pure logic only).
- **Do** ensure export logic mirrors the visual output of the `Canvas` component.
