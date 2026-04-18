import { test as base, expect, type Locator, type Page } from 'playwright/test';

type AppFixtures = {
  appPage: Page;
};

async function waitForAppReady(page: Page): Promise<void> {
  await expect(page.getByText('Loading...')).toHaveCount(0);
  await expect(page.getByTestId('album-editor')).toBeVisible();
  await expect(page.getByTestId('canvas-container')).toBeVisible();
}

export const test = base.extend<AppFixtures>({
  appPage: async ({ page, baseURL }, runFixture) => {
    await page.goto(baseURL ?? '/');
    await waitForAppReady(page);
    await runFixture(page);
  },
});

export async function openAlbumSettings(page: Page): Promise<void> {
  const settingsButton = page.getByRole('button', { name: /album settings/i });
  await settingsButton.click();
  await expect(page.getByRole('dialog', { name: 'Album Settings' })).toBeVisible();
}

export async function openImagePool(page: Page): Promise<void> {
  if (await page.getByTestId('image-pool').count() === 0) {
    await page.getByTestId('nav-images').click();
  }
  await expect(page.getByTestId('image-pool')).toBeVisible();
}

export async function openPropertiesTab(page: Page): Promise<void> {
  await page.getByTestId('nav-properties').click();
}

export async function openNonImagePanel(
  page: Page,
  target: 'navigator' | 'shapes' | 'properties' | 'templates'
): Promise<void> {
  await page.getByTestId(`nav-${target}`).click();
}

export async function importDummyImages(page: Page): Promise<void> {
  await openImagePool(page);
  const pool = page.getByTestId('image-pool');
  const sourceSelect = page.getByTestId('source-selector');
  await sourceSelect.selectOption('dummy-colors');
  await expect(sourceSelect).toHaveValue('dummy-colors');

  const importButton = pool.getByRole('button', { name: /^Import$/ });
  await expect(importButton).toBeEnabled();
  await importButton.focus();
  await importButton.press('Enter');

  await expect(pool.getByTestId('pool-image').first()).toBeVisible();
}

export async function selectPoolImage(page: Page, index: number): Promise<void> {
  await openImagePool(page);
  await page.getByTestId('pool-image').nth(index).click();
}

export async function multiSelectPoolImages(
  page: Page,
  indices: number[],
  modifier: 'Meta' | 'Control' = 'Control'
): Promise<void> {
  if (indices.length === 0) return;
  await selectPoolImage(page, indices[0]);
  for (const index of indices.slice(1)) {
    await page.getByTestId('pool-image').nth(index).click({ modifiers: [modifier] });
  }
}

export function getPoolSelectionBadge(page: Page, index: number): Locator {
  return page.getByTestId('pool-image').nth(index).getByTestId('pool-image-selection-badge');
}

export async function openSelectedLayoutsPanelViaSelection(
  page: Page,
  indices: number[],
  modifier: 'Meta' | 'Control' = 'Control'
): Promise<void> {
  await importDummyImages(page);
  await multiSelectPoolImages(page, indices, modifier);
  await expect(page.getByTestId('image-pool-template-panel')).toHaveAttribute('aria-hidden', 'false');
}

export async function applySelectedImageTemplate(page: Page, templateId?: string): Promise<void> {
  const target = templateId
    ? page.getByTestId(`selected-image-layout-option-${templateId}`)
    : page.locator('[data-testid^="selected-image-layout-option-"]').first();
  await expect(target).toBeVisible();
  await target.click();
}

export async function getZoomText(page: Page): Promise<number> {
  const text = await page.locator('.zoom-display').textContent();
  return Number.parseInt(text ?? '0', 10);
}

export async function toggleFitMode(page: Page): Promise<void> {
  await page.getByTestId('fit-zoom-button').click();
}

export async function selectFirstCanvasObject(page: Page): Promise<void> {
  const selected = await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fabricCanvas = (window as any).__FABRIC_CANVAS__;
    if (!fabricCanvas) return false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const objects = fabricCanvas.getObjects().filter((o: any) => o.data?.id !== 'seam');
    if (objects.length === 0) return false;
    fabricCanvas.setActiveObject(objects[0]);
    fabricCanvas.requestRenderAll();
    return true;
  });

  if (!selected) {
    throw new Error('Unable to select first canvas object.');
  }

  await expect(page.getByTestId('canvas-container')).toHaveAttribute('data-has-selection', 'true', { timeout: 5000 });
}

export async function focusCanvasForKeyboard(page: Page): Promise<void> {
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

export async function getCanvasObjectCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fabricCanvas = (window as any).__FABRIC_CANVAS__;
    if (!fabricCanvas) return 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return fabricCanvas.getObjects().filter((o: any) => o.data?.id && o.data.id !== 'seam').length;
  });
}

export async function dragWithPointerSteps(page: Page, source: Locator, target: Locator): Promise<void> {
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();

  if (!sourceBox || !targetBox) {
    throw new Error('Unable to calculate drag coordinates for source or target.');
  }

  const sourceX = sourceBox.x + sourceBox.width / 2;
  const sourceY = sourceBox.y + sourceBox.height / 2;
  const targetX = targetBox.x + targetBox.width / 2;
  const targetY = targetBox.y + targetBox.height / 2;

  await page.mouse.move(sourceX, sourceY);
  await page.mouse.down();
  await page.mouse.move(sourceX + 20, sourceY + 20, { steps: 20 });
  await page.mouse.move(targetX, targetY, { steps: 20 });
  await page.mouse.up();
}

export async function dragFirstPoolImageToCanvas(page: Page): Promise<void> {
  await dragWithPointerSteps(
    page,
    page.getByTestId('pool-image').first(),
    page.getByTestId('interaction-layer'),
  );
}

export { expect };
