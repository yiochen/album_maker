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

async function getImageShadowRingPixels(page: Page): Promise<number[]> {
  return page.evaluate(() => {
    const fabricCanvas = (window as unknown as {
      __FABRIC_CANVAS__?: {
        lowerCanvasEl: HTMLCanvasElement;
        getObjects(): Array<{
          pageElement?: { type?: string };
          getBoundingRect(): { left: number; top: number; width: number; height: number };
        }>;
      };
    }).__FABRIC_CANVAS__;
    const imageObject = fabricCanvas?.getObjects().find((item) => item.pageElement?.type === 'image');
    if (!fabricCanvas || !imageObject) throw new Error('No Image Page Element on the canvas');

    const bounds = imageObject.getBoundingRect();
    const context = fabricCanvas.lowerCanvasEl.getContext('2d');
    if (!context) throw new Error('Could not inspect the Fabric canvas');
    const pixels = context.getImageData(
      0,
      0,
      fabricCanvas.lowerCanvasEl.width,
      fabricCanvas.lowerCanvasEl.height,
    );
    const right = Math.ceil(bounds.left + bounds.width);
    const bottom = Math.ceil(bounds.top + bounds.height);
    const left = Math.floor(bounds.left);
    const top = Math.floor(bounds.top);
    const ringPixels: number[] = [];

    for (let y = Math.max(0, top); y < Math.min(pixels.height, bottom + 50); y += 1) {
      for (let x = Math.max(0, left); x < Math.min(pixels.width, right + 50); x += 1) {
        const outsideFrame = x >= right + 2 || y >= bottom + 2;
        if (!outsideFrame) continue;
        const offset = (y * pixels.width + x) * 4;
        ringPixels.push(
          pixels.data[offset],
          pixels.data[offset + 1],
          pixels.data[offset + 2],
        );
      }
    }
    return ringPixels;
  });
}

async function getTextRenderPixels(page: Page): Promise<number[]> {
  return page.evaluate(() => {
    const fabricCanvas = (window as unknown as {
      __FABRIC_CANVAS__?: {
        lowerCanvasEl: HTMLCanvasElement;
        getObjects(): Array<{
          pageElement?: { type?: string };
          getBoundingRect(): { left: number; top: number; width: number; height: number };
        }>;
      };
    }).__FABRIC_CANVAS__;
    const textObject = fabricCanvas?.getObjects().find((item) => item.pageElement?.type === 'text');
    if (!fabricCanvas || !textObject) throw new Error('No Text Page Element on the canvas');
    const bounds = textObject.getBoundingRect();
    const left = Math.max(0, Math.floor(bounds.left - 50));
    const top = Math.max(0, Math.floor(bounds.top - 50));
    const width = Math.min(fabricCanvas.lowerCanvasEl.width - left, Math.ceil(bounds.width + 100));
    const height = Math.min(fabricCanvas.lowerCanvasEl.height - top, Math.ceil(bounds.height + 100));
    const context = fabricCanvas.lowerCanvasEl.getContext('2d');
    if (!context) throw new Error('Could not inspect the Fabric canvas');
    const data = context.getImageData(left, top, width, height).data;
    const pixels: number[] = [];
    for (let offset = 0; offset < data.length; offset += 4) {
      pixels.push(data[offset], data[offset + 1], data[offset + 2]);
    }
    return pixels;
  });
}

function countDarkenedPixels(before: number[], after: number[]): number {
  let darkenedPixels = 0;
  for (let offset = 0; offset < Math.min(before.length, after.length); offset += 3) {
    const beforeBrightness = before[offset] + before[offset + 1] + before[offset + 2];
    const afterBrightness = after[offset] + after[offset + 1] + after[offset + 2];
    if (afterBrightness < beforeBrightness - 6) darkenedPixels += 1;
  }
  return darkenedPixels;
}

async function rememberCurrentSpreadThumbnail(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const thumbnail = document.querySelector<HTMLImageElement>('[data-testid="page-half-thumbnail-left"] img');
    if (!thumbnail) throw new Error('Spread thumbnail is not visible');
    await thumbnail.decode();
    const response = await fetch(thumbnail.currentSrc || thumbnail.src);
    const bitmap = await createImageBitmap(await response.blob());
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not inspect the spread thumbnail');
    context.drawImage(bitmap, 0, 0);
    (window as unknown as { __SHADOW_THUMBNAIL_BASELINE__?: Uint8ClampedArray })
      .__SHADOW_THUMBNAIL_BASELINE__ = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
    bitmap.close();
  });
}

