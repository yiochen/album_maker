# Components Directory (`src/components`)

## Purpose
Contains all React UI components for the application, including the main Canvas, panels, and reusable UI elements like Modals.

## Key Components

### Core Layout
- **AlbumEditor (`AlbumEditor.tsx`)**: The main editor interface, managing the `useAlbum` hook and layout of the toolbar, canvas, and panels. Extracted from `App.tsx`.
- **LoadingScreen (`LoadingScreen.tsx`)**: A reusable full-screen or component-level loading indicator.

### Canvas
- **Canvas (`Canvas.tsx`)**:
  - The view layer for the Fabric.js canvas.
  - Delegates rendering logic to `useCanvasRender`.
  - Delegates interaction logic to `useCanvasInteraction`.
  - Uses `APP_CONFIG` for global configuration (PPI, sizes, etc.).

### Navigation
- **PageNavigator (`PageNavigator.tsx`)**: The sidebar for navigating spreads.
- **SpreadThumbnail (`SpreadThumbnail.tsx`)**: Individual spread thumbnail component, handling lazy loading and intersection observation.

### Modals
- **Modals (`Modal.tsx`)**: Reusable dialog component handling overlays and keyboard (Escape) interactions.

## Business Logic & Configuration

### Configuration
We use a global configuration file `src/config.ts` (`APP_CONFIG`) to avoid magic constants in components.
- **PPI**: 300 (Print), 96 (Screen)
- **UI Sizes**: Defined in `APP_CONFIG.BASE_UI_SIZES` and scaled via `getZoomCompensatedSizes`.
- **Margins**: Bleed margins, drag preview sizes, etc.

### Canvas Dimensions & Coordinates
- **Absolute Pixels**: The application uses absolute pixels at 300 PPI for positioning.
- **Spread Model**: The canvas represents a 2-page spread.
- **Zoom**: Handled via CSS transforms, managed by `useCanvasRender`.

## Rules of Engagement
- **Do** use `data-testid` attributes on interactive elements to support Cypress testing.
- **Do** explicitly close Modals in Cypress tests.
- **Do** use `APP_CONFIG` instead of hardcoded numbers.
- **Do not** mix heavy business logic directly into view components; delegate to hooks or commands.
