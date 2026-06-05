import type { Page } from 'playwright/test';
import { test, expect } from './fixtures';

async function getFirstObjectState(page: Page) {
  return page.evaluate(() => {
    const fabricCanvas = (window as unknown as {
      __FABRIC_CANVAS__?: {
        getObjects(): Array<{
          data?: { id?: string };
          angle?: number;
          isControlVisible?: (controlKey: string) => boolean;
          pageElement?: {
            rotation?: number;
            box?: unknown;
          };
        }>;
      };
    }).__FABRIC_CANVAS__;
    if (!fabricCanvas) return null;
    const obj = fabricCanvas.getObjects().find((item) => item.data?.id !== 'seam');
    if (!obj) return null;
    return {
      angle: obj.angle ?? 0,
      rotation: obj.pageElement?.rotation ?? 0,
      mtrVisible: typeof obj.isControlVisible === 'function' ? obj.isControlVisible('mtr') : false,
      box: JSON.parse(JSON.stringify(obj.pageElement?.box ?? null)),
    };
  });
}

async function rotateFirstObject(page: Page, angle: number) {
  await page.evaluate((nextAngle) => {
    const fabricCanvas = (window as unknown as {
      __FABRIC_CANVAS__?: {
        getObjects(): Array<{
          data?: { id?: string };
          set: (key: string, value: unknown) => void;
          setCoords: () => void;
        }>;
        setActiveObject: (obj: unknown) => void;
        fire: (eventName: string, payload: Record<string, unknown>) => void;
        requestRenderAll: () => void;
      };
    }).__FABRIC_CANVAS__;
    if (!fabricCanvas) return;
    const obj = fabricCanvas.getObjects().find((item) => item.data?.id !== 'seam');
    if (!obj) return;
    Object.assign(obj, { interactionType: 'rotate' });
    obj.set('angle', nextAngle);
    obj.setCoords();
    fabricCanvas.setActiveObject(obj);
    fabricCanvas.fire('object:modified', { target: obj, transform: {} });
    fabricCanvas.requestRenderAll();
  }, angle);
}

test.describe('Element Rotation', () => {
  test('shows rotation handle and persists angle through undo/redo for shapes', async ({ appPage }) => {
    await appPage.getByTestId('nav-shapes').click();
    await appPage.getByTestId('shape-preset-rectangle').click();

    await expect.poll(async () => (await getFirstObjectState(appPage))?.mtrVisible).toBe(true);

    const initial = await getFirstObjectState(appPage);
    await rotateFirstObject(appPage, 30);

    await expect.poll(async () => {
      const state = await getFirstObjectState(appPage);
      return state ? { angle: state.angle, rotation: state.rotation, box: state.box } : null;
    }).toEqual({ angle: 30, rotation: 30, box: initial?.box ?? null });

    await appPage.getByTitle('Undo (Ctrl+Z)').first().click();
    await expect.poll(async () => (await getFirstObjectState(appPage))?.rotation ?? null).toBe(initial?.rotation ?? 0);

    await appPage.getByTitle('Redo (Ctrl+Y)').first().click();
    await expect.poll(async () => (await getFirstObjectState(appPage))?.rotation ?? null).toBe(30);
  });

  test('keeps the text editor overlay rotated in place', async ({ appPage }) => {
    await appPage.getByRole('button', { name: 'Text' }).click();
    await expect(appPage.getByTestId('tiptap-text-editor')).toBeVisible();

    await rotateFirstObject(appPage, 25);

    await expect.poll(async () => {
      return appPage.getByTestId('tiptap-text-editor').evaluate((node) => {
        return window.getComputedStyle(node).transform;
      });
    }).not.toBe('none');

    await expect.poll(async () => {
      return appPage.getByTestId('tiptap-text-editor').evaluate((node) => {
        return (node as HTMLElement).style.transformOrigin;
      });
    }).toBe('center center');
  });
});
