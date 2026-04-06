import { test, expect } from './fixtures';

async function openLayoutsTab(page: import('playwright/test').Page): Promise<void> {
  await page.getByTestId('nav-templates').click();
  await expect(page.getByTestId('layout-picker')).toBeVisible();
}

test.describe('Layout Picker', () => {
  test('opens layouts tab via nav rail button', async ({ appPage }) => {
    await test.step('Click layouts nav icon and verify panel is active', async () => {
      await openLayoutsTab(appPage);
      await expect(appPage.getByTestId('nav-templates')).toHaveClass(/active/);
      await expect(appPage.getByTestId('layout-picker')).toBeVisible();
    });
  });

  test('shows filter buttons for image counts', async ({ appPage }) => {
    await test.step('Open layouts tab and verify filters exist', async () => {
      await openLayoutsTab(appPage);
      await expect(appPage.getByTestId('layout-picker-filter')).toBeVisible();
      await expect(appPage.getByTestId('layout-filter-all')).toBeVisible();
    });
  });

  test('filters templates by image count', async ({ appPage }) => {
    await test.step('Open layouts and apply a filter', async () => {
      await openLayoutsTab(appPage);
      const grid = appPage.getByTestId('layout-picker-grid');
      const allCount = await grid.locator('button').count();
      expect(allCount).toBeGreaterThan(0);

      // Click "1 image" filter
      await appPage.getByTestId('layout-filter-1').click();
      const filteredCount = await grid.locator('button').count();
      expect(filteredCount).toBeLessThanOrEqual(allCount);
      expect(filteredCount).toBeGreaterThan(0);
    });
  });

  test('applies template and switches to properties tab', async ({ appPage }) => {
    await test.step('Apply a template and verify tab switch', async () => {
      await openLayoutsTab(appPage);
      const grid = appPage.getByTestId('layout-picker-grid');
      const firstOption = grid.locator('button:not([disabled])').first();
      await expect(firstOption).toBeVisible();
      await firstOption.click();

      // Should switch back to properties panel
      await expect(appPage.getByTestId('nav-properties')).toHaveClass(/active/);
    });
  });

  test('does not advance active page when applying from the Templates tab', async ({ appPage }) => {
    await test.step('Apply a template from the standalone Templates tab', async () => {
      await expect(appPage.locator('.canvas-page-highlight-left')).toHaveCount(1);
      await openLayoutsTab(appPage);
      const grid = appPage.getByTestId('layout-picker-grid');
      const firstOption = grid.locator('button:not([disabled])').first();
      await expect(firstOption).toBeVisible();
      await firstOption.click();
    });

    await test.step('Verify active page side stays on the left page', async () => {
      await expect(appPage.locator('.canvas-page-highlight-left')).toHaveCount(1);
      await expect(appPage.locator('.canvas-page-highlight-right')).toHaveCount(0);
    });
  });

  test('displays template options in the grid', async ({ appPage }) => {
    await test.step('Open layouts and verify template options', async () => {
      await openLayoutsTab(appPage);
      const grid = appPage.getByTestId('layout-picker-grid');
      const options = grid.locator('button');
      const count = await options.count();
      expect(count).toBeGreaterThanOrEqual(3);
    });
  });
});
