# Element Shadows

## Summary

Users can apply one of three curated Shadow Presets to any selected Page Element. The feature provides intentional visual depth without exposing low-level shadow controls.

The feature applies to Image, Shape, and Text Page Elements. New and existing Page Elements have no shadow until a user selects a preset.

## User experience

The Properties panel includes a consistent **Shadow** section for a single selected Page Element. It presents four labeled visual swatches:

- None
- Soft
- Lifted
- Dramatic

The active choice uses the standard selected state. Each choice is a button with an accessible text label. Multi-selection does not expose shadow editing in this release.

Choosing a swatch applies the change immediately. Each choice is a separate command-backed album edit and undo step. Choosing None removes the shadow.

While Text is being edited, users may still change its Shadow Preset in the Properties panel. The Tiptap editing overlay does not render the shadow; the selected shadow becomes visible when editing ends.

## Presets

All presets use `#000000` and point down and to the right at 45 degrees. The direction is page-relative, not relative to the Page Element's rotation.

| Preset | Opacity | Distance | Blur |
|---|---:|---:|---:|
| Soft | 16% | 2 pt | 4 pt |
| Lifted | 22% | 5 pt | 9 pt |
| Dramatic | 30% | 10 pt | 16 pt |

These values are the initial values to verify through visual snapshot review at editor and export resolutions. Once released, a preset definition is stable. A materially different appearance must use a new preset identity.

Distance and blur are physical point values. They do not change when a Page Element is resized. Editor zoom changes only their on-screen pixel representation.

For renderer calculations, 45 degrees means positive horizontal and vertical offsets of equal magnitude in page coordinates:

```ts
offsetXPt = Math.cos(Math.PI / 4) * distancePt;
offsetYPt = Math.sin(Math.PI / 4) * distancePt;
```

## Data contract

The selected preset is a shared optional property on `BasePageElement`:

```ts
interface BasePageElement {
  // Existing properties...
  shadowPreset?: string;
}
```

An absent value means None, so existing albums require no migration. The preset string is retained by copy, duplicate, move, image replacement, and layout operations that preserve an existing Page Element. Newly created elements, including new template placeholders, omit it.

A central registry resolves known string identities to color, opacity, direction, distance, and blur parameters. Resolved parameters are not copied into album data. An unrecognized identity resolves to no shadow without changing or deleting the stored string, allowing an older app version to preserve newer data.

## Visual semantics

### Images

An Image casts a rectangular shadow from the outside edge of its complete frame, including any border. Transparent pixels in the underlying image do not change the silhouette. Placeholder Image elements use the same frame shadow, and the preset remains when an image is assigned or replaced.

Editor-only affordances—including selection controls, the pan control, and the Low Res badge—do not cast shadows.

### Shapes

A Shape casts a shadow from its rendered silhouette, including its fill and outside edge of its border. An unfilled, bordered Shape casts from the border. Fill and border must form one shadow mask so overlapping drawing passes do not make portions of the shadow darker.

### Text

Text casts a shadow from its rendered glyphs and underline decoration, not from its text box. The shadow may extend outside the text box even though text content remains clipped according to existing text-layout behavior.

The Fabric display object renders the shadow when Text is not being edited. The Tiptap editing overlay deliberately omits it.

## Composition and geometry

Each shadow is part of its Page Element's visual layer: it appears behind that Page Element and may appear over lower elements in the spread z-order. It must not shadow editor-only controls.

Shadows may cross the center seam onto the facing page. They are clipped only by the outer spread render surface. Page export continues to render the full spread first and then crop the requested page, so any shadow reaching across the seam is included in the corresponding page crop.

Shadows are visual effects only. Their blur and offset do not affect:

- the stored normalized box;
- selection or hit-testing bounds;
- resize and rotation handles;
- snapping or alignment calculations;
- element positioning; or
- image resolution calculations.

## Rendering requirements

The same preset registry and point conversion rules are shared by the editor and export paths.

- Fabric editor rendering applies the effect only to the Page Element's defined shadow silhouette.
- OffscreenCanvas export rendering constructs the same silhouette and composites its shadow once before drawing the element itself.
- Spread thumbnails and non-editing previews render the shadow.
- PNG and JPEG exports render the shadow consistently with the editor.
- Rotation must not rotate the page-relative shadow vector. A renderer operating inside an element-local rotation transform must compensate for that rotation or composite the shadow in page coordinates.
- Shadow masks must allow blur and offset beyond the Page Element's geometry; internal element clipping must not cut them off.

Pixel-identical output across Fabric, browser canvas, and thumbnail scales is not assumed, but position, physical dimensions, opacity, silhouette, and perceived blur must match closely enough that switching representations produces no visible design change.

## Acceptance criteria

1. A single selected Image, Shape, or Text Page Element shows None, Soft, Lifted, and Dramatic swatches in the Properties panel.
2. New elements and albums created before this feature render with None.
3. Selecting each preset produces the specified shadow and persists after reload.
4. Selecting None removes the shadow.
5. Every selection is independently undoable and redoable.
6. Image shadows use the outer border edge and remain rectangular for transparent image content.
7. Shape shadows follow the combined fill-and-border silhouette without doubled opacity.
8. Text shadows follow glyphs and underlines, not the text box.
9. Text shadows may be changed during editing but are absent from the active editing overlay.
10. Resizing does not change physical shadow distance or blur, and rotating does not change its page-relative direction.
11. Shadows do not change selection, snapping, element geometry, or Low Res calculations.
12. Shadows respect element z-order, can cross the center seam, and are cropped only at the exported surface edge.
13. Copying, duplicating, moving, and replacing content preserve an existing preset; new template elements start with None.
14. Main canvas, thumbnails, previews, and exports show materially matching results.
15. An unknown preset string renders as None and survives a save round trip unchanged.

## Verification plan

- Add pure tests for preset lookup, unknown-ID fallback, point conversion, and the page-relative offset vector.
- Add command/store tests for applying, removing, undoing, redoing, copying, and persisting a preset.
- Add deterministic visual fixtures covering all three Page Element kinds, all three presets, image borders, transparent images, bordered/unfilled shapes, underlined Text, rotation, center-seam spill, and overlapping z-order.
- Compare editor and export images at representative screen and print resolutions.
- Verify that changing a preset during Text editing persists without adding shadow rendering to the Tiptap overlay.

## Out of scope

- Custom color, opacity, angle, distance, blur, or spread controls
- User-created or user-edited presets
- Batch editing for multi-selection
- Shadow rendering in the active Text editing overlay
- Shadows on editor chrome or selection affordances
- Per-run Text shadows
- Inner shadows, glow effects, or multiple shadows on one Page Element

## Related decisions

- [Reference stable shadow presets](./adr/0001-reference-stable-shadow-presets.md)
- [Photo Album Editor glossary](../CONTEXT.md)
