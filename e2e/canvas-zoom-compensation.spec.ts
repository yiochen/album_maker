import type { Page } from 'playwright/test';
import { test, expect } from './fixtures';
import { APP_CONFIG } from '../src/config';

const base = APP_CONFIG.BASE_UI_SIZES;

interface ZoomSnapshot {
  zoomPercent: number;
  seamStrokeWidth: number | null;
  selectionLineWidth: number | null;
  cornerSize: number | null;
  borderLineWidth: number | null;
  placeholderStrokeWidth: number | null;
  plusHWidth: number | null;
  plusVHeight: number | null;
}

/**
 * Read all zoom-compensation-relevant Fabric properties plus the current
 * zoom percentage in a single evaluate call to avoid race conditions.
 */
async function getZoomSnapshot(page: Page): Promise<ZoomSnapshot> {
  return page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const canvas = (window as any).__FABRIC_CANVAS__;
    const zoomPercent = parseInt(
      document.querySelector('.zoom-display')?.textContent ?? '100'
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const seam = canvas?.getObjects().find((o: any) => o.data?.id === 'seam');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imageEl = canvas?.getObjects().find((o: any) => o.data?.id && o.data.id !== 'seam');
    const active = canvas?.getActiveObject();
    // CanvasImageElement is a fabric.Group — getObjects() returns its children:
    // [0] placeholderFrame, [1] placeholderPlusH, [2] placeholderPlusV, [3] innerImage, ...
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const children: any[] = imageEl?.getObjects?.() ?? [];
    return {
      zoomPercent,
      seamStrokeWidth: seam?.strokeWidth ?? null,
      selectionLineWidth: canvas?.selectionLineWidth ?? null,
      cornerSize: active?.cornerSize ?? null,
      // borderLineWidth is a custom property patched onto Fabric objects by fabricRenderer.ts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      borderLineWidth: (active as any)?.borderLineWidth ?? null,
      placeholderStrokeWidth: children[0]?.strokeWidth ?? null,
      plusHWidth: children[1]?.width ?? null,
      plusVHeight: children[2]?.height ?? null,
    };
  });
}

async function ensureFixedZoomMode(page: Page): Promise<number> {
  const fitButton = page.getByTestId('fit-zoom-button');
  await expect(fitButton).toBeVisible();
  if ((await fitButton.getAttribute('aria-pressed')) === 'true') {
    await fitButton.click();
    await expect(fitButton).toHaveAttribute('aria-pressed', 'false');
  }

  const zoomText = await page.locator('.zoom-display').textContent();
  return parseInt(zoomText ?? '100', 10);
}

/**
 * Click the zoom-in button and wait for the display and Fabric state to update.
 * Returns the new zoom percentage.
 */
async function zoomInAndWait(page: Page): Promise<number> {
  const currentZoom = parseInt(
    await page.locator('.zoom-display').textContent() ?? '100',
    10
  );
  const nextZoom = Math.min(200, currentZoom + 25);
  await page.getByTitle('Zoom in').click();
  await expect(page.locator('.zoom-display')).toHaveText(`${nextZoom}%`, { timeout: 3000 });
  return nextZoom;
}

/**
 * Add a placeholder image element via the toolbar and programmatically select it.
 */
async function addPlaceholderAndSelect(page: Page): Promise<void> {
  await page.getByTestId('add-image-btn').click();
  await expect(page.getByText('Drag images here')).toHaveCount(0, { timeout: 3000 });

  const selected = await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fabricCanvas = (window as any).__FABRIC_CANVAS__;
    if (!fabricCanvas) return false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const objects = fabricCanvas.getObjects().filter((o: any) => o.data?.id !== 'seam');
    if (objects.length === 0) return false;
    fabricCanvas.setActiveObject(objects[0]);
    fabricCanvas.requestRenderAll();
    return true;
  });
  expect(selected).toBe(true);
  await expect(page.getByTestId('canvas-container')).toHaveAttribute(
    'data-has-selection', 'true', { timeout: 3000 }
  );
}

