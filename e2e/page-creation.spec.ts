import { test, expect, openAlbumSettings } from './fixtures';

test.describe('Page Creation', () => {
  test('displays the page navigator', async ({ appPage }) => {
    await test.step('Verify page navigator and title', async () => {
      await expect(appPage.getByTestId('page-navigator')).toBeVisible();
      await expect(appPage.getByText('Spreads', { exact: true })).toBeVisible();
    });
  });

  test('shows initial spread count', async ({ appPage }) => {
    await test.step('Verify at least one spread thumbnail exists', async () => {
      await expect.poll(async () => appPage.getByTestId('spread-thumbnail').count()).toBeGreaterThan(0);
    });
  });

  test('adds new pages when clicking Add Spread button', async ({ appPage }) => {
    await test.step('Add spread and verify count increases', async () => {
      const spreadThumbnails = appPage.getByTestId('spread-thumbnail');
      const initialCount = await spreadThumbnails.count();

      await appPage.getByRole('button', { name: 'Add Spread' }).click();

      await expect(spreadThumbnails).toHaveCount(initialCount + 1);
    });
  });

  test('navigates between spreads', async ({ appPage }) => {
    await test.step('Ensure at least two spreads exist', async () => {
      const addSpreadButton = appPage.getByRole('button', { name: 'Add Spread' });
      await addSpreadButton.click();
      await expect(appPage.getByTestId('spread-thumbnail')).toHaveCount(2);
    });

    await test.step('Select left page of second spread', async () => {
      const secondSpreadLeftPage = appPage.getByTestId('spread-thumbnail').nth(1).getByTestId('page-thumbnail-left');
      await secondSpreadLeftPage.click();
      await expect(secondSpreadLeftPage).toHaveClass(/in-selection/);
    });

    await test.step('Select right page of first spread', async () => {
      const firstSpreadRightPage = appPage.getByTestId('spread-thumbnail').first().getByTestId('page-thumbnail-right');
      await firstSpreadRightPage.click();
      await expect(firstSpreadRightPage).toHaveClass(/in-selection/);
    });
  });

  test('displays page numbers on thumbnails', async ({ appPage }) => {
    await test.step('Verify first spread has page numbers 1 and 2', async () => {
      const pageNumbers = appPage.getByTestId('spread-thumbnail').first().getByTestId('page-number');
      await expect(pageNumbers.nth(0)).toHaveText('1');
      await expect(pageNumbers.nth(1)).toHaveText('2');
    });
  });

  test('deletes a spread with the Delete key', async ({ appPage }) => {
    await test.step('Ensure at least two spreads exist', async () => {
      if ((await appPage.getByTestId('spread-thumbnail').count()) < 2) {
        await appPage.getByRole('button', { name: 'Add Spread' }).click();
      }
      await expect.poll(async () => appPage.getByTestId('spread-thumbnail').count()).toBeGreaterThan(1);
    });

    await test.step('Delete selected spread using Delete key', async () => {
      const spreadThumbnails = appPage.getByTestId('spread-thumbnail');
      const countBefore = await spreadThumbnails.count();

      const lastPageLeft = spreadThumbnails.last().getByTestId('page-thumbnail-left');
      await lastPageLeft.click();
      // Wait for React state (selectedPages) to settle before pressing Delete
      await expect(lastPageLeft).toHaveClass(/in-selection/);
      await appPage.keyboard.press('Delete');

      await expect(spreadThumbnails).toHaveCount(countBefore - 1);
    });
  });

  test('does not delete when only one spread exists', async ({ appPage }) => {
    await test.step('Delete spreads until only one remains', async () => {
      const spreadThumbnails = appPage.getByTestId('spread-thumbnail');

      while ((await spreadThumbnails.count()) > 1) {
        const countBefore = await spreadThumbnails.count();
        await spreadThumbnails.last().getByTestId('page-thumbnail-left').click();
        await appPage.keyboard.press('Delete');
        await expect(spreadThumbnails).toHaveCount(countBefore - 1);
      }

      await expect(spreadThumbnails).toHaveCount(1);
    });

    await test.step('Verify Delete key no longer removes spreads', async () => {
      await appPage.keyboard.press('Delete');
      await expect(appPage.getByTestId('spread-thumbnail')).toHaveCount(1);
    });
  });

  test('shows page count in header', async ({ appPage }) => {
    await test.step('Verify page count label includes spreads text', async () => {
      await expect(appPage.getByTestId('page-count')).toContainText('spreads');
    });
  });

  test('respects max pages limit', async ({ appPage }) => {
    await test.step('Set max pages close to current page count', async () => {
      await openAlbumSettings(appPage);
      const dialog = appPage.getByRole('dialog', { name: 'Album Settings' });

      const hintText = await dialog.getByTestId('page-count-hint').textContent();
      const match = hintText?.match(/Currently:\s*(\d+)/);
      expect(match).not.toBeNull();

      const currentPageCount = Number(match?.[1]);
      const newMax = currentPageCount + 2;

      const maxPagesInput = dialog.getByTestId('max-pages-input');
      await maxPagesInput.fill(String(newMax));
      await maxPagesInput.press('Enter');

      await dialog.getByRole('button', { name: 'Close' }).click();
      await expect(appPage.getByRole('dialog', { name: 'Album Settings' })).toHaveCount(0);
    });

    await test.step('Verify add spread is disabled at limit', async () => {
      const addSpreadButton = appPage.getByRole('button', { name: 'Add Spread' });
      await addSpreadButton.click();
      await expect(addSpreadButton).toBeDisabled();
    });
  });
});
