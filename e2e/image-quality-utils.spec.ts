import { test, expect } from 'playwright/test';
import { computeEffectivePrintPpi, isFrameTooSmallForBadge } from '../src/hooks/canvasImage/quality';
import { computeLowResBadgeLayout } from '../src/hooks/canvasImage/badgeLayout';
import { getImageUrlForPpi } from '../src/utils/imageSourceSelection';
import { borderPtToCanvasPx, borderPtToModelPx, computeInsetRect, getImageBorder } from '../src/utils/propertyUtils';
import type { ImageContent } from '../src/types';

test.describe('Image Quality Helpers', () => {
  test('computes low-resolution threshold with zoom', async () => {
    await test.step('Compute print PPI values at different zoom levels', async () => {
      const ppi = computeEffectivePrintPpi({
        sourceWidth: 1200,
        sourceHeight: 800,
        frameWidthPx: 800,
        frameHeightPx: 400,
        zoom: 1,
        screenPpi: 96,
      });
      expect(ppi).toBeCloseTo(144, 3);
      expect((ppi ?? 0) < 300).toBe(true);

      const zoomedOutPpi = computeEffectivePrintPpi({
        sourceWidth: 3600,
        sourceHeight: 2400,
        frameWidthPx: 800,
        frameHeightPx: 400,
        zoom: 2,
        screenPpi: 96,
      });
      expect(zoomedOutPpi).toBeCloseTo(216, 3);
      expect((zoomedOutPpi ?? 0) < 300).toBe(true);
    });
  });

  test('adapts badge layout for small zoom and preserves edge anchoring', async () => {
    await test.step('Compare low-zoom and high-zoom badge layout', async () => {
      const lowZoom = computeLowResBadgeLayout({
        frameWidthPx: 600,
        frameHeightPx: 300,
        zoomPercent: 25,
        baseBadgeHeight: 80,
        baseBadgeFontSize: 44,
        baseBadgeMargin: 24,
      });
      const highZoom = computeLowResBadgeLayout({
        frameWidthPx: 600,
        frameHeightPx: 300,
        zoomPercent: 100,
        baseBadgeHeight: 20,
        baseBadgeFontSize: 11,
        baseBadgeMargin: 6,
      });

      expect(lowZoom.label).toBe('Low Res');
      expect(lowZoom.badgeTop).toBeCloseTo(-141, 0);
      expect(lowZoom.badgeLeft).toBeLessThan(290);
      expect(lowZoom.badgeHeight).toBeGreaterThan(0);
      expect(highZoom.badgeTop).toBeCloseTo(-144, 0);
      expect(isFrameTooSmallForBadge(30, 20)).toBe(true);
      expect(isFrameTooSmallForBadge(120, 80)).toBe(false);
    });
  });

  test('selects image URL tiers from shared utility', async () => {
    await test.step('Resolve URL by effective PPI threshold', async () => {
      const content = {
        thumbnailUrl: 'thumb',
        previewUrl: 'preview',
        fullUrl: 'full',
        sourceId: 'dummy',
        sourceImageId: '1',
      } as ImageContent;

      expect(getImageUrlForPpi(content, 30)).toBe('thumb');
      expect(getImageUrlForPpi(content, 96)).toBe('preview');
      expect(getImageUrlForPpi(content, 300)).toBe('full');
    });
  });

  test('converts border pt units and computes inset rects', async () => {
    await test.step('Convert points to screen/model pixels and clamp inset rectangles', async () => {
      expect(borderPtToCanvasPx(1)).toBeCloseTo(96 / 72, 5);
      expect(borderPtToModelPx(1)).toBeCloseTo(300 / 72, 5);

      expect(computeInsetRect({ left: 10, top: 20, width: 100, height: 50 }, 8)).toEqual({
        left: 18,
        top: 28,
        width: 84,
        height: 34,
        insetPx: 8,
      });
      expect(computeInsetRect({ left: 0, top: 0, width: 20, height: 10 }, 99)).toEqual({
        left: 5,
        top: 5,
        width: 10,
        height: 0,
        insetPx: 5,
      });
    });
  });

  test('applies default border values and quality uses inner viewport dimensions', async () => {
    await test.step('Resolve border defaults and compare effective print PPI', async () => {
      expect(getImageBorder({
        fullUrl: 'full',
        previewUrl: 'preview',
        thumbnailUrl: 'thumb',
        sourceId: 'dummy',
        sourceImageId: '1',
      } as ImageContent)).toEqual({
        widthPt: 0,
        color: '#ffffff',
      });

      const withoutBorder = computeEffectivePrintPpi({
        sourceWidth: 2400,
        sourceHeight: 1600,
        frameWidthPx: 800,
        frameHeightPx: 400,
        zoom: 1,
        screenPpi: 96,
      });
      const withBorder = computeEffectivePrintPpi({
        sourceWidth: 2400,
        sourceHeight: 1600,
        frameWidthPx: 700,
        frameHeightPx: 300,
        zoom: 1,
        screenPpi: 96,
      });

      expect(withBorder).not.toBeNull();
      expect((withBorder ?? 0)).toBeGreaterThan(withoutBorder ?? 0);
    });
  });
});
