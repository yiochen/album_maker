import { test, expect } from 'playwright/test';
import {
  ELEMENT_SHADOW_PRESETS,
  getShadowPreset,
  resolveElementShadow,
} from '../src/utils/shadowPresets';

test.describe('Shadow Preset registry', () => {
  test('keeps the released preset identities and parameters stable', () => {
    expect(ELEMENT_SHADOW_PRESETS).toEqual([
      {
        id: 'soft',
        label: 'Soft',
        color: '#000000',
        opacity: 0.16,
        directionDeg: 45,
        distancePt: 2,
        blurPt: 4,
      },
      {
        id: 'lifted',
        label: 'Lifted',
        color: '#000000',
        opacity: 0.22,
        directionDeg: 45,
        distancePt: 5,
        blurPt: 9,
      },
      {
        id: 'dramatic',
        label: 'Dramatic',
        color: '#000000',
        opacity: 0.30,
        directionDeg: 45,
        distancePt: 10,
        blurPt: 16,
      },
    ]);
  });

  test('converts physical point values at the target renderer PPI', () => {
    const screen = resolveElementShadow('dramatic', 96);
    const print = resolveElementShadow('dramatic', 300);
    expect(screen?.blurPx).toBeCloseTo(16 * 96 / 72, 8);
    expect(print?.blurPx).toBeCloseTo(16 * 300 / 72, 8);
    expect(screen?.offsetXPx).toBeCloseTo(Math.cos(Math.PI / 4) * 10 * 96 / 72, 8);
    expect(screen?.offsetYPx).toBeCloseTo(screen?.offsetXPx ?? 0, 8);
  });

  test('resolves absent and unknown string identities as no shadow', () => {
    expect(getShadowPreset(undefined)).toBeNull();
    expect(getShadowPreset('future-soft')).toBeNull();
    expect(resolveElementShadow('future-soft', 300)).toBeNull();
  });
});
