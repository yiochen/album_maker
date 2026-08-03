import { readFile, writeFile } from 'node:fs/promises';
import JSZip from 'jszip';
import type { Page } from 'playwright/test';
import { test, expect, openNonImagePanel, selectFirstCanvasObject } from './fixtures';

async function getCanvasShadowPresets(page: Page): Promise<Array<string | null>> {
  return page.evaluate(() => {
    const fabricCanvas = (window as unknown as {
      __FABRIC_CANVAS__?: {
        getObjects(): Array<{
          data?: { id?: string };
          pageElement?: { shadowPreset?: string };
        }>;
      };
    }).__FABRIC_CANVAS__;
    if (!fabricCanvas) return [];
    return fabricCanvas.getObjects()
      .filter((object) => object.data?.id && object.data.id !== 'seam')
      .map((object) => object.pageElement?.shadowPreset ?? null);
  });
}

async function replaceStoredShadowPreset(page: Page, shadowPreset: string): Promise<void> {
  await page.evaluate(async (nextPreset) => {
    const request = indexedDB.open('AlbumEditorDB-v1');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const settingsTransaction = db.transaction('settings', 'readonly');
      const currentAlbumRequest = settingsTransaction.objectStore('settings').get('currentAlbumId');
      const currentAlbum = await new Promise<{ value: string } | undefined>((resolve, reject) => {
        currentAlbumRequest.onsuccess = () => resolve(currentAlbumRequest.result);
        currentAlbumRequest.onerror = () => reject(currentAlbumRequest.error);
      });
      if (!currentAlbum) throw new Error('No current album record');

      const albumTransaction = db.transaction('albums', 'readwrite');
      const albumStore = albumTransaction.objectStore('albums');
      const albumRequest = albumStore.get(currentAlbum.value);
      const albumRecord = await new Promise<{ data: string }>((resolve, reject) => {
        albumRequest.onsuccess = () => resolve(albumRequest.result);
        albumRequest.onerror = () => reject(albumRequest.error);
      });
      const album = JSON.parse(albumRecord.data) as {
        spreads: Array<{ elements: Array<{ shadowPreset?: string }> }>;
      };
      album.spreads[0].elements[0].shadowPreset = nextPreset;
      albumStore.put({ ...albumRecord, data: JSON.stringify(album) });
      await new Promise<void>((resolve, reject) => {
        albumTransaction.oncomplete = () => resolve();
        albumTransaction.onerror = () => reject(albumTransaction.error);
      });
    } finally {
      db.close();
    }
  }, shadowPreset);
}

async function rotateFirstCanvasObject(page: Page, angle: number): Promise<void> {
  await page.evaluate((nextAngle) => {
    const fabricCanvas = (window as unknown as {
      __FABRIC_CANVAS__?: {
        getObjects(): Array<{
          data?: { id?: string };
          set(key: string, value: unknown): void;
          setCoords(): void;
        }>;
        setActiveObject(object: unknown): void;
        fire(eventName: string, payload: Record<string, unknown>): void;
        requestRenderAll(): void;
      };
    }).__FABRIC_CANVAS__;
    const object = fabricCanvas?.getObjects().find((item) => item.data?.id !== 'seam');
    if (!fabricCanvas || !object) throw new Error('No canvas object to rotate');
    object.set('angle', nextAngle);
    object.setCoords();
    fabricCanvas.setActiveObject(object);
    fabricCanvas.fire('object:modified', { target: object, transform: {} });
    fabricCanvas.requestRenderAll();
  }, angle);
}

async function exportCurrentSpreadAsPng(page: Page): Promise<Uint8Array> {
  await page.getByRole('button', { name: 'Export' }).click();
  await expect(page.getByTestId('export-page')).toBeVisible();
  await page.getByText('Each Spread', { exact: true }).click();
  await page.getByRole('button', { name: 'PNG' }).click();
  await page.getByRole('button', { name: 'Next' }).click();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Generate Export (1)' }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  if (!downloadPath) throw new Error('Export download has no local path');

  const zip = await JSZip.loadAsync(await readFile(downloadPath));
  const exportedFile = Object.values(zip.files).find((file) => !file.dir && file.name.endsWith('.png'));
  if (!exportedFile) throw new Error('Export ZIP did not contain a PNG');
  return exportedFile.async('uint8array');
}

async function getAlphaBounds(page: Page, pngBytes: Uint8Array) {
  return page.evaluate(async (bytes) => {
    const bitmap = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: 'image/png' }));
    const width = bitmap.width;
    const height = bitmap.height;
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not inspect exported PNG');
    ctx.drawImage(bitmap, 0, 0);
    const pixels = ctx.getImageData(0, 0, width, height).data;

    const opaque = { left: width, top: height, right: -1, bottom: -1 };
    const visible = { left: width, top: height, right: -1, bottom: -1 };
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const alpha = pixels[(y * width + x) * 4 + 3];
        if (alpha > 2) {
          visible.left = Math.min(visible.left, x);
          visible.top = Math.min(visible.top, y);
          visible.right = Math.max(visible.right, x);
          visible.bottom = Math.max(visible.bottom, y);
        }
        if (alpha > 250) {
          opaque.left = Math.min(opaque.left, x);
          opaque.top = Math.min(opaque.top, y);
          opaque.right = Math.max(opaque.right, x);
          opaque.bottom = Math.max(opaque.bottom, y);
        }
      }
    }
    bitmap.close();
    return { opaque, visible };
  }, Array.from(pngBytes));
}

