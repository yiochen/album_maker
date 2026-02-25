import type { SnapEdge, Position, Size } from '../types';

// Snap threshold in percentage
const SNAP_THRESHOLD = 2;

export interface SnapTarget {
    edge: SnapEdge;
    position: number; // Percentage position
    orientation: 'horizontal' | 'vertical';
}

export interface SnapResult {
    position: Position;
    snappedEdges: SnapEdge[];
}

export interface SnapLine {
    orientation: 'horizontal' | 'vertical';
    position: number; // Percentage
    edge: SnapEdge;
}

/**
 * Get all snap targets for a two-page spread
 * Canvas is 2x page width, 1x page height
 * Cached as a constant to avoid re-creation on every call
 */
export const SNAP_TARGETS: SnapTarget[] = [
    // Left page edges
    { edge: 'left', position: 0, orientation: 'vertical' },
    { edge: 'top', position: 0, orientation: 'horizontal' },
    { edge: 'bottom', position: 100, orientation: 'horizontal' },

    // Seam (center of spread)
    { edge: 'seam', position: 50, orientation: 'vertical' },

    // Right page edges
    { edge: 'right', position: 100, orientation: 'vertical' },

    // Left page center lines
    { edge: 'left-center-h', position: 50, orientation: 'horizontal' },
    { edge: 'left-center-v', position: 25, orientation: 'vertical' },

    // Right page center lines
    { edge: 'right-center-h', position: 50, orientation: 'horizontal' },
    { edge: 'right-center-v', position: 75, orientation: 'vertical' },
];

// Pre-filtered arrays to avoid filtering on every move
const VERTICAL_TARGETS = SNAP_TARGETS.filter(t => t.orientation === 'vertical');
const HORIZONTAL_TARGETS = SNAP_TARGETS.filter(t => t.orientation === 'horizontal');

/**
 * Calculate snapped position for an element
 * @param position Current element position (top-left corner in %)
 * @param size Element size in %
 * @param threshold Snap threshold in %
 */
export function calculateSnap(
    position: Position,
    size: Size,
    threshold: number = SNAP_THRESHOLD
): SnapResult {
    const snappedEdges: SnapEdge[] = [];

    let newX = position.x;
    let newY = position.y;

    // Element edges - pre-compute once
    const left = position.x;
    const right = position.x + size.width;
    const top = position.y;
    const bottom = position.y + size.height;
    const centerX = position.x + size.width / 2;
    const centerY = position.y + size.height / 2;

    // Check vertical snaps (for X position) - use pre-filtered array
    for (const target of VERTICAL_TARGETS) {
        // Snap left edge
        if (Math.abs(left - target.position) < threshold) {
            newX = target.position;
            snappedEdges.push(target.edge);
            break;
        }
        // Snap right edge
        if (Math.abs(right - target.position) < threshold) {
            newX = target.position - size.width;
            snappedEdges.push(target.edge);
            break;
        }
        // Snap center
        if (Math.abs(centerX - target.position) < threshold) {
            newX = target.position - size.width / 2;
            snappedEdges.push(target.edge);
            break;
        }
    }

    // Check horizontal snaps (for Y position) - use pre-filtered array
    for (const target of HORIZONTAL_TARGETS) {
        // Snap top edge
        if (Math.abs(top - target.position) < threshold) {
            newY = target.position;
            snappedEdges.push(target.edge);
            break;
        }
        // Snap bottom edge
        if (Math.abs(bottom - target.position) < threshold) {
            newY = target.position - size.height;
            snappedEdges.push(target.edge);
            break;
        }
        // Snap center
        if (Math.abs(centerY - target.position) < threshold) {
            newY = target.position - size.height / 2;
            snappedEdges.push(target.edge);
            break;
        }
    }

    return {
        position: { x: newX, y: newY },
        snappedEdges,
    };
}

/**
 * Calculate snapped size for resize operations
 */
export function calculateResizeSnap(
    position: Position,
    size: Size,
    resizeHandle: string,
    threshold: number = SNAP_THRESHOLD
): { position: Position; size: Size; snappedEdges: SnapEdge[] } {
    const targets = SNAP_TARGETS;
    const snappedEdges: SnapEdge[] = [];

    let newX = position.x;
    let newY = position.y;
    let newWidth = size.width;
    let newHeight = size.height;

    // Calculate edges based on resize handle
    const right = position.x + size.width;
    const bottom = position.y + size.height;

    // Fabric corner names use l/r/t/b (tl,tr,ml,mr,...) rather than e/w/n/s.
    // Check vertical snaps based on which edge is being resized.
    for (const target of targets.filter(t => t.orientation === 'vertical')) {
        if (resizeHandle.includes('r')) {
            // Resizing right edge
            if (Math.abs(right - target.position) < threshold) {
                newWidth = target.position - position.x;
                snappedEdges.push(target.edge);
                break;
            }
        }
        if (resizeHandle.includes('l')) {
            // Resizing left edge
            if (Math.abs(position.x - target.position) < threshold) {
                const diff = position.x - target.position;
                newX = target.position;
                newWidth = size.width + diff;
                snappedEdges.push(target.edge);
                break;
            }
        }
    }

    // Check horizontal snaps
    for (const target of targets.filter(t => t.orientation === 'horizontal')) {
        if (resizeHandle.includes('b')) {
            // Resizing bottom edge
            if (Math.abs(bottom - target.position) < threshold) {
                newHeight = target.position - position.y;
                snappedEdges.push(target.edge);
                break;
            }
        }
        if (resizeHandle.includes('t')) {
            // Resizing top edge
            if (Math.abs(position.y - target.position) < threshold) {
                const diff = position.y - target.position;
                newY = target.position;
                newHeight = size.height + diff;
                snappedEdges.push(target.edge);
                break;
            }
        }
    }

    return {
        position: { x: newX, y: newY },
        size: { width: Math.max(5, newWidth), height: Math.max(5, newHeight) },
        snappedEdges,
    };
}

