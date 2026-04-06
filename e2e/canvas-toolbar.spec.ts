import type { Page } from 'playwright/test';
import { test, expect } from './fixtures';

async function addSpreads(page: Page, count: number): Promise<void> {
  const addSpreadButton = page.getByRole('button', { name: 'Add Spread' });
  for (let i = 0; i < count; i += 1) {
    await addSpreadButton.click();
  }
}

test.describe('Canvas Toolbar', () => {
  test('shows icon buttons with tooltip titles', async ({ appPage }) => {
    await expect(appPage.getByTestId('canvas-control-prev-spread')).toHaveAttribute('title', 'Previous spread');
    await expect(appPage.getByTestId('canvas-control-prev-page')).toHaveAttribute('title', 'Previous page');
    await expect(appPage.getByTestId('canvas-control-next-page')).toHaveAttribute('title', 'Next page');
    await expect(appPage.getByTestId('canvas-control-next-spread')).toHaveAttribute('title', 'Next spread');
    await expect(appPage.getByTestId('canvas-control-insert-spread-before')).toHaveAttribute('title', 'Insert spread before');
    await expect(appPage.getByTestId('canvas-control-insert-spread-after')).toHaveAttribute('title', 'Insert spread after');
    await expect(appPage.getByTestId('canvas-control-zoom-out')).toHaveAttribute('title', 'Zoom out');
    await expect(appPage.getByTestId('canvas-control-zoom-in')).toHaveAttribute('title', 'Zoom in');
    await expect(appPage.getByTestId('fit-zoom-button')).toHaveAttribute('title', /fit mode/i);
  });

  test('navigates pages and spreads from the canvas toolbar', async ({ appPage }) => {
    await test.step('Create three total spreads', async () => {
      await addSpreads(appPage, 2);
      await expect(appPage.getByTestId('spread-thumbnail')).toHaveCount(3);
    });

    await test.step('Reset selection to the first spread left page', async () => {
      await appPage.getByTestId('spread-thumbnail').first().getByTestId('page-thumbnail-left').click();
      await expect(
        appPage.getByTestId('spread-thumbnail').first().getByTestId('page-thumbnail-left')
      ).toHaveClass(/in-selection/);
    });

    await test.step('Navigate to the next page in the current spread', async () => {
      await appPage.getByTestId('canvas-control-next-page').click();
      await expect(
        appPage.getByTestId('spread-thumbnail').nth(0).getByTestId('page-thumbnail-right')
      ).toHaveClass(/in-selection/);
    });

    await test.step('Navigate to the next spread while keeping the page side', async () => {
      await appPage.getByTestId('canvas-control-next-spread').click();
      await expect(
        appPage.getByTestId('spread-thumbnail').nth(1).getByTestId('page-thumbnail-right')
      ).toHaveClass(/in-selection/);
    });

    await test.step('Navigate back a page and then back a spread', async () => {
      await appPage.getByTestId('canvas-control-prev-page').click();
      await expect(
        appPage.getByTestId('spread-thumbnail').nth(1).getByTestId('page-thumbnail-left')
      ).toHaveClass(/in-selection/);

      await appPage.getByTestId('canvas-control-prev-spread').click();
      await expect(
        appPage.getByTestId('spread-thumbnail').nth(0).getByTestId('page-thumbnail-left')
      ).toHaveClass(/in-selection/);
    });
  });

  test('inserts a spread after the current spread from the canvas toolbar', async ({ appPage }) => {
    const spreadThumbnails = appPage.getByTestId('spread-thumbnail');
    const countBefore = await spreadThumbnails.count();

    await appPage.getByTestId('canvas-control-insert-spread-after').click();

    await expect(spreadThumbnails).toHaveCount(countBefore + 1);
    await expect(spreadThumbnails.nth(1).getByTestId('page-thumbnail-left')).toHaveClass(/in-selection/);
    await expect(spreadThumbnails.nth(1).getByTestId('page-number').first()).toHaveText('3');
  });

  test('inserts a spread before the current spread from the canvas toolbar', async ({ appPage }) => {
    await addSpreads(appPage, 1);
    await appPage.getByTestId('spread-thumbnail').nth(1).getByTestId('page-thumbnail-left').click();
    await expect(
      appPage.getByTestId('spread-thumbnail').nth(1).getByTestId('page-thumbnail-left')
    ).toHaveClass(/in-selection/);

    const spreadThumbnails = appPage.getByTestId('spread-thumbnail');
    const countBefore = await spreadThumbnails.count();

    await appPage.getByTestId('canvas-control-insert-spread-before').click();

    await expect(spreadThumbnails).toHaveCount(countBefore + 1);
    await expect(spreadThumbnails.nth(1).getByTestId('page-thumbnail-left')).toHaveClass(/in-selection/);
    await expect(spreadThumbnails.nth(1).getByTestId('page-number').first()).toHaveText('3');
    await expect(spreadThumbnails.nth(2).getByTestId('page-number').first()).toHaveText('5');
  });
});
