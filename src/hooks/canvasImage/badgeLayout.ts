export interface BadgeLayoutInput {
    frameWidthPx: number;
    frameHeightPx: number;
    zoomPercent: number;
    baseBadgeHeight: number;
    baseBadgeFontSize: number;
    baseBadgeMargin: number;
}

export interface BadgeLayoutOutput {
    label: string;
    badgeLeft: number;
    badgeTop: number;
    badgeWidth: number;
    badgeHeight: number;
    textLeft: number;
    textTop: number;
    fontSize: number;
}

export function computeLowResBadgeLayout(input: BadgeLayoutInput): BadgeLayoutOutput {
    const zoomScale = Math.max(0.01, input.zoomPercent / 100);
    const frameWidthScreen = input.frameWidthPx * zoomScale;
    const frameHeightScreen = input.frameHeightPx * zoomScale;

    const label = frameWidthScreen < 86 ? 'LR' : 'Low Res';

    const maxBadgeHeightScreen = Math.max(10, frameHeightScreen * 0.28);
    const badgeHeightScreen = Math.min(input.baseBadgeHeight, maxBadgeHeightScreen);
    const badgeHeight = Math.max(8, badgeHeightScreen / zoomScale);

    const preferredMarginScreen = input.baseBadgeMargin * zoomScale;
    const marginScreen = Math.max(
        1.5,
        Math.min(
            preferredMarginScreen,
            Math.max(2, frameWidthScreen * 0.03),
            Math.max(2, frameHeightScreen * 0.03),
        ),
    );
    const margin = marginScreen / zoomScale;

    const badgeFontSizeScreen = Math.max(8, Math.min(input.baseBadgeFontSize, badgeHeightScreen * 0.58));
    const badgeFontSize = Math.max(6, badgeFontSizeScreen / zoomScale);

    const approxTextWidthScreen = label.length * badgeFontSizeScreen * 0.62;
    const horizontalPaddingScreen = Math.max(6, badgeHeightScreen * 0.42);
    const badgeWidthScreenDesired = approxTextWidthScreen + horizontalPaddingScreen * 2;
    const badgeWidthScreenMax = Math.max(24, frameWidthScreen - marginScreen * 2);
    const badgeWidth = Math.max(22, Math.min(badgeWidthScreenDesired, badgeWidthScreenMax) / zoomScale);

    const badgeLeft = input.frameWidthPx / 2 - badgeWidth - margin;
    const badgeTop = -input.frameHeightPx / 2 + margin;
    const approxTextWidth = label.length * badgeFontSize * 0.62;
    const textLeft = badgeLeft + Math.max(0, (badgeWidth - approxTextWidth) / 2);
    const textTop = badgeTop + Math.max(0, (badgeHeight - badgeFontSize) / 2);

    return {
        label,
        badgeLeft,
        badgeTop,
        badgeWidth,
        badgeHeight,
        textLeft,
        textTop,
        fontSize: badgeFontSize,
    };
}

