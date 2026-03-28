import { test, expect } from 'playwright/test';
import { getZoomCompensatedSizes } from '../src/utils/fabricRenderer';
import { APP_CONFIG } from '../src/config';

const base = APP_CONFIG.BASE_UI_SIZES;

test.describe('Zoom Compensation Utilities', () => {
  test('getZoomCompensatedSizes at 100% zoom returns exact base values', async () => {
    const sizes = getZoomCompensatedSizes(100);
    expect(sizes.cornerSize).toBe(base.cornerSize);
    expect(sizes.borderLineWidth).toBe(base.borderWidth);
    expect(sizes.borderScaleFactor).toBe(base.borderWidth);
    expect(sizes.seamStrokeWidth).toBe(base.seamStrokeWidth);
    expect(sizes.seamDash).toBe(base.seamDash);
    expect(sizes.selectionLineWidth).toBe(base.selectionLineWidth);
    expect(sizes.snapLineStrokeWidth).toBe(base.snapLineStrokeWidth);
    expect(sizes.snapLineDash).toBe(base.snapLineDash);
    expect(sizes.panControlSize).toBe(base.panControlSize);
  });

  test('getZoomCompensatedSizes at 200% zoom halves all canvas-space sizes', async () => {
    const sizes = getZoomCompensatedSizes(200);
    expect(sizes.cornerSize).toBeCloseTo(base.cornerSize / 2);
    expect(sizes.borderLineWidth).toBeCloseTo(base.borderWidth / 2);
    expect(sizes.borderScaleFactor).toBeCloseTo(base.borderWidth / 2);
    expect(sizes.seamStrokeWidth).toBeCloseTo(base.seamStrokeWidth / 2);
    expect(sizes.seamDash).toBeCloseTo(base.seamDash / 2);
    expect(sizes.selectionLineWidth).toBeCloseTo(base.selectionLineWidth / 2);
    expect(sizes.snapLineStrokeWidth).toBeCloseTo(base.snapLineStrokeWidth / 2);
    expect(sizes.snapLineDash).toBeCloseTo(base.snapLineDash / 2);
    expect(sizes.panControlSize).toBeCloseTo(base.panControlSize / 2);
  });

  test('getZoomCompensatedSizes at 50% zoom doubles all canvas-space sizes', async () => {
    const sizes = getZoomCompensatedSizes(50);
    expect(sizes.cornerSize).toBeCloseTo(base.cornerSize * 2);
    expect(sizes.borderLineWidth).toBeCloseTo(base.borderWidth * 2);
    expect(sizes.borderScaleFactor).toBeCloseTo(base.borderWidth * 2);
    expect(sizes.seamStrokeWidth).toBeCloseTo(base.seamStrokeWidth * 2);
    expect(sizes.seamDash).toBeCloseTo(base.seamDash * 2);
    expect(sizes.selectionLineWidth).toBeCloseTo(base.selectionLineWidth * 2);
    expect(sizes.snapLineStrokeWidth).toBeCloseTo(base.snapLineStrokeWidth * 2);
    expect(sizes.snapLineDash).toBeCloseTo(base.snapLineDash * 2);
    expect(sizes.panControlSize).toBeCloseTo(base.panControlSize * 2);
  });

  test('screen-space invariant holds across the full zoom range', async () => {
    // For every zoom level: canvasCoordValue × (zoom/100) must equal the base screen-pixel size.
    // This is the core zoom compensation contract — breaking the formula fails this test.
    const zoomLevels = [25, 50, 75, 100, 125, 150, 175, 200];
    for (const zoomPercent of zoomLevels) {
      const sizes = getZoomCompensatedSizes(zoomPercent);
      const scale = zoomPercent / 100;
      expect(sizes.cornerSize * scale).toBeCloseTo(base.cornerSize, 5);
      expect(sizes.borderLineWidth * scale).toBeCloseTo(base.borderWidth, 5);
      expect(sizes.borderScaleFactor * scale).toBeCloseTo(base.borderWidth, 5);
      expect(sizes.seamStrokeWidth * scale).toBeCloseTo(base.seamStrokeWidth, 5);
      expect(sizes.seamDash * scale).toBeCloseTo(base.seamDash, 5);
      expect(sizes.selectionLineWidth * scale).toBeCloseTo(base.selectionLineWidth, 5);
      expect(sizes.snapLineStrokeWidth * scale).toBeCloseTo(base.snapLineStrokeWidth, 5);
      expect(sizes.snapLineDash * scale).toBeCloseTo(base.snapLineDash, 5);
      expect(sizes.panControlSize * scale).toBeCloseTo(base.panControlSize, 5);
    }
  });
});
