import { test, expect, importDummyImages, openPropertiesTab, dragFirstPoolImageToCanvas } from './fixtures';
import type { Page } from 'playwright/test';

async function getFirstCanvasImageState(page: Page) {
  return page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fabricCanvas = (window as any).__FABRIC_CANVAS__;
    if (!fabricCanvas) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const image = fabricCanvas.getObjects().find((o: any) => o.data?.id !== 'seam');
    if (!image) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return JSON.parse(JSON.stringify((image as any).pageElement.content));
  });
}

async function importAndDropImage(page: Page) {
  await test.step('Import images to image pool', async () => {
    await importDummyImages(page);
  });

  await test.step('Drag first pool image onto canvas', async () => {
    await dragFirstPoolImageToCanvas(page);
    await expect(page.getByText('Drag images here')).toHaveCount(0);
  });

  await test.step('Open Properties tab and verify image selection', async () => {
    await openPropertiesTab(page);
    await expect(page.getByRole('heading', { name: 'Image Properties' })).toBeVisible();
  });
}

async function ensureCanvasSelection(page: Page): Promise<void> {
  const canvasContainer = page.getByTestId('canvas-container');
  if ((await canvasContainer.getAttribute('data-has-selection')) === 'true') {
    return;
  }

  // Programmatically select the first Fabric object via the canvas instance.
  // Pixel-based clicks are unreliable on headless CI due to software rendering
  // affecting Fabric's hit detection.
  const selected = await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fabricCanvas = (window as any).__FABRIC_CANVAS__;
    if (!fabricCanvas) return false;
    const objects = fabricCanvas.getObjects().filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (o: any) => o.data?.id !== 'seam'
    );
    if (objects.length === 0) return false;
    fabricCanvas.setActiveObject(objects[0]);
    fabricCanvas.requestRenderAll();
    return true;
  });

  if (selected) {
    // Wait for React state to propagate the selection
    await expect(canvasContainer).toHaveAttribute('data-has-selection', 'true', { timeout: 5000 });
    return;
  }

  // Fallback: click on the upper-canvas directly
  const upperCanvas = page.locator('.upper-canvas');
  const box = await upperCanvas.boundingBox();
  if (!box) {
    throw new Error('Fabric upper-canvas is not visible for selection.');
  }

  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(canvasContainer).toHaveAttribute('data-has-selection', 'true', { timeout: 5000 });
}

async function focusCanvasForKeyboard(page: Page): Promise<void> {
  const interactionLayer = page.getByTestId('interaction-layer');
  const box = await interactionLayer.boundingBox();
  if (!box) {
    throw new Error('Interaction layer is not visible for keyboard focus.');
  }

  await interactionLayer.click({
    force: true,
    position: { x: box.width / 2, y: box.height / 2 },
  });
}

