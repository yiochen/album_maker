import { test, expect } from './fixtures';

test.use({ video: 'on' });
test.setTimeout(60_000);

test.describe('Page Multi-Selection', () => {
  test('select pages via ctrl+click and marquee drag', async ({ appPage }) => {
    const page = appPage;

    await test.step('Add spreads so we have 4 total', async () => {
      const addBtn = page.getByRole('button', { name: 'Add Spread' });
      for (let i = 0; i < 3; i++) {
        await addBtn.click();
      }
      await expect(page.getByTestId('spread-thumbnail')).toHaveCount(4);
    });

    await page.screenshot({ path: 'test-results/01-four-spreads.png' });

    await test.step('Click pages normally — no selection overlay', async () => {
      const firstLeft = page.getByTestId('spread-thumbnail').nth(0).getByTestId('page-thumbnail-left');
      await firstLeft.click();
      await expect(firstLeft).toHaveClass(/active/);
      await expect(firstLeft).not.toHaveClass(/in-selection/);
    });

    await test.step('Ctrl+Click to add pages to selection', async () => {
      const page1 = page.getByTestId('spread-thumbnail').nth(0).getByTestId('page-thumbnail-left');
      const page3 = page.getByTestId('spread-thumbnail').nth(1).getByTestId('page-thumbnail-left');
      const page6 = page.getByTestId('spread-thumbnail').nth(2).getByTestId('page-thumbnail-right');

      await page1.click({ modifiers: ['ControlOrMeta'] });
      await expect(page1).toHaveClass(/in-selection/);

      await page3.click({ modifiers: ['ControlOrMeta'] });
      await expect(page3).toHaveClass(/in-selection/);
      await expect(page1).toHaveClass(/in-selection/);

      await page6.click({ modifiers: ['ControlOrMeta'] });
      await expect(page6).toHaveClass(/in-selection/);

      await expect(page1).toHaveClass(/in-selection/);
      await expect(page3).toHaveClass(/in-selection/);
      await expect(page6).toHaveClass(/in-selection/);
    });

    await page.screenshot({ path: 'test-results/02-ctrl-click-selection.png' });

    await test.step('Ctrl+Click again to deselect a page', async () => {
      const page3 = page.getByTestId('spread-thumbnail').nth(1).getByTestId('page-thumbnail-left');
      await page3.click({ modifiers: ['ControlOrMeta'] });
      await expect(page3).not.toHaveClass(/in-selection/);
    });

    await page.screenshot({ path: 'test-results/03-after-deselect.png' });

    await test.step('Normal click clears selection', async () => {
      const page2 = page.getByTestId('spread-thumbnail').nth(0).getByTestId('page-thumbnail-right');
      await page2.click();
      const page1 = page.getByTestId('spread-thumbnail').nth(0).getByTestId('page-thumbnail-left');
      const page6 = page.getByTestId('spread-thumbnail').nth(2).getByTestId('page-thumbnail-right');
      await expect(page1).not.toHaveClass(/in-selection/);
      await expect(page6).not.toHaveClass(/in-selection/);
    });

    await page.screenshot({ path: 'test-results/04-selection-cleared.png' });

    await test.step('Marquee drag to select multiple pages', async () => {
      const pageList = page.locator('.page-list');
      const pageListBox = await pageList.boundingBox();
      expect(pageListBox).not.toBeNull();

      const startX = pageListBox!.x + 5;
      const startY = pageListBox!.y + 5;
      const secondSpread = page.getByTestId('spread-thumbnail').nth(1);
      const secondSpreadBox = await secondSpread.boundingBox();
      expect(secondSpreadBox).not.toBeNull();
      const endX = pageListBox!.x + pageListBox!.width - 5;
      const endY = secondSpreadBox!.y + secondSpreadBox!.height + 5;

      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(endX, endY, { steps: 15 });

      // Screenshot during marquee drag
      await page.screenshot({ path: 'test-results/05-marquee-during-drag.png' });

      await page.mouse.up();

      const spread0Left = page.getByTestId('spread-thumbnail').nth(0).getByTestId('page-thumbnail-left');
      const spread0Right = page.getByTestId('spread-thumbnail').nth(0).getByTestId('page-thumbnail-right');
      const spread1Left = page.getByTestId('spread-thumbnail').nth(1).getByTestId('page-thumbnail-left');
      const spread1Right = page.getByTestId('spread-thumbnail').nth(1).getByTestId('page-thumbnail-right');

      await expect(spread0Left).toHaveClass(/in-selection/);
      await expect(spread0Right).toHaveClass(/in-selection/);
      await expect(spread1Left).toHaveClass(/in-selection/);
      await expect(spread1Right).toHaveClass(/in-selection/);

      const spread2Left = page.getByTestId('spread-thumbnail').nth(2).getByTestId('page-thumbnail-left');
      await expect(spread2Left).not.toHaveClass(/in-selection/);
    });

    await page.screenshot({ path: 'test-results/06-marquee-result.png' });

    await page.waitForTimeout(1000);
  });
});
