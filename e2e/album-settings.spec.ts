import { test, expect, openAlbumSettings } from './fixtures';

test.describe('Album Settings', () => {
  test.beforeEach(async ({ appPage }) => {
    await test.step('Open album settings dialog', async () => {
      await openAlbumSettings(appPage);
    });
  });

  test('displays the album settings panel', async ({ appPage }) => {
    await test.step('Verify settings title and panel are visible', async () => {
      const dialog = appPage.getByRole('dialog', { name: 'Album Settings' });
      await expect(dialog.getByTestId('album-settings-panel')).toBeVisible();
      await expect(dialog.getByTestId('settings-title')).toHaveText('Album Settings');
    });
  });

  test('changes page width', async ({ appPage }) => {
    await test.step('Edit page width input', async () => {
      const widthInput = appPage.getByRole('dialog', { name: 'Album Settings' }).getByLabel(/Width|Size/);
      await widthInput.fill('10');
      await expect(widthInput).toHaveValue('10');
    });
  });

  test('changes page height when not in square mode', async ({ appPage }) => {
    await test.step('Turn off square mode when needed', async () => {
      const squareCheckbox = appPage.getByRole('dialog', { name: 'Album Settings' }).getByLabel('Square pages');
      if (await squareCheckbox.isChecked()) {
        await squareCheckbox.click();
      }
      await expect(squareCheckbox).not.toBeChecked();
    });

    await test.step('Edit page height input', async () => {
      const heightInput = appPage.getByRole('dialog', { name: 'Album Settings' }).getByLabel('Height');
      await heightInput.fill('8');
      await expect(heightInput).toHaveValue('8');
    });
  });

  test('toggles square mode', async ({ appPage }) => {
    await test.step('Toggle square mode and verify height visibility', async () => {
      const dialog = appPage.getByRole('dialog', { name: 'Album Settings' });
      const squareCheckbox = dialog.getByLabel('Square pages');
      const wasChecked = await squareCheckbox.isChecked();

      await squareCheckbox.click();

      if (wasChecked) {
        await expect(dialog.getByLabel('Height')).toBeVisible();
      } else {
        await expect(dialog.getByLabel('Height')).toHaveCount(0);
      }
    });
  });

  test('syncs width and height in square mode', async ({ appPage }) => {
    await test.step('Enable square mode', async () => {
      const dialog = appPage.getByRole('dialog', { name: 'Album Settings' });
      const squareCheckbox = dialog.getByLabel('Square pages');
      if (!(await squareCheckbox.isChecked())) {
        await squareCheckbox.click();
      }
      await expect(squareCheckbox).toBeChecked();
      await expect(dialog.getByLabel('Height')).toHaveCount(0);
    });

    await test.step('Update width in square mode', async () => {
      const widthInput = appPage.getByRole('dialog', { name: 'Album Settings' }).getByLabel(/Width|Size/);
      await widthInput.fill('12');
      await expect(widthInput).toHaveValue('12');
    });
  });

  test('changes units between inches and centimeters', async ({ appPage }) => {
    await test.step('Switch to centimeters', async () => {
      const unitSelect = appPage.getByRole('dialog', { name: 'Album Settings' }).getByTestId('unit-select');
      await unitSelect.selectOption('cm');
      await expect(unitSelect).toHaveValue('cm');
    });

    await test.step('Switch back to inches', async () => {
      const unitSelect = appPage.getByRole('dialog', { name: 'Album Settings' }).getByTestId('unit-select');
      await unitSelect.selectOption('inch');
      await expect(unitSelect).toHaveValue('inch');
    });
  });

  test('changes max pages setting', async ({ appPage }) => {
    await test.step('Edit max pages input', async () => {
      const maxPagesInput = appPage.getByRole('dialog', { name: 'Album Settings' }).getByTestId('max-pages-input');
      await maxPagesInput.fill('50');
      await expect(maxPagesInput).toHaveValue('50');
    });
  });

  test('displays current page count', async ({ appPage }) => {
    await test.step('Verify page count hint', async () => {
      await expect(
        appPage.getByRole('dialog', { name: 'Album Settings' }).getByTestId('page-count-hint'),
      ).toContainText('Currently:');
    });
  });
});
