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
  await page.getByTestId('nav-images').click();
  await expect(page.getByTestId('image-pool')).toBeVisible();
}

export async function openPropertiesTab(page: Page): Promise<void> {
  await page.getByTestId('nav-properties').click();
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
