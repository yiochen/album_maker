import { test, expect } from 'playwright/test';
import { computeEffectivePrintPpi, isFrameTooSmallForBadge } from '../src/hooks/canvasImage/quality';
import { computeLowResBadgeLayout } from '../src/hooks/canvasImage/badgeLayout';
import { getImageUrlForPpi } from '../src/utils/imageSourceSelection';
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
});
