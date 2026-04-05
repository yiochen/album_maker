import { test, expect, openImagePool, importDummyImages } from './fixtures';

test.describe('Image Pool', () => {
  test('displays image pool title', async ({ appPage }) => {
    await test.step('Open image pool and verify title', async () => {
      await openImagePool(appPage);
      await expect(appPage.getByRole('heading', { name: /Image Pool/ })).toBeVisible();
    });
  });

  test('closes image pool when toggling nav rail', async ({ appPage }) => {
    await test.step('Open image pool and close it via nav rail toggle', async () => {
      await openImagePool(appPage);
      // Click the same nav icon again to collapse
      await appPage.getByTestId('nav-images').click();
      await expect(appPage.getByTestId('image-pool')).toHaveCount(0);
    });
  });

  test('has source selector dropdown', async ({ appPage }) => {
    await test.step('Open image pool and verify source selector', async () => {
      await openImagePool(appPage);
      await expect(appPage.getByTestId('source-selector')).toBeVisible();
    });
  });

  test('has dummy colors source available', async ({ appPage }) => {
    await test.step('Verify dummy-colors option exists', async () => {
      await openImagePool(appPage);
      await expect(appPage.locator('[data-testid="source-selector"] option[value="dummy-colors"]')).toHaveCount(1);
    });
  });

  test('selects different image sources', async ({ appPage }) => {
    await test.step('Select dummy-colors source', async () => {
      await openImagePool(appPage);
      const sourceSelect = appPage.getByTestId('source-selector');
      await sourceSelect.selectOption('dummy-colors');
      await expect(sourceSelect).toHaveValue('dummy-colors');
    });
  });

  test('displays import button', async ({ appPage }) => {
    await test.step('Verify import button is visible', async () => {
      await openImagePool(appPage);
      await expect(appPage.getByTestId('image-pool').getByRole('button', { name: /^Import$/ })).toBeVisible();
    });
  });

  test('shows empty state when no images imported', async ({ appPage }) => {
    await test.step('Verify empty state message', async () => {
      await openImagePool(appPage);
      await expect(appPage.getByTestId('pool-empty')).toBeVisible();
    });
  });

  test('imports images from dummy colors source', async ({ appPage }) => {
    await test.step('Import dummy images and verify pool items', async () => {
      await importDummyImages(appPage);
      await expect.poll(async () => appPage.getByTestId('pool-image').count()).toBeGreaterThan(0);
    });
  });

  test('displays image count after import', async ({ appPage }) => {
    await test.step('Import images and check title count text', async () => {
      await importDummyImages(appPage);
      await expect(appPage.getByTestId('image-pool-title')).toContainText('images');
    });
  });

  test('has draggable images using @dnd-kit', async ({ appPage }) => {
    await test.step('Import images and verify draggable items exist', async () => {
      await importDummyImages(appPage);
      await expect(appPage.getByTestId('pool-image').first()).toBeVisible();
    });
  });

  test('displays image thumbnails', async ({ appPage }) => {
    await test.step('Import images and verify thumbnail imgs', async () => {
      await importDummyImages(appPage);
      await expect.poll(async () => appPage.locator('[data-testid="pool-image"] img').count()).toBeGreaterThan(0);
    });
  });

  test('persists imported images after closing and reopening pool', async ({ appPage }) => {
    await test.step('Import images and capture count', async () => {
      await importDummyImages(appPage);
    });

    await test.step('Close and reopen image pool', async () => {
      const countBefore = await appPage.getByTestId('pool-image').count();
      // Toggle off via nav rail
      await appPage.getByTestId('nav-images').click();
      await expect(appPage.getByTestId('image-pool')).toHaveCount(0);

      await openImagePool(appPage);
      await expect(appPage.getByTestId('pool-image')).toHaveCount(countBefore);
    });
  });

  test('shows template panel when a single image is selected', async ({ appPage }) => {
    await test.step('Import images and select one', async () => {
      await importDummyImages(appPage);
      await appPage.getByTestId('pool-image').first().click();
    });

    await test.step('Verify single selection and template panel', async () => {
      await expect(appPage.getByTestId('pool-image').first()).toHaveAttribute('data-selected', 'true');
      await expect(appPage.getByTestId('image-pool-template-panel')).toBeVisible();
      await expect(appPage.getByTestId('selected-image-template-panel')).toBeVisible();
    });
  });

  test('supports cmd/ctrl multi-select and plain click resets to single selection', async ({ appPage, browserName }) => {
    await test.step('Import images and multi-select two', async () => {
      await importDummyImages(appPage);
      const first = appPage.getByTestId('pool-image').nth(0);
      const second = appPage.getByTestId('pool-image').nth(1);
      const modifier = browserName === 'webkit' ? 'Meta' : 'Control';

      await first.click();
      await second.click({ modifiers: [modifier] });
    });

    await test.step('Verify two selected, then plain click resets to one', async () => {
      const poolImages = appPage.getByTestId('pool-image');
      await expect(poolImages.nth(0)).toHaveAttribute('data-selected', 'true');
      await expect(poolImages.nth(1)).toHaveAttribute('data-selected', 'true');

      await poolImages.nth(1).click();

      await expect(poolImages.nth(0)).toHaveAttribute('data-selected', 'false');
      await expect(poolImages.nth(1)).toHaveAttribute('data-selected', 'true');
      await expect(appPage.getByTestId('image-pool-template-panel')).toBeVisible();
    });
  });

  test('clears pool selection on canvas mouse down', async ({ appPage }) => {
    await test.step('Import images and select one', async () => {
      await importDummyImages(appPage);
      await appPage.getByTestId('pool-image').first().click();
      await expect(appPage.getByTestId('image-pool-template-panel')).toBeVisible();
    });

    await test.step('Mouse down on canvas clears pool selection', async () => {
      await appPage.getByTestId('interaction-layer').click({ position: { x: 40, y: 40 } });
      await expect(appPage.getByTestId('pool-image').first()).toHaveAttribute('data-selected', 'false');
      await expect(appPage.getByTestId('image-pool-template-panel')).toHaveCount(0);
    });
  });

  test('is vertically scrollable when many images are imported', async ({ appPage }) => {
    await test.step('Import images', async () => {
      await importDummyImages(appPage);
    });

    await test.step('Verify image pool content scrolls', async () => {
      const content = appPage.locator('[data-testid="side-panel"] .side-panel-content');
      const metrics = await content.evaluate((node) => {
        const el = node as HTMLElement;
        return {
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
        };
      });

      expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);

      await content.evaluate((node) => {
        (node as HTMLElement).scrollTop = 200;
      });

      await expect.poll(async () => {
        return content.evaluate((node) => (node as HTMLElement).scrollTop);
      }).toBeGreaterThan(0);
    });
  });
});
