import {
  test,
  expect,
  importDummyImages,
  getZoomText,
  toggleFitMode,
  selectPoolImage,
} from './fixtures';

test.describe('Canvas Fit Mode', () => {
  test('Fit button toggles active state', async ({ appPage }) => {
    const fitButton = appPage.getByTestId('fit-zoom-button');

    await expect(fitButton).toHaveAttribute('aria-pressed', 'true');
    await toggleFitMode(appPage);
    await expect(fitButton).toHaveAttribute('aria-pressed', 'false');
    await toggleFitMode(appPage);
    await expect(fitButton).toHaveAttribute('aria-pressed', 'true');
  });

  test('manual zoom disables fit mode', async ({ appPage }) => {
    const fitButton = appPage.getByTestId('fit-zoom-button');
    const zoomBefore = await getZoomText(appPage);

    await expect(fitButton).toHaveAttribute('aria-pressed', 'true');
    await appPage.getByTitle('Zoom in').click();

    await expect(fitButton).toHaveAttribute('aria-pressed', 'false');
    expect(await getZoomText(appPage)).toBeGreaterThan(zoomBefore);
  });

  test('in fit mode, opening selected-layout panel changes zoom', async ({ appPage }) => {
    await importDummyImages(appPage);
    const zoomBefore = await getZoomText(appPage);

    await expect(appPage.getByTestId('fit-zoom-button')).toHaveAttribute('aria-pressed', 'true');
    await selectPoolImage(appPage, 0);
    await expect(appPage.getByTestId('image-pool-template-panel')).toHaveAttribute('aria-hidden', 'false');
    await appPage.waitForTimeout(400);

    expect(await getZoomText(appPage)).not.toBe(zoomBefore);
  });

  test('in fixed mode, opening selected-layout panel does not change zoom', async ({ appPage }) => {
    await importDummyImages(appPage);
    await appPage.getByTitle('Zoom in').click();
    const zoomBefore = await getZoomText(appPage);

    await expect(appPage.getByTestId('fit-zoom-button')).toHaveAttribute('aria-pressed', 'false');
    await selectPoolImage(appPage, 0);
    await expect(appPage.getByTestId('image-pool-template-panel')).toHaveAttribute('aria-hidden', 'false');
    await appPage.waitForTimeout(400);

    expect(await getZoomText(appPage)).toBe(zoomBefore);
  });

  test('in fixed mode, closing selected-layout panel does not change zoom', async ({ appPage }) => {
    await importDummyImages(appPage);
    await appPage.getByTitle('Zoom in').click();
    await selectPoolImage(appPage, 0);
    await expect(appPage.getByTestId('image-pool-template-panel')).toHaveAttribute('aria-hidden', 'false');
    const zoomBefore = await getZoomText(appPage);

    await appPage.getByTestId('pool-image').first().click();
    await expect(appPage.getByTestId('image-pool-template-panel')).toHaveAttribute('aria-hidden', 'true');
    await appPage.waitForTimeout(400);

    expect(await getZoomText(appPage)).toBe(zoomBefore);
  });

  test('clicking Fit while in fixed mode re-enables refit', async ({ appPage }) => {
    await importDummyImages(appPage);
    await appPage.getByTitle('Zoom in').click();
    const zoomBefore = await getZoomText(appPage);

    await expect(appPage.getByTestId('fit-zoom-button')).toHaveAttribute('aria-pressed', 'false');
    await toggleFitMode(appPage);

    await expect(appPage.getByTestId('fit-zoom-button')).toHaveAttribute('aria-pressed', 'true');
    expect(await getZoomText(appPage)).not.toBe(zoomBefore);
  });
});