test.describe('Canvas', () => {
  test.describe('Basic Canvas Operations', () => {
    test('displays the canvas container', async ({ appPage }) => {
      await test.step('Verify canvas container visibility', async () => {
        await expect(appPage.getByTestId('canvas-container')).toBeVisible();
      });
    });

    test('displays the canvas layer', async ({ appPage }) => {
      await test.step('Verify canvas layer visibility', async () => {
        await expect(appPage.getByTestId('canvas-layer')).toBeVisible();
      });
    });
  });

  test.describe('Image Drag and Drop', () => {
    test.beforeEach(async ({ appPage }) => {
      await test.step('Import dummy images', async () => {
        await importDummyImages(appPage);
      });
    });

    test('adds a placeholder image element from toolbar', async ({ appPage }) => {
      await test.step('Add image placeholder using toolbar', async () => {
        await appPage.getByTestId('add-image-btn').click();
      });

      await test.step('Verify image placeholder selection', async () => {
        await expect(appPage.getByText('Drag images here')).toHaveCount(0);
        await openPropertiesTab(appPage);
        await expect(appPage.getByRole('heading', { name: 'Image Properties' })).toBeVisible();
      });
    });

    test('allows dropping image onto canvas', async ({ appPage }) => {
      await test.step('Drag image from pool to canvas with pointer movement', async () => {
        await dragFirstPoolImageToCanvas(appPage);
      });

      await test.step('Verify dropped image selection in properties', async () => {
        await expect(appPage.getByText('Drag images here')).toHaveCount(0);
        await openPropertiesTab(appPage);
        await expect(appPage.getByRole('heading', { name: 'Image Properties' })).toBeVisible();
      });
    });

    test('replaces placeholder image when dropping onto it', async ({ appPage }) => {
      await test.step('Insert image placeholder', async () => {
        await appPage.getByTestId('add-image-btn').click();
      });

      await test.step('Drop pool image onto placeholder area', async () => {
        await dragFirstPoolImageToCanvas(appPage);
        await expect(appPage.getByTestId('canvas-container')).toHaveAttribute('data-has-selection', 'true');
      });

      await test.step('Delete once and verify canvas is empty', async () => {
        await appPage.keyboard.press('Delete');
        await expect(appPage.getByText('Drag images here')).toBeVisible();
      });
    });

    test('shows border controls for selected placeholder image', async ({ appPage }) => {
      await appPage.getByTestId('add-image-btn').click();
      await openPropertiesTab(appPage);
      await expect(appPage.getByTestId('image-border-width-input')).toBeVisible();
      await expect(appPage.getByTestId('image-border-color-input')).toBeVisible();
    });

    test('applies border to placeholder image', async ({ appPage }) => {
      await appPage.getByTestId('add-image-btn').click();
      await openPropertiesTab(appPage);

      await appPage.getByTestId('image-border-width-input').fill('12');
      await appPage.getByTestId('image-border-width-input').blur();
      await appPage.getByTestId('image-border-color-input').fill('#112233');

      await expect.poll(async () => {
        const content = await getFirstCanvasImageState(appPage);
        return content?.border;
      }).toEqual({ widthPt: 12, color: '#112233' });
    });

    test('preserves placeholder border when assigning a photo', async ({ appPage }) => {
      await appPage.getByTestId('add-image-btn').click();
      await openPropertiesTab(appPage);

      await appPage.getByTestId('image-border-width-input').fill('8');
      await appPage.getByTestId('image-border-width-input').blur();
      await appPage.getByTestId('image-border-color-input').fill('#224466');

      await importDummyImages(appPage);
      await dragFirstPoolImageToCanvas(appPage);

      await expect.poll(async () => {
        const content = await getFirstCanvasImageState(appPage);
        return {
          isPlaceholder: content?.isPlaceholder,
          border: content?.border,
        };
      }).toEqual({
        isPlaceholder: false,
        border: { widthPt: 8, color: '#224466' },
      });
    });

    test('updates real image border width and color', async ({ appPage }) => {
      await dragFirstPoolImageToCanvas(appPage);
      await openPropertiesTab(appPage);

      await appPage.getByTestId('image-border-width-input').fill('10.5');
      await appPage.getByTestId('image-border-width-input').blur();
      await appPage.getByTestId('image-border-color-input').fill('#334455');

      await expect.poll(async () => {
        const content = await getFirstCanvasImageState(appPage);
        return content?.border;
      }).toEqual({ widthPt: 10.5, color: '#334455' });
    });

    test('undoes and redoes border edits', async ({ appPage }) => {
      await dragFirstPoolImageToCanvas(appPage);
      await openPropertiesTab(appPage);

      await appPage.getByTestId('image-border-width-input').fill('9');
      await appPage.getByTestId('image-border-width-input').blur();
      await appPage.getByTestId('image-border-color-input').fill('#445566');

      await appPage.getByTitle('Undo (Ctrl+Z)').first().click();
      await expect.poll(async () => {
        const content = await getFirstCanvasImageState(appPage);
        return content?.border;
      }).toEqual({ widthPt: 9, color: '#ffffff' });

      await appPage.getByTitle('Undo (Ctrl+Z)').first().click();
      await expect.poll(async () => {
        const content = await getFirstCanvasImageState(appPage);
        return content?.border;
      }).toEqual({ widthPt: 0, color: '#ffffff' });

      await appPage.getByTitle('Redo (Ctrl+Y)').first().click();
      await expect.poll(async () => {
        const content = await getFirstCanvasImageState(appPage);
        return content?.border;
      }).toEqual({ widthPt: 9, color: '#ffffff' });

      await appPage.getByTitle('Redo (Ctrl+Y)').first().click();
      await expect.poll(async () => {
        const content = await getFirstCanvasImageState(appPage);
        return content?.border;
      }).toEqual({ widthPt: 9, color: '#445566' });
    });
  });

  test.describe('Element Selection', () => {
    test.beforeEach(async ({ appPage }) => {
      await importAndDropImage(appPage);
    });

    test('shows image properties when element is selected', async ({ appPage }) => {
      await test.step('Verify selected element shows image properties', async () => {
        await expect(appPage.getByRole('heading', { name: 'Image Properties' })).toBeVisible();
      });
    });
  });

  test.describe('Keyboard Interactions', () => {
    test.beforeEach(async ({ appPage }) => {
      await importAndDropImage(appPage);
    });

    test('deletes selected element when pressing Delete key', async ({ appPage }) => {
      await test.step('Ensure image is selected before delete', async () => {
        await ensureCanvasSelection(appPage);
      });

      await test.step('Press Delete and verify spread properties', async () => {
        await ensureCanvasSelection(appPage);
        await focusCanvasForKeyboard(appPage);
        await appPage.keyboard.press('Delete');
        await expect(appPage.getByRole('heading', { name: 'Spread Properties' })).toBeVisible();
      });
    });

    test('deletes selected element when pressing Backspace key', async ({ appPage }) => {
      await test.step('Ensure image is selected before backspace delete', async () => {
        await ensureCanvasSelection(appPage);
      });

      await test.step('Press Backspace and verify spread properties', async () => {
        await ensureCanvasSelection(appPage);
        await focusCanvasForKeyboard(appPage);
        await appPage.keyboard.press('Backspace');
        await expect(appPage.getByRole('heading', { name: 'Spread Properties' })).toBeVisible();
      });
    });
  });
});
