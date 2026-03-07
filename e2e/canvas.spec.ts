import { test, expect, importDummyImages, openPropertiesTab, dragFirstPoolImageToCanvas } from './fixtures';
import type { Page } from 'playwright/test';

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

  const canvasLayer = page.getByTestId('canvas-layer');
  const box = await canvasLayer.boundingBox();
  if (!box) {
    throw new Error('Canvas layer is not visible for selection.');
  }

  await canvasLayer.click({
    position: { x: box.width / 2, y: box.height / 2 },
  });

  await expect(canvasContainer).toHaveAttribute('data-has-selection', 'true');
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
        await appPage.getByRole('button', { name: 'Image' }).click();
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
        await appPage.getByRole('button', { name: 'Image' }).click();
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
        await appPage.getByTestId('canvas-viewport').click();
        await appPage.keyboard.press('Delete');
        await expect(appPage.getByRole('heading', { name: 'Spread Properties' })).toBeVisible();
      });
    });

    test('deletes selected element when pressing Backspace key', async ({ appPage }) => {
      await test.step('Ensure image is selected before backspace delete', async () => {
        await ensureCanvasSelection(appPage);
      });

      await test.step('Press Backspace and verify spread properties', async () => {
        await appPage.getByTestId('canvas-viewport').click();
        await appPage.keyboard.press('Backspace');
        await expect(appPage.getByRole('heading', { name: 'Spread Properties' })).toBeVisible();
      });
    });
  });
});
