/**
 * Orientation Matrix Utilities
 *
 * Represents 2D orientation (rotation + flip) as a 2×2 integer matrix.
 * This captures the D4 symmetry group — the 8 symmetries of a square:
 *   4 rotations (0°, 90°, 180°, 270°) × 2 states (normal, flipped)
 *
 * The matrix is stored as a flat tuple [a, b, c, d] representing:
 *   | a  b |
 *   | c  d |
 *
 * The matrix maps source image coordinates to display coordinates:
 *   [displayX]   [a  b]   [sourceX]
 *   [displayY] = [c  d] × [sourceY]
 *
 * Composition is standard matrix multiplication. Button actions are
 * left-multiplication (new transform applied to current view).
 *
 * ## Rendering Application Order
 *
 * The full contentTransform is applied in this pipeline order:
 *   1. Source image pixels
 *   2. Apply orientation matrix (rotate/flip the source)
 *   3. Compute effective dimensions (may swap width/height for 90°/270°)
 *   4. Compute "cover" fit to frame
 *   5. Apply zoom (scale beyond cover)
 *   6. Apply pan (offset within frame)
 *   7. Clip to frame box
 *
 * ## Button Behavior Summary
 *
 * | Button    | Orientation                | Zoom    | PanX        | PanY        |
 * |-----------|----------------------------|---------|-------------|-------------|
 * | Rotate 90 | compose(ROTATE_90, current)| reset 1 | reset 0.5   | reset 0.5   |
 * | Flip H    | compose(FLIP_X, current)   | keep    | 1 - panX    | keep        |
 * | Flip V    | compose(FLIP_Y, current)   | keep    | keep        | 1 - panY    |
 */

/**
 * A 2×2 orientation matrix stored as [a, b, c, d]:
 *   | a  b |
 *   | c  d |
 *
 * All values are integers: -1, 0, or 1.
 * Determinant is always ±1 (det = ad - bc).
 *   det = +1 → pure rotation (no flip)
 *   det = -1 → rotation + reflection (flipped)
 */
export type OrientationMatrix = [number, number, number, number];

// ─── Constants ───────────────────────────────────────────────────────────────

/** Identity — no rotation or flip (0°). */
export const IDENTITY: OrientationMatrix = [1, 0, 0, 1];

/** 90° clockwise rotation. */
export const ROTATE_90_CW: OrientationMatrix = [0, 1, -1, 0];

/** Horizontal flip (mirror left ↔ right). */
export const FLIP_X: OrientationMatrix = [-1, 0, 0, 1];

/** Vertical flip (mirror top ↔ bottom). */
export const FLIP_Y: OrientationMatrix = [1, 0, 0, -1];

// ─── Core ────────────────────────────────────────────────────────────────────

/**
 * Compose two orientation matrices via multiplication: result = a × b.
 * Left-multiplication means `a` is applied AFTER `b` (a operates on the view
 * that b produces). This matches how button actions work: the new transform
 * is left-multiplied onto the current orientation.
 */
export function compose(a: OrientationMatrix, b: OrientationMatrix): OrientationMatrix {
    return [
        a[0] * b[0] + a[1] * b[2],
        a[0] * b[1] + a[1] * b[3],
        a[2] * b[0] + a[3] * b[2],
        a[2] * b[1] + a[3] * b[3],
    ];
}