/**
 * Calculate snapped size for aspect-locked corner resize.
 * Keeps the opposite corner fixed and snaps either X edge or Y edge
 * (whichever requires less movement while preserving aspect ratio).
 */
export function calculateAspectLockedResizeSnap(
    position: Position,
    size: Size,
    resizeHandle: string,
    threshold: number = SNAP_THRESHOLD
): { position: Position; size: Size; snappedEdges: SnapEdge[] } {
    // Aspect lock only supports corner handles in this app.
    const isCornerHandle = resizeHandle.includes('l') || resizeHandle.includes('r')
        ? (resizeHandle.includes('t') || resizeHandle.includes('b'))
        : false;
    if (!isCornerHandle || size.height === 0) {
        return { position, size, snappedEdges: [] };
    }

    const left = position.x;
    const top = position.y;
    const right = position.x + size.width;
    const bottom = position.y + size.height;
    const ratio = size.width / size.height;

    if (!Number.isFinite(ratio) || ratio <= 0) {
        return { position, size, snappedEdges: [] };
    }

    const movingLeft = resizeHandle.includes('l');
    const movingTop = resizeHandle.includes('t');
    const anchorX = movingLeft ? right : left;
    const anchorY = movingTop ? bottom : top;
    const movingX = movingLeft ? left : right;
    const movingY = movingTop ? top : bottom;

    type Candidate = {
        position: Position;
        size: Size;
        snappedEdges: SnapEdge[];
        score: number;
    };
    const candidates: Candidate[] = [];

    for (const target of VERTICAL_TARGETS) {
        if (Math.abs(movingX - target.position) >= threshold) continue;

        const width = movingLeft ? anchorX - target.position : target.position - anchorX;
        if (width < 5) continue;

        const height = width / ratio;
        if (height < 5) continue;

        const x = movingLeft ? target.position : anchorX;
        const y = movingTop ? anchorY - height : anchorY;

        const nextMovingX = movingLeft ? x : x + width;
        const nextMovingY = movingTop ? y : y + height;
        const score = Math.abs(nextMovingX - movingX) + Math.abs(nextMovingY - movingY);

        candidates.push({
            position: { x, y },
            size: { width, height },
            snappedEdges: [target.edge],
            score,
        });
    }

    for (const target of HORIZONTAL_TARGETS) {
        if (Math.abs(movingY - target.position) >= threshold) continue;

        const height = movingTop ? anchorY - target.position : target.position - anchorY;
        if (height < 5) continue;

        const width = height * ratio;
        if (width < 5) continue;

        const y = movingTop ? target.position : anchorY;
        const x = movingLeft ? anchorX - width : anchorX;

        const nextMovingX = movingLeft ? x : x + width;
        const nextMovingY = movingTop ? y : y + height;
        const score = Math.abs(nextMovingX - movingX) + Math.abs(nextMovingY - movingY);

        candidates.push({
            position: { x, y },
            size: { width, height },
            snappedEdges: [target.edge],
            score,
        });
    }

    if (candidates.length === 0) {
        return { position, size, snappedEdges: [] };
    }

    const best = candidates.reduce((prev, curr) => (curr.score < prev.score ? curr : prev));
    return {
        position: best.position,
        size: best.size,
        snappedEdges: best.snappedEdges,
    };
}

// Pre-built lookup map for fast access
const SNAP_LINE_MAP = new Map<SnapEdge, SnapLine>(
    SNAP_TARGETS.map(t => [t.edge, { orientation: t.orientation, position: t.position, edge: t.edge }])
);

/**
 * Get snap lines to display on canvas
 * Uses pre-built map for O(1) lookup per edge
 */
export function getActiveSnapLines(snappedEdges: SnapEdge[]): SnapLine[] {
    const result: SnapLine[] = [];
    for (const edge of snappedEdges) {
        const line = SNAP_LINE_MAP.get(edge);
        if (line) result.push(line);
    }
    return result;
}

/**
 * Convert percentage to physical units
 */
export function percentToUnit(
    percent: number,
    totalSize: number
): number {
    const value = (percent / 100) * totalSize;
    return Math.round(value * 100) / 100;
}

/**
 * Convert physical units to percentage
 */
export function unitToPercent(
    value: number,
    totalSize: number
): number {
    return (value / totalSize) * 100;
}