test.describe('Element Shadows', () => {
  test('applies and independently undoes a Shadow Preset on a Shape', async ({ appPage }) => {
    await openNonImagePanel(appPage, 'shapes');
    await appPage.getByTestId('shape-preset-rectangle').click();
    await expect(appPage.getByRole('heading', { name: 'Shape Properties' })).toBeVisible();

    const none = appPage.getByRole('button', { name: 'None shadow' });
    const soft = appPage.getByRole('button', { name: 'Soft shadow' });

    await expect(none).toHaveAttribute('aria-pressed', 'true');

    await soft.click();
    await expect(soft).toHaveAttribute('aria-pressed', 'true');
    await expect(none).toHaveAttribute('aria-pressed', 'false');

    await appPage.getByTitle('Undo (Ctrl+Z)').first().click();
    await expect(none).toHaveAttribute('aria-pressed', 'true');

    await appPage.getByTitle('Redo (Ctrl+Y)').first().click();
    await expect(soft).toHaveAttribute('aria-pressed', 'true');
  });

  test('applies a Shadow Preset to an Image placeholder frame', async ({ appPage }) => {
    await appPage.getByTestId('add-image-btn').click();
    await openNonImagePanel(appPage, 'properties');
    await expect(appPage.getByRole('heading', { name: 'Image Properties' })).toBeVisible();

    const none = appPage.getByRole('button', { name: 'None shadow' });
    const dramatic = appPage.getByRole('button', { name: 'Dramatic shadow' });
    await expect(none).toHaveAttribute('aria-pressed', 'true');

    await dramatic.click();
    await expect(dramatic).toHaveAttribute('aria-pressed', 'true');
  });

  test('changes a Text Shadow Preset without leaving text editing', async ({ appPage }) => {
    await appPage.getByRole('button', { name: 'Text' }).click();
    await openNonImagePanel(appPage, 'properties');
    await expect(appPage.getByRole('heading', { name: 'Text Properties' })).toBeVisible();
    await expect(appPage.getByTestId('tiptap-text-editor')).toBeVisible();

    const lifted = appPage.getByRole('button', { name: 'Lifted shadow' });
    await lifted.click();

    await expect(lifted).toHaveAttribute('aria-pressed', 'true');
    await expect(appPage.getByTestId('tiptap-text-editor')).toBeVisible();
  });

  test('retains presets through copy, removal, and reload', async ({ appPage }) => {
    await openNonImagePanel(appPage, 'shapes');
    await appPage.getByTestId('shape-preset-rectangle').click();
    await appPage.getByRole('button', { name: 'Dramatic shadow' }).click();
    await expect.poll(() => getCanvasShadowPresets(appPage)).toEqual(['dramatic']);

    await appPage.getByTestId('canvas-viewport').focus();
    await appPage.keyboard.press('ControlOrMeta+c');
    await appPage.keyboard.press('ControlOrMeta+v');
    await expect.poll(() => getCanvasShadowPresets(appPage)).toEqual(['dramatic', 'dramatic']);

    await appPage.getByRole('button', { name: 'None shadow' }).click();
    await expect.poll(() => getCanvasShadowPresets(appPage)).toEqual(['dramatic', null]);
    await appPage.waitForTimeout(100);

    await appPage.reload();
    await expect(appPage.getByTestId('album-editor')).toBeVisible();
    await expect.poll(() => getCanvasShadowPresets(appPage)).toEqual(['dramatic', null]);
  });

  test('treats an unknown preset as None without deleting it during a save round trip', async ({ appPage }) => {
    await openNonImagePanel(appPage, 'shapes');
    await appPage.getByTestId('shape-preset-rectangle').click();
    await appPage.waitForTimeout(100);
    await appPage.goto('/vite.svg');
    await replaceStoredShadowPreset(appPage, 'future-soft');

    await appPage.goto('/');
    await expect(appPage.getByTestId('album-editor')).toBeVisible();
    await expect.poll(() => getCanvasShadowPresets(appPage)).toEqual(['future-soft']);

    await selectFirstCanvasObject(appPage);
    await openNonImagePanel(appPage, 'properties');
    await expect(appPage.getByRole('button', { name: 'None shadow' })).toHaveAttribute('aria-pressed', 'true');
    await appPage.getByTestId('shape-fill-color-input').fill('#224466');
    await appPage.waitForTimeout(100);

    await appPage.reload();
    await expect(appPage.getByTestId('album-editor')).toBeVisible();
    await expect.poll(() => getCanvasShadowPresets(appPage)).toEqual(['future-soft']);
  });

  test('includes the Element Shadow in transparent PNG spread export', async ({ appPage }, testInfo) => {
    test.setTimeout(60_000);
    await openNonImagePanel(appPage, 'shapes');
    await appPage.getByTestId('shape-preset-rectangle').click();
    await appPage.getByRole('button', { name: 'Dramatic shadow' }).click();

    const exportedPng = await exportCurrentSpreadAsPng(appPage);
    const exportedPngPath = testInfo.outputPath('exported-spread.png');
    await writeFile(exportedPngPath, exportedPng);
    await testInfo.attach('exported-spread.png', {
      path: exportedPngPath,
      contentType: 'image/png',
    });
    const bounds = await getAlphaBounds(appPage, exportedPng);
    expect(bounds.visible.right - bounds.opaque.right).toBeGreaterThan(25);
    expect(bounds.visible.bottom - bounds.opaque.bottom).toBeGreaterThan(25);
  });

  test('keeps physical shadow size and page-relative direction after resize and rotation', async ({ appPage }) => {
    test.setTimeout(60_000);
    await openNonImagePanel(appPage, 'shapes');
    await appPage.getByTestId('shape-preset-rectangle').click();
    await appPage.getByRole('button', { name: 'Dramatic shadow' }).click();

    const initial = await getAlphaBounds(appPage, await exportCurrentSpreadAsPng(appPage));
    await appPage.goBack();
    await expect(appPage.getByTestId('album-editor')).toBeVisible();
    await rotateFirstCanvasObject(appPage, 90);

    const rotated = await getAlphaBounds(appPage, await exportCurrentSpreadAsPng(appPage));
    await appPage.goBack();
    await expect(appPage.getByTestId('album-editor')).toBeVisible();
    const sizeInputs = appPage.locator('.property-size-input');
    await sizeInputs.nth(0).fill('4');
    await sizeInputs.nth(1).fill('4');

    const resized = await getAlphaBounds(appPage, await exportCurrentSpreadAsPng(appPage));
    const extension = (bounds: Awaited<ReturnType<typeof getAlphaBounds>>) => ({
      right: bounds.visible.right - bounds.opaque.right,
      bottom: bounds.visible.bottom - bounds.opaque.bottom,
    });
    const initialExtension = extension(initial);
    const rotatedExtension = extension(rotated);
    const resizedExtension = extension(resized);
    expect(Math.abs(rotatedExtension.right - initialExtension.right)).toBeLessThanOrEqual(3);
    expect(Math.abs(rotatedExtension.bottom - initialExtension.bottom)).toBeLessThanOrEqual(3);
    expect(Math.abs(resizedExtension.right - initialExtension.right)).toBeLessThanOrEqual(3);
    expect(Math.abs(resizedExtension.bottom - initialExtension.bottom)).toBeLessThanOrEqual(3);
  });

  test('exports an Image placeholder shadow from its rectangular frame', async ({ appPage }) => {
    test.setTimeout(60_000);
    await appPage.getByTestId('add-image-btn').click();
    await openNonImagePanel(appPage, 'properties');
    await appPage.getByRole('button', { name: 'Dramatic shadow' }).click();

    const bounds = await getAlphaBounds(appPage, await exportCurrentSpreadAsPng(appPage));
    expect(bounds.visible.right - bounds.opaque.right).toBeGreaterThan(25);
    expect(bounds.visible.bottom - bounds.opaque.bottom).toBeGreaterThan(25);
  });

  test('exports an underlined Text shadow from glyphs rather than its text box', async ({ appPage }) => {
    test.setTimeout(60_000);
    await appPage.getByRole('button', { name: 'Text' }).click();
    await openNonImagePanel(appPage, 'properties');
    const editor = appPage.locator('.ProseMirror[contenteditable="true"]');
    await editor.fill('Shadow proof');
    await editor.press('ControlOrMeta+a');
    await appPage.getByTestId('text-underline-btn').click();
    await appPage.getByRole('button', { name: 'Lifted shadow' }).click();

    const interactionLayer = appPage.getByTestId('interaction-layer');
    const interactionBox = await interactionLayer.boundingBox();
    if (!interactionBox) throw new Error('Interaction layer is not visible');
    await interactionLayer.click({ force: true, position: { x: 30, y: 30 } });
    await expect(appPage.getByTestId('tiptap-text-editor')).toHaveCount(0);

    const bounds = await getAlphaBounds(appPage, await exportCurrentSpreadAsPng(appPage));
    expect(bounds.visible.right - bounds.opaque.right).toBeGreaterThan(10);
    expect(bounds.visible.bottom - bounds.opaque.bottom).toBeGreaterThan(10);
    expect(bounds.visible.right - bounds.visible.left).toBeLessThan(1200);
  });
});
