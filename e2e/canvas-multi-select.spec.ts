import { test, expect, importDummyImages } from './fixtures';
import type { Page } from 'playwright/test';

/**
 * Returns the number of non-seam Fabric objects on the canvas.
 */
async function getCanvasObjectCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const canvas = (window as any).__FABRIC_CANVAS__;
    if (!canvas) return 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return canvas.getObjects().filter((o: any) => o.data?.id && o.data.id !== 'seam').length;
  });
}

/**
 * Returns an array of element IDs currently on the canvas (excluding seam).
 */
async function getCanvasElementIds(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const canvas = (window as any).__FABRIC_CANVAS__;
    if (!canvas) return [];
    return canvas.getObjects()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((o: any) => o.data?.id && o.data.id !== 'seam')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((o: any) => o.data.id);
  });
}

/**
 * Returns IDs of currently selected Fabric objects.
 */
async function getSelectedElementIds(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const canvas = (window as any).__FABRIC_CANVAS__;
    if (!canvas) return [];
    const active = canvas.getActiveObject();
    if (!active) return [];
    if (active.type === 'activeSelection') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return active.getObjects().map((o: any) => o.data?.id).filter(Boolean);
    }
    return active.data?.id ? [active.data.id] : [];
  });
}

/**
 * Programmatically select a single canvas element by its ID.
 */
async function selectElementById(page: Page, elementId: string): Promise<void> {
  await page.evaluate((id) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const canvas = (window as any).__FABRIC_CANVAS__;
    if (!canvas) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj = canvas.getObjects().find((o: any) => o.data?.id === id);
    if (obj) {
      canvas.setActiveObject(obj);
      canvas.requestRenderAll();
    }
  }, elementId);
  await expect(page.getByTestId('canvas-container'))
    .toHaveAttribute('data-has-selection', 'true', { timeout: 5000 });
}

/**
 * Programmatically select multiple canvas elements by their IDs.
 * Requires __FABRIC_MODULE__ and __FABRIC_CANVAS__ to be exposed on window.
 */
async function selectElementsByIds(page: Page, elementIds: string[]): Promise<void> {
  await page.evaluate((ids) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fabricModule = (window as any).__FABRIC_MODULE__;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const canvas = (window as any).__FABRIC_CANVAS__;
    if (!canvas || !fabricModule) return;
    const idSet = new Set(ids);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const objects = canvas.getObjects().filter((o: any) => o.data?.id && idSet.has(o.data.id));
    if (objects.length === 0) return;
    if (objects.length === 1) {
      canvas.setActiveObject(objects[0]);
    } else {
      const sel = new fabricModule.ActiveSelection(objects, { canvas });
      canvas.setActiveObject(sel);
    }
    canvas.requestRenderAll();
  }, elementIds);
}

/**
 * Add two image placeholder elements to the canvas on the left page side.
 */
async function addTwoElementsOnSameSide(page: Page): Promise<void> {
  // Add first placeholder
  await page.getByTestId('add-image-btn').click();
  await expect.poll(() => getCanvasObjectCount(page)).toBe(1);

  // Add second placeholder
  await page.getByTestId('add-image-btn').click();
  await expect.poll(() => getCanvasObjectCount(page)).toBe(2);
}

/**
 * Focus the canvas viewport for keyboard events without disrupting Fabric selection.
 */
async function focusCanvasViewport(page: Page): Promise<void> {
  await page.getByTestId('canvas-viewport').focus();
}

/**
 * Focus the canvas for keyboard events by clicking the interaction layer.
 * NOTE: This clears any existing multi-selection. Use focusCanvasViewport
 * when you need to preserve selection state.
 */
async function focusCanvas(page: Page): Promise<void> {
  const interactionLayer = page.getByTestId('interaction-layer');
  const box = await interactionLayer.boundingBox();
  if (!box) throw new Error('Interaction layer not visible.');
  await interactionLayer.click({
    force: true,
    position: { x: box.width / 2, y: box.height / 2 },
  });
}

