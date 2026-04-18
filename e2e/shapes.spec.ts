import type { Page } from 'playwright/test';
import { test, expect, openNonImagePanel } from './fixtures';

async function getFirstCanvasShapeState(page: Page) {
  return page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fabricCanvas = (window as any).__FABRIC_CANVAS__;
    if (!fabricCanvas) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shape = fabricCanvas.getObjects().find((o: any) => o.data?.id !== 'seam');
    if (!shape) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return JSON.parse(JSON.stringify((shape as any).pageElement));
  });
}

test.describe('Shapes', () => {
  test('creates a shape from the shapes panel and opens shape properties', async ({ appPage }) => {
    await openNonImagePanel(appPage, 'shapes');
    await expect(appPage.getByTestId('shape-panel')).toBeVisible();

    await appPage.getByTestId('shape-preset-rectangle').click();

    await expect(appPage.getByRole('heading', { name: 'Shape Properties' })).toBeVisible();

    await expect.poll(async () => {
      const element = await getFirstCanvasShapeState(appPage);
      return element?.type;
    }).toBe('shape');
  });

  test('updates shape fill, border, and preset', async ({ appPage }) => {
    await openNonImagePanel(appPage, 'shapes');
    await appPage.getByTestId('shape-preset-triangle').click();
    await expect(appPage.getByRole('heading', { name: 'Shape Properties' })).toBeVisible();

    await appPage.getByTestId('shape-fill-color-input').fill('#123456');
    await appPage.getByTestId('shape-border-width-input').fill('6');
    await appPage.getByTestId('shape-border-width-input').blur();
    await appPage.getByTestId('shape-border-color-input').fill('#654321');
    await appPage.getByTestId('shape-preset-select').selectOption('ellipse');

    await expect.poll(async () => {
      const element = await getFirstCanvasShapeState(appPage);
      return {
        fill: element?.content?.fill,
        border: element?.content?.border,
        subpaths: element?.content?.subpaths?.[0]?.commands?.[0]?.op,
      };
    }).toEqual({
      fill: '#123456',
      border: { widthPt: 6, color: '#654321' },
      subpaths: 'ellipse',
    });
  });
});
