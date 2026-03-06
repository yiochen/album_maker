import { computeEffectivePrintPpi, isFrameTooSmallForBadge } from '../../src/hooks/canvasImage/quality';
import { computeLowResBadgeLayout } from '../../src/hooks/canvasImage/badgeLayout';
import { getImageUrlForPpi } from '../../src/utils/imageSourceSelection';
import type { ImageContent } from '../../src/types';

describe('Image Quality Helpers', () => {
    it('computes low-resolution threshold with zoom', () => {
        const ppi = computeEffectivePrintPpi({
            sourceWidth: 1200,
            sourceHeight: 800,
            frameWidthPx: 800,
            frameHeightPx: 400,
            zoom: 1,
            screenPpi: 96,
        });
        expect(ppi).to.be.closeTo(96, 0.001);
        expect((ppi ?? 0) < 300).to.equal(true);

        const zoomedOutPpi = computeEffectivePrintPpi({
            sourceWidth: 3600,
            sourceHeight: 2400,
            frameWidthPx: 800,
            frameHeightPx: 400,
            zoom: 2,
            screenPpi: 96,
        });
        expect(zoomedOutPpi).to.be.closeTo(216, 0.001);
        expect((zoomedOutPpi ?? 0) < 300).to.equal(true);
    });

    it('adapts badge layout for small zoom and preserves edge anchoring', () => {
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

        // At small zoom, badge switches to compact label and stays near the edge.
        expect(lowZoom.label).to.equal('Low Res');
        expect(lowZoom.badgeTop).to.be.closeTo(-147, 0.5);
        expect(lowZoom.badgeLeft).to.be.lessThan(290);
        expect(lowZoom.badgeHeight).to.be.greaterThan(0);
        expect(highZoom.badgeTop).to.be.closeTo(-144, 0.5);
        expect(isFrameTooSmallForBadge(30, 20)).to.equal(true);
        expect(isFrameTooSmallForBadge(120, 80)).to.equal(false);
    });

    it('selects image URL tiers from shared utility', () => {
        const content = {
            thumbnailUrl: 'thumb',
            previewUrl: 'preview',
            fullUrl: 'full',
            sourceId: 'dummy',
            sourceImageId: '1',
        } as ImageContent;
        expect(getImageUrlForPpi(content, 30)).to.equal('thumb');
        expect(getImageUrlForPpi(content, 96)).to.equal('preview');
        expect(getImageUrlForPpi(content, 300)).to.equal('full');
    });
});
