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

## Canvas Sizing Business Logic

### Pixels Per Inch (PPI)
- `PPI = 300` (standard print resolution)
- Page dimensions in inches are converted to pixels: `pagePixels = inches × 300`

### Canvas Dimensions
- Canvas shows a two-page **spread** (left and right pages side by side)
- `canvasWidth = settings.pageWidth × 2 × PPI` (spread width in pixels)
- `canvasHeight = settings.pageHeight × PPI` (page height in pixels)
- Each individual page is `canvasWidth / 2` pixels wide

### Zoom Display
- The viewport shows the canvas scaled by the zoom percentage
- `displaySize = canvasPixelSize × (zoom / 100)`

### Image Drop Sizing
When an image is dropped onto the canvas:
1. **Element sizes are stored as percentages** of the page dimensions (0-100%)
2. Image size is calculated relative to page pixel dimensions:
   ```
   widthPercent = (imagePixelWidth / pagePixelWidth) × 100
   heightPercent = (imagePixelHeight / pagePixelHeight) × 100
   ```
3. Images are capped at 80% of page size to prevent overflow
4. Position is centered on the drop cursor location

### Coordinate System
- Element `position.x` and `position.y` are percentages (0-100) within the **individual page** (not the spread)
- Element `size.width` is percentage of page width; `size.height` is percentage of page height
- When rendering on the spread canvas, left page elements use offset `0`, right page elements use offset `canvasWidth / 2`

### Zoom-Independent UI Controls
Since zoom is applied via CSS `transform: scale()`, UI controls are scaled along with the canvas. To maintain consistent visual size regardless of zoom:

**Centralized Configuration:**
```typescript
const BASE_UI_SIZES = {
    cornerSize: 10,      // Resize handle size
    borderWidth: 1,      // Selection border width
    seamStrokeWidth: 2,  // Seam line width
    seamDash: 5,         // Seam dash pattern
    snapLineStrokeWidth: 1,  // Snap guideline width
    snapLineDash: 4,     // Snap guideline dash pattern
};
```

**Helper Function:** `getZoomCompensatedSizes(zoomPercent)` returns all sizes multiplied by `100 / zoom`

**Applied to:**
- **Seam line**: strokeWidth and strokeDashArray
- **Snap guidelines**: strokeWidth and strokeDashArray (magenta lines)
- **Resize handles**: cornerSize and borderScaleFactor
- **zoomRef**: Tracks current zoom for use in event callbacks

## Rules of Engagement
- **Do** use `data-testid` attributes on interactive elements to support Cypress testing.
- **Do** explicitly close Modals in Cypress tests (using `[data-testid='modal-close']` or overlay) before interacting with underlying elements.
- **Do** treat `Canvas.tsx` with care; ensure Fabric object state remains synced with the React/Redux store without causing infinite update loops.
- **Do not** mix heavy business logic directly into view components; delegate to hooks or commands.

### Cross-Page Interactions
- **Drag & Drop**: Elements can be freely dragged across the two-page spread.
- **Smart Ownership**: When an element is dropped (drag ends), the system calculates which page contains the element's center point. Ownership is automatically transferred to that page.
- **Bleed**: Elements can bleed off the edge of the canvas (partially visible). A 20px safety margin ensures elements are never completely lost off-screen.

### Aspect Ratio Logic
- **Smart Locking**:
    - Locking the aspect ratio respects the **current visual shape** of the element (even if distorted), rather than snapping back to the original image ratio.
    - Side handles (top/bottom/left/right) resize the element **proportionally** when locked, strictly enforcing the aspect ratio.
- **Reset functionality**:
    - Users can restore the image to its **original file aspect ratio** via the "Reset Image" button.
    - The original image ratio is preserved in `originalAspectRatio` even when the user toggles the lock on/off.

