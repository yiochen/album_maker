# Components Directory (`src/components`)

## Purpose
Contains all React UI components for the application, including the main Canvas, panels, and reusable UI elements like Modals.

## Key Logic
- **Canvas (`Canvas.tsx`)**:
  - Uses `fabric.js` for rendering and interaction.
  - Manages internal Fabric state and syncs it with React props via `useEffect`.
  - Handles specialized logic for snapping, zooming, and drag-and-drop.
- **Modals (`Modal.tsx`)**:
  - Reusable dialog component handling overlays and keyboard (Escape) interactions.
- **Separation of Concerns**: Visual components focus on rendering; logic is often extracted to hooks (e.g., `src/hooks/useCanvasInteraction.ts`).

## Rules of Engagement
- **Do** use `data-testid` attributes on interactive elements to support Cypress testing.
- **Do** explicitly close Modals in Cypress tests (using `[data-testid='modal-close']` or overlay) before interacting with underlying elements.
- **Do** treat `Canvas.tsx` with care; ensure Fabric object state remains synced with the React/Redux store without causing infinite update loops.
- **Do not** mix heavy business logic directly into view components; delegate to hooks or commands.