async function countDarkenedThumbnailPixels(page: Page): Promise<number> {
  return page.evaluate(async () => {
    const baseline = (window as unknown as { __SHADOW_THUMBNAIL_BASELINE__?: Uint8ClampedArray })
      .__SHADOW_THUMBNAIL_BASELINE__;
    const thumbnail = document.querySelector<HTMLImageElement>('[data-testid="page-half-thumbnail-left"] img');
    if (!baseline || !thumbnail) throw new Error('Thumbnail baseline is unavailable');
    await thumbnail.decode();
    const response = await fetch(thumbnail.currentSrc || thumbnail.src);
    const bitmap = await createImageBitmap(await response.blob());
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not inspect the spread thumbnail');
    context.drawImage(bitmap, 0, 0);
    const current = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
    bitmap.close();
    let darkenedPixels = 0;
    for (let offset = 0; offset < Math.min(baseline.length, current.length); offset += 4) {
      const before = baseline[offset] + baseline[offset + 1] + baseline[offset + 2];
      const after = current[offset] + current[offset + 1] + current[offset + 2];
      if (after < before - 18) darkenedPixels += 1;
    }
    return darkenedPixels;
  });
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

  test('renders an Image Element Shadow on the live editor canvas', async ({ appPage }) => {
    await appPage.getByTestId('add-image-btn').click();
    await openNonImagePanel(appPage, 'properties');

    const sizeSection = appPage.locator('.property-section').filter({
      has: appPage.getByRole('heading', { name: 'Size (inch)' }),
    });
    await sizeSection.getByRole('spinbutton').nth(0).fill('3');
    await sizeSection.getByRole('spinbutton').nth(1).fill('3');
    const positionSection = appPage.locator('.property-section').filter({
      has: appPage.getByRole('heading', { name: 'Position (inch)' }),
    });
    await positionSection.getByRole('spinbutton').nth(0).fill('1.5');
    await positionSection.getByRole('spinbutton').nth(1).fill('3');

    const pixelsWithoutShadow = await getImageShadowRingPixels(appPage);
    await appPage.getByRole('button', { name: 'Dramatic shadow' }).click();
    await expect.poll(async () => {
      const pixelsWithShadow = await getImageShadowRingPixels(appPage);
      return countDarkenedPixels(pixelsWithoutShadow, pixelsWithShadow);
    }).toBeGreaterThan(100);
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

  test('renders a Text Element Shadow in the static spread thumbnail', async ({ appPage }) => {
    await appPage.getByRole('button', { name: 'Text' }).click();
    await openNonImagePanel(appPage, 'properties');
    const editor = appPage.locator('.ProseMirror[contenteditable="true"]');
    await editor.fill('Static Shadow');
    const interactionLayer = appPage.getByTestId('interaction-layer');
    await interactionLayer.click({ force: true, position: { x: 30, y: 30 } });
    await expect(appPage.getByTestId('tiptap-text-editor')).toHaveCount(0);

    await openNonImagePanel(appPage, 'navigator');
    const leftThumbnail = appPage.getByTestId('page-half-thumbnail-left').locator('img');
    await expect(leftThumbnail).toBeVisible();
    await expect.poll(() => leftThumbnail.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await rememberCurrentSpreadThumbnail(appPage);

    await selectFirstCanvasObject(appPage);
    await openNonImagePanel(appPage, 'properties');
    await appPage.getByRole('button', { name: 'Dramatic shadow' }).click();
    await openNonImagePanel(appPage, 'navigator');
    await expect.poll(() => countDarkenedThumbnailPixels(appPage)).toBeGreaterThan(100);
  });

  test('renders a Text Element Shadow after leaving the editing overlay', async ({ appPage }) => {
    await appPage.getByRole('button', { name: 'Text' }).click();
    await openNonImagePanel(appPage, 'properties');
    const editor = appPage.locator('.ProseMirror[contenteditable="true"]');
    await editor.fill('Static Shadow');
    await appPage.getByTestId('interaction-layer').click({ force: true, position: { x: 30, y: 30 } });
    await expect(appPage.getByTestId('tiptap-text-editor')).toHaveCount(0);
    await selectFirstCanvasObject(appPage);

    const pixelsWithoutShadow = await getTextRenderPixels(appPage);
    await appPage.getByRole('button', { name: 'Dramatic shadow' }).click();
    await expect.poll(async () => {
      const pixelsWithShadow = await getTextRenderPixels(appPage);
      return countDarkenedPixels(pixelsWithoutShadow, pixelsWithShadow);
    }).toBeGreaterThan(100);
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
