import { test, expect, openPropertiesTab } from './fixtures';
import type { Page } from 'playwright/test';

async function addTextAndOpenProperties(page: Page) {
  await test.step('Add a text element from toolbar', async () => {
    await page.getByRole('button', { name: 'Text' }).click();
  });

  await test.step('Open Properties tab', async () => {
    await openPropertiesTab(page);
    await expect(page.getByRole('heading', { name: 'Text Properties' })).toBeVisible();
  });
}

test.describe('Text Elements', () => {
  test.describe('Adding a Text Element', () => {
    test('adds a text element via toolbar button', async ({ appPage }) => {
      await test.step('Add text and inspect properties panel', async () => {
        await appPage.getByRole('button', { name: 'Text' }).click();
        await openPropertiesTab(appPage);
        await expect(appPage.getByRole('heading', { name: 'Text Properties' })).toBeVisible();
      });
    });

    test('shows text selection state on canvas', async ({ appPage }) => {
      await test.step('Add text element', async () => {
        await appPage.getByRole('button', { name: 'Text' }).click();
      });

      await test.step('Verify placeholder is removed and selection is active', async () => {
        await expect(appPage.getByText('Drag images here')).toHaveCount(0);
        await expect(appPage.getByTestId('canvas-container')).toHaveAttribute('data-has-selection', 'true');
      });
    });
  });

  test.describe('Text Properties Panel', () => {
    test.beforeEach(async ({ appPage }) => {
      await addTextAndOpenProperties(appPage);
    });

    test('shows text editing toolbar while a new text element is editing', async ({ appPage }) => {
      await test.step('Verify editing toolbar visibility', async () => {
        await expect(appPage.getByTestId('text-editing-toolbar')).toBeVisible();
      });
    });

    test('displays font controls in editing toolbar', async ({ appPage }) => {
      await test.step('Verify font and size controls', async () => {
        await expect(appPage.getByTestId('text-font-trigger')).toBeVisible();
        await expect(appPage.getByTestId('text-size-display')).toBeVisible();
      });
    });

    test('displays color picker in editing toolbar', async ({ appPage }) => {
      await test.step('Verify text color control', async () => {
        await expect(appPage.getByTestId('text-color-input')).toBeVisible();
      });
    });

    test('displays alignment buttons in editing toolbar', async ({ appPage }) => {
      await test.step('Verify alignment controls', async () => {
        await expect(appPage.getByTestId('text-align-left-btn')).toBeVisible();
        await expect(appPage.getByTestId('text-align-center-btn')).toBeVisible();
        await expect(appPage.getByTestId('text-align-right-btn')).toBeVisible();
      });
    });

    test('has left alignment active by default', async ({ appPage }) => {
      await test.step('Verify default left alignment state', async () => {
        await expect(appPage.getByTestId('text-align-left-btn')).toHaveClass(/active/);
      });
    });
  });

  test.describe('Text Element Deletion', () => {
    test.beforeEach(async ({ appPage }) => {
      await addTextAndOpenProperties(appPage);
    });

    test('does not delete the element when pressing Delete during text editing', async ({ appPage }) => {
      await test.step('Press Delete key while text editor is active', async () => {
        await appPage.keyboard.press('Delete');
      });

      await test.step('Verify text properties remain visible', async () => {
        await expect(appPage.getByRole('heading', { name: 'Text Properties' })).toBeVisible();
      });
    });

    test('deletes the text element from the properties action', async ({ appPage }) => {
      await test.step('Delete selected text from properties action', async () => {
        await appPage.getByRole('button', { name: 'Delete' }).click();
      });

      await test.step('Verify spread properties are shown after deletion', async () => {
        await expect(appPage.getByRole('heading', { name: 'Spread Properties' })).toBeVisible();
      });
    });
  });
});
