import type { SnapEdge, SnapConstraints, Position, Size } from '../types';

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
    snapConstraints?: SnapConstraints;
}

export interface SnapLine {
    orientation: 'horizontal' | 'vertical';
    position: number; // Percentage
    edge: SnapEdge;
}

/**
 * Get all snap targets for a two-page spread
 * Canvas is 2x page width, 1x page height
 */
export function getSnapTargets(): SnapTarget[] {
    const targets: SnapTarget[] = [];

    // Left page edges
    targets.push({ edge: 'left', position: 0, orientation: 'vertical' });
    targets.push({ edge: 'top', position: 0, orientation: 'horizontal' });
    targets.push({ edge: 'bottom', position: 100, orientation: 'horizontal' });

    // Seam (center of spread)
    targets.push({ edge: 'seam', position: 50, orientation: 'vertical' });

    // Right page edges
    targets.push({ edge: 'right', position: 100, orientation: 'vertical' });

    // Left page center lines
    targets.push({ edge: 'left-center-h', position: 50, orientation: 'horizontal' }); // Horizontal center
    targets.push({ edge: 'left-center-v', position: 25, orientation: 'vertical' });   // Vertical center of left page

    // Right page center lines
    targets.push({ edge: 'right-center-h', position: 50, orientation: 'horizontal' }); // Same as left center horizontal
    targets.push({ edge: 'right-center-v', position: 75, orientation: 'vertical' });   // Vertical center of right page

    return targets;
}

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
    const targets = getSnapTargets();
    const snappedEdges: SnapEdge[] = [];
    const snapConstraints: SnapConstraints = {};

    let newX = position.x;
    let newY = position.y;

    // Element edges
    const left = position.x;
    const right = position.x + size.width;
    const top = position.y;
    const bottom = position.y + size.height;
    const centerX = position.x + size.width / 2;
    const centerY = position.y + size.height / 2;

    // Check vertical snaps (for X position)
    for (const target of targets.filter(t => t.orientation === 'vertical')) {
        // Snap left edge
        if (Math.abs(left - target.position) < threshold) {
            newX = target.position;
            snappedEdges.push(target.edge);
            snapConstraints.horizontal = { edge: target.edge, offset: 0 };
            break;
        }
        // Snap right edge
        if (Math.abs(right - target.position) < threshold) {
            newX = target.position - size.width;
            snappedEdges.push(target.edge);
            snapConstraints.horizontal = { edge: target.edge, offset: -size.width };
            break;
        }
        // Snap center
        if (Math.abs(centerX - target.position) < threshold) {
            newX = target.position - size.width / 2;
            snappedEdges.push(target.edge);
            snapConstraints.horizontal = { edge: target.edge, offset: -size.width / 2 };
            break;
        }
    }

    // Check horizontal snaps (for Y position)
    for (const target of targets.filter(t => t.orientation === 'horizontal')) {
        // Snap top edge
        if (Math.abs(top - target.position) < threshold) {
            newY = target.position;
            snappedEdges.push(target.edge);
            snapConstraints.vertical = { edge: target.edge, offset: 0 };
            break;
        }
        // Snap bottom edge
        if (Math.abs(bottom - target.position) < threshold) {
            newY = target.position - size.height;
            snappedEdges.push(target.edge);
            snapConstraints.vertical = { edge: target.edge, offset: -size.height };
            break;
        }
        // Snap center
        if (Math.abs(centerY - target.position) < threshold) {
            newY = target.position - size.height / 2;
            snappedEdges.push(target.edge);
            snapConstraints.vertical = { edge: target.edge, offset: -size.height / 2 };
            break;
        }
    }

    return {
        position: { x: newX, y: newY },
        snappedEdges,
        snapConstraints: Object.keys(snapConstraints).length > 0 ? snapConstraints : undefined,
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
    const targets = getSnapTargets();
    const snappedEdges: SnapEdge[] = [];

    let newX = position.x;
    let newY = position.y;
    let newWidth = size.width;
    let newHeight = size.height;

    // Calculate edges based on resize handle
    const right = position.x + size.width;
    const bottom = position.y + size.height;

    // Check vertical snaps based on which edge is being resized
    for (const target of targets.filter(t => t.orientation === 'vertical')) {
        if (resizeHandle.includes('e')) {
            // Resizing right edge
            if (Math.abs(right - target.position) < threshold) {
                newWidth = target.position - position.x;
                snappedEdges.push(target.edge);
                break;
            }
        }
        if (resizeHandle.includes('w')) {
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
        if (resizeHandle.includes('s')) {
            // Resizing bottom edge
            if (Math.abs(bottom - target.position) < threshold) {
                newHeight = target.position - position.y;
                snappedEdges.push(target.edge);
                break;
            }
        }
        if (resizeHandle.includes('n')) {
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
 * Get snap lines to display on canvas
 */
export function getActiveSnapLines(snappedEdges: SnapEdge[]): SnapLine[] {
    const targets = getSnapTargets();
    return targets
        .filter(t => snappedEdges.includes(t.edge))
        .map(t => ({
            orientation: t.orientation,
            position: t.position,
            edge: t.edge,
        }));
}

/**
 * Recompute element position based on snap constraints when page size changes
 */
export function recomputePositionFromConstraints(
    constraints: SnapConstraints,
    size: Size
): Position {
    const targets = getSnapTargets();
    let x = 0;
    let y = 0;

    if (constraints.horizontal) {
        const target = targets.find(t => t.edge === constraints.horizontal!.edge);
        if (target) {
            x = target.position + constraints.horizontal.offset;
        }
    }

    if (constraints.vertical) {
        const target = targets.find(t => t.edge === constraints.vertical!.edge);
        if (target) {
            y = target.position + constraints.vertical.offset;
        }
    }

    return { x, y };
}

/**
 * Convert percentage to physical units
 */
export function percentToUnit(
    percent: number,
    totalSize: number,
    unit: 'inch' | 'cm'
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
