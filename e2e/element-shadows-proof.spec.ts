import { readFile, writeFile } from 'node:fs/promises';
import JSZip from 'jszip';
import { test, expect, openNonImagePanel, dragFirstPoolImageToCanvas } from './fixtures';

test.skip(process.env.ELEMENT_SHADOW_PROOF !== '1', 'Run explicitly to record the Chrome proof artifact.');

const pause = (page: import('playwright/test').Page, milliseconds = 650) => page.waitForTimeout(milliseconds);

test('records the Element Shadow acceptance proof', async ({ appPage }, testInfo) => {
  test.setTimeout(120_000);
  await appPage.getByPlaceholder('Album name...').fill('Issue 46 — Element Shadow proof');

  await openNonImagePanel(appPage, 'shapes');
  await appPage.getByTestId('shape-preset-ellipse').click();
  await expect(appPage.getByRole('heading', { name: 'Shadow' })).toBeVisible();
  await pause(appPage);
  for (const preset of ['Soft', 'Lifted', 'Dramatic']) {
    await appPage.getByRole('button', { name: `${preset} shadow` }).click();
    await pause(appPage);
  }
  await appPage.getByTestId('shape-border-width-input').fill('8');
  await appPage.getByTestId('shape-border-width-input').blur();
  await pause(appPage);
  await appPage.getByTitle('Undo (Ctrl+Z)').first().click();
  await pause(appPage, 450);
  await appPage.getByTitle('Redo (Ctrl+Y)').first().click();
  await pause(appPage);
  await appPage.getByRole('button', { name: 'Delete', exact: true }).click();

  await openNonImagePanel(appPage, 'images');
  const transparentPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=',
    'base64',
  );
  await appPage.getByTestId('file-upload-input').setInputFiles({
    name: 'transparent.png',
    mimeType: 'image/png',
    buffer: transparentPng,
  });
  await expect(appPage.getByTestId('pool-image').first()).toBeVisible();
  await appPage.getByTestId('add-image-btn').click();
  await dragFirstPoolImageToCanvas(appPage);
  await expect(appPage.getByTestId('pool-image').first()).toContainText('Used');
  await pause(appPage, 450);
  await openNonImagePanel(appPage, 'properties');
  await expect(appPage.getByRole('heading', { name: 'Image Properties' })).toBeVisible();
  await appPage.getByTestId('image-border-width-input').fill('8');
  await appPage.getByTestId('image-border-width-input').blur();
  await appPage.getByTestId('image-border-color-input').fill('#2563eb');
  await appPage.getByRole('button', { name: 'Dramatic shadow' }).click();
  await pause(appPage, 900);
  await appPage.getByRole('button', { name: 'Delete', exact: true }).click();

  await appPage.getByRole('button', { name: 'Text', exact: true }).click();
  const editor = appPage.locator('.ProseMirror[contenteditable="true"]');
  await editor.fill('Element Shadow');
  await editor.press('ControlOrMeta+a');
  await appPage.getByTestId('text-underline-btn').click();
  await appPage.getByRole('button', { name: 'Lifted shadow' }).click();
  await expect(appPage.getByTestId('tiptap-text-editor')).toBeVisible();
  await pause(appPage, 900);

  const interactionLayer = appPage.getByTestId('interaction-layer');
  await interactionLayer.click({ force: true, position: { x: 30, y: 30 } });
  await expect(appPage.getByTestId('tiptap-text-editor')).toHaveCount(0);
  await pause(appPage, 900);

  await appPage.getByRole('button', { name: 'Export' }).click();
  await appPage.getByText('Each Spread', { exact: true }).click();
  await appPage.getByRole('button', { name: 'PNG' }).click();
  await appPage.getByRole('button', { name: 'Next' }).click();
  const downloadPromise = appPage.waitForEvent('download');
  await appPage.getByRole('button', { name: 'Generate Export (1)' }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  if (!downloadPath) throw new Error('Export download has no local path');
  const zip = await JSZip.loadAsync(await readFile(downloadPath));
  const exportedFile = Object.values(zip.files).find((file) => !file.dir && file.name.endsWith('.png'));
  if (!exportedFile) throw new Error('Export ZIP did not contain a PNG');
  const exportedPng = await exportedFile.async('uint8array');
  const proofPngPath = testInfo.outputPath('issue-46-export.png');
  await writeFile(proofPngPath, exportedPng);
  await testInfo.attach('Issue 46 PNG export', { path: proofPngPath, contentType: 'image/png' });

  const exportDataUrl = `data:image/png;base64,${Buffer.from(exportedPng).toString('base64')}`;
  await appPage.setContent(`
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; font: 18px Inter, sans-serif;
        color: #172033; background: #eef2f7; }
      main { width: min(1200px, 90vw); text-align: center; }
      h1 { margin: 0 0 8px; }
      p { margin: 0 0 22px; color: #526078; }
      .checker { padding: 24px; border-radius: 16px; box-shadow: 0 10px 35px rgba(15,23,42,.18);
        background-color: white; background-image: linear-gradient(45deg,#e5e7eb 25%,transparent 25%),
        linear-gradient(-45deg,#e5e7eb 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e5e7eb 75%),
        linear-gradient(-45deg,transparent 75%,#e5e7eb 75%); background-size: 24px 24px;
        background-position: 0 0,0 12px,12px -12px,-12px 0; }
      img { display: block; width: 100%; height: auto; }
    </style>
    <main><h1>Issue 46 — PNG export proof</h1><p>Underlined Text uses a glyph shadow; transparent spread pixels remain transparent.</p>
      <div class="checker"><img src="${exportDataUrl}" alt="Exported spread"></div></main>
  `);
  await expect(appPage.getByRole('img', { name: 'Exported spread' })).toBeVisible();
  await pause(appPage, 2200);
});
