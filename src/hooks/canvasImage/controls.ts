import * as fabric from 'fabric';
import type { CanvasImageElement } from '../CanvasImageElement';

export function createPanControl(
    getSize: () => number,
    onPanDelta: (target: CanvasImageElement, deltaX: number, deltaY: number) => boolean,
): fabric.Control {
    return new fabric.Control({
        x: 0,
        y: 0,
        cursorStyle: 'grab',
        actionName: 'pan',
        sizeX: getSize(),
        sizeY: getSize(),
        touchSizeX: getSize() * 1.4,
        touchSizeY: getSize() * 1.4,
        render: (ctx, left, top) => {
            const size = getSize();
            ctx.save();
            ctx.translate(left, top);
            const radius = size / 2 - 2;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
            ctx.fill();

            const line = radius * 0.55;
            const head = radius * 0.28;
            ctx.strokeStyle = 'white';
            ctx.lineWidth = Math.max(1.5, size * 0.08);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            // Up
            ctx.moveTo(0, -line);
            ctx.lineTo(0, -radius * 0.15);
            ctx.moveTo(0, -line);
            ctx.lineTo(-head, -line + head);
            ctx.moveTo(0, -line);
            ctx.lineTo(head, -line + head);
            // Down
            ctx.moveTo(0, line);
            ctx.lineTo(0, radius * 0.15);
            ctx.moveTo(0, line);
            ctx.lineTo(-head, line - head);
            ctx.moveTo(0, line);
            ctx.lineTo(head, line - head);
            // Left
            ctx.moveTo(-line, 0);
            ctx.lineTo(-radius * 0.15, 0);
            ctx.moveTo(-line, 0);
            ctx.lineTo(-line + head, -head);
            ctx.moveTo(-line, 0);
            ctx.lineTo(-line + head, head);
            // Right
            ctx.moveTo(line, 0);
            ctx.lineTo(radius * 0.15, 0);
            ctx.moveTo(line, 0);
            ctx.lineTo(line - head, -head);
            ctx.moveTo(line, 0);
            ctx.lineTo(line - head, head);
            ctx.stroke();
            ctx.restore();
        },
        actionHandler: (_eventData, transform, x, y) => {
            const target = transform.target;
            if (!target) return false;
            const deltaX = x - transform.lastX;
            const deltaY = y - transform.lastY;
            transform.lastX = x;
            transform.lastY = y;
            return onPanDelta(target as CanvasImageElement, deltaX, deltaY);
        },
    });
}

