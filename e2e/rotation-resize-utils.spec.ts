import { test, expect } from 'playwright/test';
import {
  computeNormalizedBoxFromObjectGeometry,
  computeNormalizedBoxFromPixels,
  createNormalizedBoxFromPixels,
} from '../src/utils/boxLayout';
import { getObjectPositionForFrame, getFrameFromObjectGeometry } from '../src/utils/rotatedBounds';

test.describe('Rotation Resize Persistence Helpers', () => {
  test('round-trips an unrotated frame through object geometry', async () => {
    const frame = {
      left: 120,
      top: 80,
      width: 300,
      height: 140,
      angle: 0,
    };

    const objectPosition = getObjectPositionForFrame(frame);
    const reconstructed = getFrameFromObjectGeometry({
      left: objectPosition.x,
      top: objectPosition.y,
      width: frame.width,
      height: frame.height,
      angle: frame.angle,
    });

    expect(reconstructed.left).toBeCloseTo(frame.left, 5);
    expect(reconstructed.top).toBeCloseTo(frame.top, 5);
    expect(reconstructed.width).toBeCloseTo(frame.width, 5);
    expect(reconstructed.height).toBeCloseTo(frame.height, 5);
  });

  test('round-trips a rotated frame through object geometry', async () => {
    const frame = {
      left: 27,
      top: 30,
      width: 383.7301238461409,
      height: 209,
      angle: 18.11718478585624,
    };

    const objectPosition = getObjectPositionForFrame(frame);
    const reconstructed = getFrameFromObjectGeometry({
      left: objectPosition.x,
      top: objectPosition.y,
      width: frame.width,
      height: frame.height,
      angle: frame.angle,
    });

    expect(reconstructed.left).toBeCloseTo(frame.left, 5);
    expect(reconstructed.top).toBeCloseTo(frame.top, 5);
    expect(reconstructed.width).toBeCloseTo(frame.width, 5);
    expect(reconstructed.height).toBeCloseTo(frame.height, 5);
    expect(reconstructed.angle).toBeCloseTo(frame.angle, 5);
  });

  test('persists rotated resize from live object geometry without axis-locked drift', async () => {
    const canvasWidth = 1536;
    const canvasHeight = 768;
    const liveGeometry = {
      left: 69.01435584757337,
      top: -24.523760954712856,
      width: 384,
      height: 209 * 1.4775157741187444,
      angle: 18.11718478585624,
    };

    const normalized = computeNormalizedBoxFromObjectGeometry(liveGeometry, canvasWidth, canvasHeight);
    const expectedFrame = getFrameFromObjectGeometry(liveGeometry);
    const persistedFrame = {
      left: normalized.x1 * canvasWidth,
      top: normalized.y1 * canvasHeight,
      width: (normalized.x2 - normalized.x1) * canvasWidth,
      height: (normalized.y2 - normalized.y1) * canvasHeight,
      angle: liveGeometry.angle,
    };

    expect(persistedFrame.left).toBeCloseTo(expectedFrame.left, 5);
    expect(persistedFrame.top).toBeCloseTo(expectedFrame.top, 5);
    expect(persistedFrame.width).toBeCloseTo(expectedFrame.width, 5);
    expect(persistedFrame.height).toBeCloseTo(expectedFrame.height, 5);
  });

  test('does not preserve old axis-locked bottom-edge behavior for rotated resize', async () => {
    const canvasWidth = 1536;
    const canvasHeight = 768;
    const oldBox = {
      x1: 0.017578125,
      y1: 0.0390625,
      x2: 0.26740242437899797,
      y2: 0.3111979166666667,
    };
    const reconstructedFrame = {
      left: 26.52083383858175,
      top: 29.923605152176776,
      width: 384,
      height: 212.08183587939055,
    };

    const oldAxisLocked = computeNormalizedBoxFromPixels(
      oldBox,
      reconstructedFrame,
      canvasWidth,
      canvasHeight,
      'mb',
    );
    const unified = createNormalizedBoxFromPixels(reconstructedFrame, canvasWidth, canvasHeight);

    expect(oldAxisLocked.x1).toBe(oldBox.x1);
    expect(oldAxisLocked.y1).toBe(oldBox.y1);
    expect(unified.x1).toBeCloseTo(reconstructedFrame.left / canvasWidth, 6);
    expect(unified.y1).toBeCloseTo(reconstructedFrame.top / canvasHeight, 6);
    expect(unified.x1).not.toBe(oldAxisLocked.x1);
    expect(unified.y1).not.toBe(oldAxisLocked.y1);
  });
});
