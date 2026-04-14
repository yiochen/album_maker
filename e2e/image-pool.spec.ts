import {
  test,
  expect,
  openImagePool,
  importDummyImages,
  dragFirstPoolImageToCanvas,
  selectPoolImage,
  multiSelectPoolImages,
  getPoolSelectionBadge,
  openSelectedLayoutsPanelViaSelection,
  applySelectedImageTemplate,
  openNonImagePanel,
  selectFirstCanvasObject,
  getCanvasObjectCount,
} from './fixtures';
import { templates } from '../src/templates';
import { countTemplateImageElements } from '../src/services/templateLayout';

const getModifier = (browserName: string): 'Meta' | 'Control' => (
  browserName === 'webkit' ? 'Meta' : 'Control'
);

test.describe('Image Pool', () => {
  test.describe('Basic Pool', () => {
    test('displays image pool title', async ({ appPage }) => {
      await openImagePool(appPage);
      await expect(appPage.getByRole('heading', { name: /Image Pool/ })).toBeVisible();
    });

    test('closes image pool when toggling nav rail', async ({ appPage }) => {
      await openImagePool(appPage);
      await appPage.getByTestId('nav-images').click();
      await expect(appPage.getByTestId('image-pool')).toHaveCount(0);
    });

    test('has source selector dropdown', async ({ appPage }) => {
      await openImagePool(appPage);
      await expect(appPage.getByTestId('source-selector')).toBeVisible();
    });

    test('has dummy colors source available', async ({ appPage }) => {
      await openImagePool(appPage);
      await expect(appPage.locator('[data-testid="source-selector"] option[value="dummy-colors"]')).toHaveCount(1);
    });

    test('displays import button', async ({ appPage }) => {
      await openImagePool(appPage);
      await expect(appPage.getByTestId('image-pool').getByRole('button', { name: /^Import$/ })).toBeVisible();
    });

    test('shows empty state when no images imported', async ({ appPage }) => {
      await openImagePool(appPage);
      await expect(appPage.getByTestId('pool-empty')).toBeVisible();
    });

    test('imports images from dummy colors source', async ({ appPage }) => {
      await importDummyImages(appPage);
      await expect.poll(async () => appPage.getByTestId('pool-image').count()).toBeGreaterThan(0);
    });

    test('displays image count after import', async ({ appPage }) => {
      await importDummyImages(appPage);
      await expect(appPage.getByTestId('image-pool-title')).toContainText('images');
    });

    test('displays image thumbnails', async ({ appPage }) => {
      await importDummyImages(appPage);
      await expect.poll(async () => appPage.locator('[data-testid="pool-image"] img').count()).toBeGreaterThan(0);
    });

    test('persists imported images after closing and reopening pool', async ({ appPage }) => {
      await importDummyImages(appPage);
      const countBefore = await appPage.getByTestId('pool-image').count();

      await appPage.getByTestId('nav-images').click();
      await expect(appPage.getByTestId('image-pool')).toHaveCount(0);

      await openImagePool(appPage);
      await expect(appPage.getByTestId('pool-image')).toHaveCount(countBefore);
    });

    test('is vertically scrollable when many images are imported', async ({ appPage }) => {
      await importDummyImages(appPage);

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

      await expect.poll(async () => (
        content.evaluate((node) => (node as HTMLElement).scrollTop)
      )).toBeGreaterThan(0);
    });
  });

  test.describe('Used State', () => {
    test('marks a pool image as used after dragging it onto canvas', async ({ appPage }) => {
      await importDummyImages(appPage);
      const firstPoolImage = appPage.getByTestId('pool-image').first();

      await expect(firstPoolImage).toHaveAttribute('data-used', 'false');
      await dragFirstPoolImageToCanvas(appPage);

      await expect(firstPoolImage).toHaveAttribute('data-used', 'true');
      await expect(firstPoolImage.getByText('Used')).toBeVisible();
    });

    test('used marker clears when the placed image element is deleted', async ({ appPage }) => {
      await importDummyImages(appPage);
      const firstPoolImage = appPage.getByTestId('pool-image').first();

      await dragFirstPoolImageToCanvas(appPage);
      await expect(firstPoolImage).toHaveAttribute('data-used', 'true');

      await selectFirstCanvasObject(appPage);
      await appPage.evaluate(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
      });

      await expect(firstPoolImage).toHaveAttribute('data-used', 'false');
    });
  });

  test.describe('Pool Selection', () => {
    test('plain click selects and plain re-click deselects the same image', async ({ appPage }) => {
      await importDummyImages(appPage);
      const firstPoolImage = appPage.getByTestId('pool-image').first();

      await firstPoolImage.click();
      await expect(firstPoolImage).toHaveAttribute('data-selected', 'true');
      await expect(appPage.getByTestId('image-pool-template-panel')).toHaveAttribute('aria-hidden', 'false');

      await firstPoolImage.click();
      await expect(firstPoolImage).toHaveAttribute('data-selected', 'false');
      await expect(appPage.getByTestId('image-pool-template-panel')).toHaveAttribute('aria-hidden', 'true');
    });

    test('multi-select shows ordered badges', async ({ appPage, browserName }) => {
      await importDummyImages(appPage);
      await multiSelectPoolImages(appPage, [0, 1, 2], getModifier(browserName));

      const poolImages = appPage.getByTestId('pool-image');
      await expect(poolImages.nth(0)).toHaveAttribute('data-selected', 'true');
      await expect(poolImages.nth(1)).toHaveAttribute('data-selected', 'true');
      await expect(poolImages.nth(2)).toHaveAttribute('data-selected', 'true');
      await expect(getPoolSelectionBadge(appPage, 0)).toHaveText('1');
      await expect(getPoolSelectionBadge(appPage, 1)).toHaveText('2');
      await expect(getPoolSelectionBadge(appPage, 2)).toHaveText('3');
    });

    test('removing a middle selected image preserves remaining order', async ({ appPage, browserName }) => {
      await importDummyImages(appPage);
      await multiSelectPoolImages(appPage, [0, 1, 2], getModifier(browserName));

      await appPage.getByTestId('pool-image').nth(1).click({ modifiers: [getModifier(browserName)] });

      const poolImages = appPage.getByTestId('pool-image');
      await expect(poolImages.nth(0)).toHaveAttribute('data-selected', 'true');
      await expect(poolImages.nth(1)).toHaveAttribute('data-selected', 'false');
      await expect(poolImages.nth(2)).toHaveAttribute('data-selected', 'true');
      await expect(getPoolSelectionBadge(appPage, 0)).toHaveText('1');
      await expect(getPoolSelectionBadge(appPage, 2)).toHaveText('2');
    });

    test('plain click during multi-select collapses to only clicked image', async ({ appPage, browserName }) => {
      await importDummyImages(appPage);
      await multiSelectPoolImages(appPage, [0, 1], getModifier(browserName));

      const poolImages = appPage.getByTestId('pool-image');
      await poolImages.nth(1).click();

      await expect(poolImages.nth(0)).toHaveAttribute('data-selected', 'false');
      await expect(poolImages.nth(1)).toHaveAttribute('data-selected', 'true');
      await expect(getPoolSelectionBadge(appPage, 1)).toHaveText('1');
      await expect(appPage.getByTestId('image-pool-template-panel')).toHaveAttribute('aria-hidden', 'false');
    });
  });

  test.describe('Selection Clearing', () => {
    test('clears pool selection on canvas mouse down', async ({ appPage }) => {
      await importDummyImages(appPage);
      await selectPoolImage(appPage, 0);

      await expect(appPage.getByTestId('image-pool-template-panel')).toHaveAttribute('aria-hidden', 'false');

      await appPage.getByTestId('interaction-layer').click({ position: { x: 40, y: 40 } });

      await expect(appPage.getByTestId('pool-image').first()).toHaveAttribute('data-selected', 'false');
      await expect(appPage.getByTestId('image-pool-template-panel')).toHaveAttribute('aria-hidden', 'true');
      await expect(appPage.getByTestId('pool-image').first().getByTestId('pool-image-selection-badge')).toHaveCount(0);
    });

    test('clears pool selection when switching away from Images panel', async ({ appPage }) => {
      await importDummyImages(appPage);
      await selectPoolImage(appPage, 0);
      await expect(appPage.getByTestId('image-pool-template-panel')).toHaveAttribute('aria-hidden', 'false');

      await openNonImagePanel(appPage, 'properties');
      await openImagePool(appPage);

      await expect(appPage.getByTestId('pool-image').first()).toHaveAttribute('data-selected', 'false');
      await expect(appPage.getByTestId('image-pool-template-panel')).toHaveAttribute('aria-hidden', 'true');
    });

    test('clears pool selection when Images panel is collapsed', async ({ appPage }) => {
      await importDummyImages(appPage);
      await selectPoolImage(appPage, 0);

      await appPage.getByTestId('nav-images').click();
      await expect(appPage.getByTestId('image-pool')).toHaveCount(0);

      await openImagePool(appPage);
      await expect(appPage.getByTestId('pool-image').first()).toHaveAttribute('data-selected', 'false');
      await expect(appPage.getByTestId('image-pool-template-panel')).toHaveAttribute('aria-hidden', 'true');
    });
  });

  test.describe('Selected Layouts Panel', () => {
    test('single selection opens selected-layout side panel with 1-image templates', async ({ appPage }) => {
      await importDummyImages(appPage);
      await selectPoolImage(appPage, 0);

      await expect(appPage.getByTestId('image-pool-template-panel')).toHaveAttribute('aria-hidden', 'false');
      await expect(appPage.getByTestId('selected-image-template-panel')).toBeVisible();
      await expect(appPage.locator('[data-testid^="selected-image-layout-option-"]'))
        .toHaveCount(templates.filter((template) => countTemplateImageElements(template) === 1).length);
    });

    test('two selected images show 2-image templates', async ({ appPage, browserName }) => {
      await openSelectedLayoutsPanelViaSelection(appPage, [0, 1], getModifier(browserName));

      await expect(appPage.getByTestId('selected-image-template-panel')).toBeVisible();
      await expect(appPage.locator('[data-testid^="selected-image-layout-option-"]'))
        .toHaveCount(templates.filter((template) => countTemplateImageElements(template) === 2).length);
    });

    test('selected-layout panel collapses when no selection remains', async ({ appPage }) => {
      await importDummyImages(appPage);
      await selectPoolImage(appPage, 0);
      await expect(appPage.getByTestId('image-pool-template-panel')).toHaveAttribute('aria-hidden', 'false');

      await appPage.getByTestId('pool-image').first().click();

      await expect(appPage.getByTestId('image-pool-template-panel')).toHaveAttribute('aria-hidden', 'true');
    });
  });

  test.describe('Template Apply From Pool Selection', () => {
    test('applies a 1-image selected-image template to the current page', async ({ appPage }) => {
      await importDummyImages(appPage);
      await selectPoolImage(appPage, 0);

      await applySelectedImageTemplate(appPage, 'full-page-image');

      await expect(appPage.getByTestId('image-pool-template-panel')).toHaveAttribute('aria-hidden', 'true');
      await expect(appPage.getByText('Drag images here')).toHaveCount(0);
      expect(await getCanvasObjectCount(appPage)).toBe(1);
    });

    test('advances active page from left to right after applying a selected-image template', async ({ appPage }) => {
      await importDummyImages(appPage);
      await expect(appPage.locator('.canvas-page-highlight-left')).toHaveCount(1);
      await selectPoolImage(appPage, 0);

      await applySelectedImageTemplate(appPage, 'full-page-image');

      await expect(appPage.locator('.canvas-page-highlight-right')).toHaveCount(1);
    });

    test('applies a 2-image template from selected images', async ({ appPage, browserName }) => {
      await openSelectedLayoutsPanelViaSelection(appPage, [0, 1], getModifier(browserName));

      await applySelectedImageTemplate(appPage, 'two-up-vertical');

      await expect(appPage.getByTestId('image-pool-template-panel')).toHaveAttribute('aria-hidden', 'true');
      await expect(appPage.getByText('Drag images here')).toHaveCount(0);
      expect(await appPage.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fabricCanvas = (window as any).__FABRIC_CANVAS__;
        if (!fabricCanvas) return 0;
        // CanvasImageElement instances are Fabric groups with data ids.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return fabricCanvas.getObjects().filter((o: any) => o.type === 'group' && o.data?.id).length;
      })).toBe(2);
    });
  });
});