test.describe('Canvas Zoom Compensation', () => {

  test.describe('DOM Structure', () => {
    test('canvas-page-highlight is an ancestor of the interaction layer', async ({ appPage }) => {
      // The .canvas-page-highlight element must sit OUTSIDE the scaled container
      // ([data-testid="interaction-layer"] has transform: scale(zoom/100)).
      // If it were a descendant, the ::before pseudo-element offsets would be
      // multiplied by the CSS zoom transform, making the border grow/shrink with zoom.
      await test.step('Verify highlight wraps the scaled container', async () => {
        const isAncestor = await appPage.evaluate(() => {
          const highlight = document.querySelector('.canvas-page-highlight');
          const layer = document.querySelector('[data-testid="interaction-layer"]');
          return !!highlight?.contains(layer);
        });
        expect(isAncestor).toBe(true);
      });
    });
  });

  test.describe('Seam Line', () => {
    test('seam strokeWidth stays constant in screen pixels across zoom changes', async ({ appPage }) => {
      let snap1!: ZoomSnapshot;

      await test.step('Verify invariant at initial zoom', async () => {
        await ensureFixedZoomMode(appPage);
        await expect(async () => {
          snap1 = await getZoomSnapshot(appPage);
          expect(snap1.seamStrokeWidth).not.toBeNull();
          // Invariant: canvasCoordValue × (zoom/100) ≈ base screen-pixel size
          expect(snap1.seamStrokeWidth! * (snap1.zoomPercent / 100))
            .toBeCloseTo(base.seamStrokeWidth, 1);
        }).toPass({ timeout: 5000 });
      });

      await test.step('Zoom in one step', async () => {
        await zoomInAndWait(appPage);
      });

      await test.step('Verify invariant still holds and canvas value changed', async () => {
        await expect(async () => {
          const snap2 = await getZoomSnapshot(appPage);
          expect(snap2.seamStrokeWidth! * (snap2.zoomPercent / 100))
            .toBeCloseTo(base.seamStrokeWidth, 1);
          // The canvas-coord value must have changed to maintain the constant screen size
          expect(snap2.seamStrokeWidth).not.toBeCloseTo(snap1.seamStrokeWidth!, 3);
        }).toPass({ timeout: 3000 });
      });
    });
  });

  test.describe('Canvas Selection Box', () => {
    test('selectionLineWidth stays constant in screen pixels across zoom changes', async ({ appPage }) => {
      let snap1!: ZoomSnapshot;

      await test.step('Verify invariant at initial zoom', async () => {
        await ensureFixedZoomMode(appPage);
        await expect(async () => {
          snap1 = await getZoomSnapshot(appPage);
          expect(snap1.selectionLineWidth).not.toBeNull();
          expect(snap1.selectionLineWidth! * (snap1.zoomPercent / 100))
            .toBeCloseTo(base.selectionLineWidth, 1);
        }).toPass({ timeout: 5000 });
      });

      await test.step('Zoom in one step', async () => {
        await zoomInAndWait(appPage);
      });

      await test.step('Verify invariant still holds and canvas value changed', async () => {
        await expect(async () => {
          const snap2 = await getZoomSnapshot(appPage);
          expect(snap2.selectionLineWidth! * (snap2.zoomPercent / 100))
            .toBeCloseTo(base.selectionLineWidth, 1);
          expect(snap2.selectionLineWidth).not.toBeCloseTo(snap1.selectionLineWidth!, 3);
        }).toPass({ timeout: 3000 });
      });
    });
  });

  test.describe('Selected Element Controls', () => {
    test.beforeEach(async ({ appPage }) => {
      await addPlaceholderAndSelect(appPage);
    });

    test('cornerSize stays constant in screen pixels across zoom changes', async ({ appPage }) => {
      let snap1!: ZoomSnapshot;

      await test.step('Verify invariant at initial zoom', async () => {
        await ensureFixedZoomMode(appPage);
        await expect(async () => {
          snap1 = await getZoomSnapshot(appPage);
          expect(snap1.cornerSize).not.toBeNull();
          expect(snap1.cornerSize! * (snap1.zoomPercent / 100))
            .toBeCloseTo(base.cornerSize, 1);
        }).toPass({ timeout: 3000 });
      });

      await test.step('Zoom in one step', async () => {
        await zoomInAndWait(appPage);
      });

      await test.step('Verify invariant still holds and canvas value changed', async () => {
        await expect(async () => {
          const snap2 = await getZoomSnapshot(appPage);
          expect(snap2.cornerSize! * (snap2.zoomPercent / 100))
            .toBeCloseTo(base.cornerSize, 1);
          expect(snap2.cornerSize).not.toBeCloseTo(snap1.cornerSize!, 3);
        }).toPass({ timeout: 3000 });
      });
    });

    test('border line width stays constant in screen pixels across zoom changes', async ({ appPage }) => {
      let snap1!: ZoomSnapshot;

      await test.step('Verify invariant at initial zoom', async () => {
        await ensureFixedZoomMode(appPage);
        await expect(async () => {
          snap1 = await getZoomSnapshot(appPage);
          expect(snap1.borderLineWidth).not.toBeNull();
          expect(snap1.borderLineWidth! * (snap1.zoomPercent / 100))
            .toBeCloseTo(base.borderWidth, 1);
        }).toPass({ timeout: 3000 });
      });

      await test.step('Zoom in one step', async () => {
        await zoomInAndWait(appPage);
      });

      await test.step('Verify invariant still holds and canvas value changed', async () => {
        await expect(async () => {
          const snap2 = await getZoomSnapshot(appPage);
          expect(snap2.borderLineWidth! * (snap2.zoomPercent / 100))
            .toBeCloseTo(base.borderWidth, 1);
          expect(snap2.borderLineWidth).not.toBeCloseTo(snap1.borderLineWidth!, 3);
        }).toPass({ timeout: 3000 });
      });
    });
  });

  test.describe('Placeholder Image Frame and Plus', () => {
    test.beforeEach(async ({ appPage }) => {
      await appPage.getByTestId('add-image-btn').click();
      await expect(appPage.getByText('Drag images here')).toHaveCount(0, { timeout: 3000 });
    });

    test('placeholder frame strokeWidth stays constant in screen pixels across zoom changes', async ({ appPage }) => {
      let snap1!: ZoomSnapshot;

      await test.step('Verify invariant at initial zoom', async () => {
        await expect(async () => {
          snap1 = await getZoomSnapshot(appPage);
          expect(snap1.placeholderStrokeWidth).not.toBeNull();
          // Base strokeWidth = 1 screen pixel; canvas value = 1 / (zoom/100)
          expect(snap1.placeholderStrokeWidth! * (snap1.zoomPercent / 100))
            .toBeCloseTo(1, 1);
        }).toPass({ timeout: 3000 });
      });

      await test.step('Zoom in one step', async () => {
        await zoomInAndWait(appPage, snap1.zoomPercent);
      });

      await test.step('Verify invariant still holds and canvas value changed', async () => {
        await expect(async () => {
          const snap2 = await getZoomSnapshot(appPage);
          expect(snap2.placeholderStrokeWidth! * (snap2.zoomPercent / 100))
            .toBeCloseTo(1, 1);
          expect(snap2.placeholderStrokeWidth).not.toBeCloseTo(snap1.placeholderStrokeWidth!, 3);
        }).toPass({ timeout: 3000 });
      });
    });

    test('placeholder plus symbol dimensions stay constant in screen pixels across zoom changes', async ({ appPage }) => {
      // The plus is clamped to [24, 40] screen pixels along its long axis
      let snap1!: ZoomSnapshot;

      await test.step('Verify screen-space size is within clamped range at initial zoom', async () => {
        await expect(async () => {
          snap1 = await getZoomSnapshot(appPage);
          expect(snap1.plusHWidth).not.toBeNull();
          expect(snap1.plusVHeight).not.toBeNull();
          const screenH = snap1.plusHWidth! * (snap1.zoomPercent / 100);
          const screenV = snap1.plusVHeight! * (snap1.zoomPercent / 100);
          expect(screenH).toBeGreaterThanOrEqual(23.5);
          expect(screenH).toBeLessThanOrEqual(40.5);
          expect(screenV).toBeGreaterThanOrEqual(23.5);
          expect(screenV).toBeLessThanOrEqual(40.5);
        }).toPass({ timeout: 3000 });
      });

      await test.step('Zoom in one step', async () => {
        await zoomInAndWait(appPage, snap1.zoomPercent);
      });

      await test.step('Verify screen-space size still in range and canvas value changed', async () => {
        await expect(async () => {
          const snap2 = await getZoomSnapshot(appPage);
          const screenH = snap2.plusHWidth! * (snap2.zoomPercent / 100);
          const screenV = snap2.plusVHeight! * (snap2.zoomPercent / 100);
          expect(screenH).toBeGreaterThanOrEqual(23.5);
          expect(screenH).toBeLessThanOrEqual(40.5);
          expect(screenV).toBeGreaterThanOrEqual(23.5);
          expect(screenV).toBeLessThanOrEqual(40.5);
          // Canvas-coord values must have updated
          expect(snap2.plusHWidth).not.toBeCloseTo(snap1.plusHWidth!, 3);
        }).toPass({ timeout: 3000 });
      });
    });
  });
});