/** Returns true if the matrix is the identity (no rotation or flip). */
export function isIdentity(m: OrientationMatrix): boolean {
    return m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns true if the orientation swaps width and height (90° or 270° rotation).
 * When true, the effective image dimensions are transposed for cover calculation.
 */
export function isWidthHeightSwapped(m: OrientationMatrix): boolean {
    // At 90° or 270°, the diagonal is zero
    return m[0] === 0;
}

/**
 * Get the effective image dimensions after applying orientation.
 * For 0° and 180° rotations, dimensions stay the same.
 * For 90° and 270° rotations, width and height are swapped.
 *
 * Use this helper instead of manually checking rotation everywhere.
 *
 * @param imgWidth - Natural width of the source image
 * @param imgHeight - Natural height of the source image
 * @param orientation - The orientation matrix (defaults to identity)
 * @returns The effective width and height as seen after orientation
 */
export function getOrientedDimensions(
    imgWidth: number,
    imgHeight: number,
    orientation: OrientationMatrix = IDENTITY,
): { width: number; height: number } {
    if (isWidthHeightSwapped(orientation)) {
        return { width: imgHeight, height: imgWidth };
    }
    return { width: imgWidth, height: imgHeight };
}

/**
 * Extract the rotation angle in degrees (0, 90, 180, or 270).
 */
export function getRotationDeg(m: OrientationMatrix): 0 | 90 | 180 | 270 {
    // m = [cos, sin, -sin, cos] for pure rotations (before flip)
    // For 0°:   [1, 0, 0, 1]   → atan2(0, 1) = 0
    // For 90°:  [0, 1, -1, 0]  → atan2(-1, 0) = -90 → 270? No...
    // Simpler: just match the known patterns
    if (m[0] === 1 && m[3] === 1) return 0;      // [1,0,0,1] or [-1,0,0,1] won't reach here with det>0 check
    if (m[1] === 1 && m[2] === -1) return 90;     // [0,1,-1,0]
    if (m[0] === -1 && m[3] === -1) return 180;   // [-1,0,0,-1]
    if (m[1] === -1 && m[2] === 1) return 270;    // [0,-1,1,0]

    // Flipped cases — extract rotation component
    // det < 0 means flipped. Factor out the flip to get the rotation.
    const det = m[0] * m[3] - m[1] * m[2];
    if (det < 0) {
        // Multiply by FLIP_X to cancel the flip, then get rotation
        const unflipped = compose(FLIP_X, m);
        return getRotationDeg(unflipped);
    }

    return 0; // fallback
}

/**
 * Returns true if the orientation includes a reflection (flip).
 * Determined by the sign of the determinant: det < 0 means flipped.
 */
export function isFlipped(m: OrientationMatrix): boolean {
    return (m[0] * m[3] - m[1] * m[2]) < 0;
}

/**
 * Get the rotation angle in radians for canvas rendering.
 */
export function getRotationRad(m: OrientationMatrix): number {
    return getRotationDeg(m) * Math.PI / 180;
}

/**
 * Decompose an orientation matrix into (angle, flipX) suitable for rendering engines
 * that apply transforms in the order: Flip_local → Rotate (e.g., Fabric.js, Canvas 2D).
 *
 * Our matrix M represents: display = M × source = FlipView × Rotate × source
 * But Fabric.js applies: display = Rotate(angle) × FlipLocal(flipX) × source
 *
 * To match: R(angle) × Fx^flipX = M
 *   - If det(M) > 0 (no flip): angle = rotation of M, flipX = false
 *   - If det(M) < 0 (flipped): cancel the flip to isolate rotation:
 *       R(angle) = M × Fx, so angle = rotation of (M × Fx), flipX = true
 *
 * @returns { angleDeg, flipX } for Fabric.js or similar rendering
 */
export function decomposeForRendering(m: OrientationMatrix): { angleDeg: number; flipX: boolean } {
    const det = m[0] * m[3] - m[1] * m[2];
    if (det > 0) {
        return { angleDeg: getRotationDeg(m), flipX: false };
    } else {
        // M = R(angle) * Fx  →  R(angle) = M * Fx
        const rotationOnly = compose(m, FLIP_X);
        return { angleDeg: getRotationDeg(rotationOnly), flipX: true };
    }
}

// ─── Content Transform Defaults ──────────────────────────────────────────────

/** Default contentTransform values. */
export const CONTENT_TRANSFORM_DEFAULTS = {
    zoom: 1,
    panX: 0.5,
    panY: 0.5,
    orientation: IDENTITY,
} as const;

// ─── Button Action Helpers ───────────────────────────────────────────────────

/** The shape of contentTransform in ImageContent. */
export interface ContentTransformValues {
    zoom: number;
    panX: number;
    panY: number;
    orientation?: OrientationMatrix;
}

/**
 * Apply a 90° clockwise rotation to the content transform.
 * Resets zoom to 1.0 and pan to center (0.5), because the cover fit
 * changes fundamentally when width/height swap.
 */
export function applyRotate90(current: ContentTransformValues): ContentTransformValues {
    const orientation = compose(ROTATE_90_CW, current.orientation ?? IDENTITY);
    return {
        zoom: 1,
        panX: 0.5,
        panY: 0.5,
        orientation,
    };
}

/**
 * Apply a horizontal flip (left ↔ right) to the content transform.
 * Keeps zoom. Mirrors panX (1 - panX) so the same visual region
 * stays in view, just mirrored.
 */
export function applyFlipH(current: ContentTransformValues): ContentTransformValues {
    const orientation = compose(FLIP_X, current.orientation ?? IDENTITY);
    return {
        ...current,
        panX: 1 - current.panX,
        orientation,
    };
}

/**
 * Apply a vertical flip (top ↔ bottom) to the content transform.
 * Keeps zoom. Mirrors panY (1 - panY) so the same visual region
 * stays in view, just mirrored.
 */
export function applyFlipV(current: ContentTransformValues): ContentTransformValues {
    const orientation = compose(FLIP_Y, current.orientation ?? IDENTITY);
    return {
        ...current,
        panY: 1 - current.panY,
        orientation,
    };
}
