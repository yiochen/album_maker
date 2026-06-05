import { test, expect } from 'playwright/test';
import { buildSnapGeometry, calculateSnap } from '../src/utils/snapping';
import {
  getRectCenter,
  getRotatedRectBounds,
  getRotatedRectCorners,
  getRotatedRectSnapDelta,
} from '../src/utils/rotatedBounds';

test.describe('Rotation Geometry Helpers', () => {
  test('computes stable rotated corners and bounds', async () => {
    const rect = { left: 10, top: 20, width: 40, height: 20, angle: 90 };
    const corners = getRotatedRectCorners(rect);
    const bounds = getRotatedRectBounds(rect);
    const center = getRectCenter(rect);

    expect(corners).toHaveLength(4);
    expect(center).toEqual({ x: 30, y: 30 });
    expect(bounds.left).toBeCloseTo(20, 5);
    expect(bounds.right).toBeCloseTo(40, 5);
    expect(bounds.top).toBeCloseTo(10, 5);
    expect(bounds.bottom).toBeCloseTo(50, 5);
    expect(bounds.centerX).toBeCloseTo(center.x, 5);
    expect(bounds.centerY).toBeCloseTo(center.y, 5);
  });

  test('computes snap translation from rotated bounds extrema', async () => {
    const rect = { left: 10, top: 20, width: 40, height: 20, angle: 45 };
    const bounds = getRotatedRectBounds(rect);

    const leftDelta = getRotatedRectSnapDelta(rect, 'left', 0);
    const rightDelta = getRotatedRectSnapDelta(rect, 'right', 100);
    const centerDelta = getRotatedRectSnapDelta(rect, 'centerX', 50);

    expect(bounds.left).toBeLessThan(rect.left);
    expect(leftDelta.dx + bounds.left).toBeCloseTo(0, 5);
    expect(rightDelta.dx + bounds.right).toBeCloseTo(100, 5);
    expect(centerDelta.dx + bounds.centerX).toBeCloseTo(50, 5);
    expect(centerDelta.dy).toBe(0);
  });
});

test.describe('Rotation Snapping', () => {
  test('snaps rotated centers and side extrema without using raw box edges', async () => {
    const centered = calculateSnap(buildSnapGeometry({
      left: 40.8,
      top: 10,
      width: 20,
      height: 10,
      angle: 0,
    }));
    expect(centered.snappedEdges).toContain('seam');
    expect(centered.position.x).toBeCloseTo(40, 5);

    const rotatedFrame = {
      left: 1.2,
      top: 10,
      width: 20,
      height: 10,
      angle: 45,
    };
    const geometry = buildSnapGeometry(rotatedFrame);
    const snapped = calculateSnap(geometry);

    expect(snapped.snappedEdges).toContain('left');
    expect(snapped.position.x).not.toBeCloseTo(0, 5);
    expect(snapped.position.x + (geometry.bounds.left - rotatedFrame.left)).toBeCloseTo(0, 5);
  });

  test('does not arm rotated edge snapping from a protruding corner alone', async () => {
    const rotatedFrame = {
      left: 2.4,
      top: 10,
      width: 20,
      height: 10,
      angle: 45,
    };
    const geometry = buildSnapGeometry(rotatedFrame);

    expect(geometry.bounds.left).toBeLessThan(2);

    const snapped = calculateSnap(geometry);

    expect(snapped.snappedEdges).not.toContain('left');
    expect(snapped.position.x).toBeCloseTo(rotatedFrame.left, 5);
  });

  test('preserves non-rotated side snapping behavior', async () => {
    const snapped = calculateSnap(buildSnapGeometry({
      left: 0.8,
      top: 0.7,
      width: 20,
      height: 10,
      angle: 0,
    }));

    expect(snapped.snappedEdges).toContain('left');
    expect(snapped.snappedEdges).toContain('top');
    expect(snapped.position.x).toBeCloseTo(0, 5);
    expect(snapped.position.y).toBeCloseTo(0, 5);
  });
});