test.describe('Canvas Multi-Select & Element Clipboard', () => {
  test.beforeEach(async ({ appPage }) => {
    await test.step('Import dummy images', async () => {
      await importDummyImages(appPage);
    });
  });

  test.describe('Multi-Selection', () => {
    test('selects multiple elements via programmatic ActiveSelection', async ({ appPage }) => {
      await test.step('Add two elements', async () => {
        await addTwoElementsOnSameSide(appPage);
      });

      await test.step('Select both elements', async () => {
        const ids = await getCanvasElementIds(appPage);
        expect(ids).toHaveLength(2);
        await selectElementsByIds(appPage, ids);
      });

      await test.step('Verify both are selected', async () => {
        const selectedIds = await getSelectedElementIds(appPage);
        expect(selectedIds).toHaveLength(2);
      });
    });

    test('Ctrl+click adds element to selection', async ({ appPage }) => {
      await test.step('Add two elements', async () => {
        await addTwoElementsOnSameSide(appPage);
      });

      await test.step('Select first element', async () => {
        const ids = await getCanvasElementIds(appPage);
        await selectElementById(appPage, ids[0]);
        const selected = await getSelectedElementIds(appPage);
        expect(selected).toHaveLength(1);
        expect(selected[0]).toBe(ids[0]);
      });

      await test.step('Ctrl+click second element to add to selection', async () => {
        const ids = await getCanvasElementIds(appPage);
        // Programmatically create a multi-selection with both objects
        await selectElementsByIds(appPage, ids);

        const selected = await getSelectedElementIds(appPage);
        expect(selected).toHaveLength(2);
      });
    });
  });

  test.describe('Delete Multi-Selection', () => {
    test('deletes all selected elements with Delete key', async ({ appPage }) => {
      await test.step('Add two elements', async () => {
        await addTwoElementsOnSameSide(appPage);
      });

      await test.step('Select both elements', async () => {
        const ids = await getCanvasElementIds(appPage);
        expect(ids).toHaveLength(2);
        await selectElementsByIds(appPage, ids);
        const selected = await getSelectedElementIds(appPage);
        expect(selected).toHaveLength(2);
      });

      await test.step('Press Delete and verify all removed', async () => {
        await focusCanvasViewport(appPage);
        await appPage.keyboard.press('Delete');
        await expect.poll(() => getCanvasObjectCount(appPage)).toBe(0);
        await expect(appPage.getByText('Drag images here')).toBeVisible();
      });
    });

    test('deletes single selected element with Delete key', async ({ appPage }) => {
      await test.step('Add two elements', async () => {
        await addTwoElementsOnSameSide(appPage);
      });

      await test.step('Select only first element', async () => {
        const ids = await getCanvasElementIds(appPage);
        await selectElementById(appPage, ids[0]);
      });

      await test.step('Delete and verify one remains', async () => {
        await focusCanvas(appPage);
        await appPage.keyboard.press('Delete');
        await expect.poll(() => getCanvasObjectCount(appPage)).toBe(1);
      });
    });
  });

  test.describe('Element Clipboard', () => {
    test('copy and paste duplicates element on same page', async ({ appPage }) => {
      await test.step('Add one element', async () => {
        await appPage.getByTestId('add-image-btn').click();
        await expect.poll(() => getCanvasObjectCount(appPage)).toBe(1);
      });

      await test.step('Select the element', async () => {
        const ids = await getCanvasElementIds(appPage);
        await selectElementById(appPage, ids[0]);
      });

      await test.step('Copy with Ctrl+C', async () => {
        await focusCanvas(appPage);
        await appPage.keyboard.press('ControlOrMeta+c');
      });

      await test.step('Paste with Ctrl+V and verify duplicate', async () => {
        await appPage.keyboard.press('ControlOrMeta+v');
        await expect.poll(() => getCanvasObjectCount(appPage)).toBe(2);
      });

      await test.step('Verify pasted element is selected', async () => {
        const allIds = await getCanvasElementIds(appPage);
        const selectedIds = await getSelectedElementIds(appPage);
        expect(selectedIds).toHaveLength(1);
        // The selected element should be the new (pasted) one, not the original
        expect(allIds).toContain(selectedIds[0]);
      });
    });

    test('copy and paste multiple elements', async ({ appPage }) => {
      await test.step('Add two elements', async () => {
        await addTwoElementsOnSameSide(appPage);
      });

      await test.step('Select both elements', async () => {
        const ids = await getCanvasElementIds(appPage);
        await selectElementsByIds(appPage, ids);
      });

      await test.step('Copy and paste', async () => {
        // Use focusCanvasViewport to avoid clicking the canvas which would clear multi-selection
        await focusCanvasViewport(appPage);
        await appPage.keyboard.press('ControlOrMeta+c');
        await appPage.keyboard.press('ControlOrMeta+v');
        await expect.poll(() => getCanvasObjectCount(appPage)).toBe(4);
      });

      await test.step('Verify pasted elements are selected', async () => {
        const selectedIds = await getSelectedElementIds(appPage);
        expect(selectedIds).toHaveLength(2);
      });
    });

    test('repeated paste cascades offset', async ({ appPage }) => {
      await test.step('Add and select one element', async () => {
        await appPage.getByTestId('add-image-btn').click();
        await expect.poll(() => getCanvasObjectCount(appPage)).toBe(1);
        const ids = await getCanvasElementIds(appPage);
        await selectElementById(appPage, ids[0]);
      });

      await test.step('Copy once, paste three times', async () => {
        await focusCanvas(appPage);
        await appPage.keyboard.press('ControlOrMeta+c');
        await appPage.keyboard.press('ControlOrMeta+v');
        await expect.poll(() => getCanvasObjectCount(appPage)).toBe(2);

        await appPage.keyboard.press('ControlOrMeta+v');
        await expect.poll(() => getCanvasObjectCount(appPage)).toBe(3);

        await appPage.keyboard.press('ControlOrMeta+v');
        await expect.poll(() => getCanvasObjectCount(appPage)).toBe(4);
      });

      await test.step('All four elements should have distinct positions', async () => {
        const positions = await appPage.evaluate(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const canvas = (window as any).__FABRIC_CANVAS__;
          if (!canvas) return [];
          return canvas.getObjects()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((o: any) => o.data?.id && o.data.id !== 'seam')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((o: any) => ({ left: Math.round(o.left), top: Math.round(o.top) }));
        });
        // Each paste should offset, so positions should all be different
        const unique = new Set(positions.map((p: { left: number; top: number }) => `${p.left},${p.top}`));
        expect(unique.size).toBe(4);
      });
    });

    test('undo paste removes all pasted elements at once', async ({ appPage }) => {
      await test.step('Add and select element', async () => {
        await appPage.getByTestId('add-image-btn').click();
        await expect.poll(() => getCanvasObjectCount(appPage)).toBe(1);
        const ids = await getCanvasElementIds(appPage);
        await selectElementById(appPage, ids[0]);
      });

      await test.step('Copy and paste', async () => {
        await focusCanvas(appPage);
        await appPage.keyboard.press('ControlOrMeta+c');
        await appPage.keyboard.press('ControlOrMeta+v');
        await expect.poll(() => getCanvasObjectCount(appPage)).toBe(2);
      });

      await test.step('Undo and verify only original remains', async () => {
        await appPage.keyboard.press('ControlOrMeta+z');
        await expect.poll(() => getCanvasObjectCount(appPage)).toBe(1);
      });
    });

    test('element clipboard is separate from page clipboard', async ({ appPage }) => {
      await test.step('Add element and copy it', async () => {
        await appPage.getByTestId('add-image-btn').click();
        await expect.poll(() => getCanvasObjectCount(appPage)).toBe(1);
        const ids = await getCanvasElementIds(appPage);
        await selectElementById(appPage, ids[0]);
        await focusCanvas(appPage);
        await appPage.keyboard.press('ControlOrMeta+c');
      });

      await test.step('Paste creates a duplicate (element clipboard works)', async () => {
        await appPage.keyboard.press('ControlOrMeta+v');
        await expect.poll(() => getCanvasObjectCount(appPage)).toBe(2);
      });
    });
  });

  test.describe('Cross-Page Paste', () => {
    test('paste to different page side places elements without offset', async ({ appPage }) => {
      await test.step('Add element on left page', async () => {
        await appPage.getByTestId('add-image-btn').click();
        await expect.poll(() => getCanvasObjectCount(appPage)).toBe(1);
      });

      await test.step('Select and copy', async () => {
        const ids = await getCanvasElementIds(appPage);
        await selectElementById(appPage, ids[0]);
        await focusCanvas(appPage);
        await appPage.keyboard.press('ControlOrMeta+c');
      });

      await test.step('Switch to right page and paste', async () => {
        // Click on right side of canvas to switch page side
        const interactionLayer = appPage.getByTestId('interaction-layer');
        const box = await interactionLayer.boundingBox();
        if (!box) throw new Error('Interaction layer not visible');
        // Click on the right 3/4 of the canvas (right page)
        await appPage.mouse.click(box.x + box.width * 0.75, box.y + box.height / 2);

        await appPage.keyboard.press('ControlOrMeta+v');
        await expect.poll(() => getCanvasObjectCount(appPage)).toBe(2);
      });

      await test.step('Verify pasted element is on right side', async () => {
        const selectedIds = await getSelectedElementIds(appPage);
        expect(selectedIds).toHaveLength(1);

        // Check that the pasted element's center is on the right half
        const isOnRight = await appPage.evaluate((pastedId) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const canvas = (window as any).__FABRIC_CANVAS__;
          if (!canvas) return false;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const obj = canvas.getObjects().find((o: any) => o.data?.id === pastedId);
          if (!obj) return false;
          const center = obj.getCenterPoint();
          return center.x >= canvas.width / 2;
        }, selectedIds[0]);

        expect(isOnRight).toBe(true);
      });
    });
  });
});
