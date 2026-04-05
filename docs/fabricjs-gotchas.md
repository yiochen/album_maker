# Fabric.js v7 API Gotchas

Known differences from earlier versions that have caused bugs in this project.
**Check this file before writing any canvas event handler or accessing Fabric object properties.**

---

## Event coordinates

### `mouse:up` has no pointer coordinates
`mouse:up` is typed as `TPointerEventInfo<TPointerEvent> & { isClick: boolean }` and does **not** expose pointer coordinates. Using `(e: { pointer?: ... })` causes `TS2345` ("no properties in common"). To get canvas-pixel coordinates at mouse-up time, track the position during `object:moving` using the native event (see below).

### `mouse:down` / `object:moving` — use the native event for coordinates
`e.pointer` is not reliably present at runtime in Fabric v7 mouse events. Get canvas-pixel X from the native event instead:
```typescript
const canvasEl = canvas.getElement();
const rect = canvasEl.getBoundingClientRect();
const canvasPixelX = (e.e.clientX - rect.left) * (canvas.width / rect.width);
```
- `e.e` is the native `MouseEvent`.
- Multiplying by `canvas.width / rect.width` converts from CSS pixels to canvas pixels, correctly accounting for CSS zoom scaling.

---

## Object properties

### `left`, `top`, `width`, `height`, `scaleX`, `scaleY` are `number | undefined`
These are typed as potentially `undefined` in v7. Always use null-coalescing when doing arithmetic:
```typescript
const left = obj.left ?? 0;
const width = (obj.width ?? 0) * (obj.scaleX ?? 1);
```
Omitting `?? 0` causes `TS2345` under `strict: true`.

---

## TypeScript event handler typing

### "no properties in common" error
TypeScript raises this when a handler's parameter type shares **zero** properties with the actual Fabric event type. Always include at least one property that exists on the actual event (e.g., `target?: fabric.Object`) so TypeScript finds a common property and accepts the handler.

If you only need coordinates and the event type truly has nothing in common with a useful typed shape, suppress with:
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handler = (e: { target?: fabric.Object; e?: any }) => { ... };
```
