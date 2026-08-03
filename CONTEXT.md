# Photo Album Editor

The language used to describe the visual objects and editing concepts in a photo album.

## Language

**Page Element**:
A visual object placed on a spread. A Page Element is an Image, Text, or Shape.
_Avoid_: Element, object

**Element Shadow**:
A shadow cast by a Page Element: from an Image's crop frame, a Shape's visible silhouette, or Text's rendered glyphs.
_Avoid_: Box shadow, drop shadow

**Shadow Preset**:
A stable, curated Element Shadow style selected as a whole, without exposing its individual visual parameters to the user. A materially different style receives a new preset rather than changing an existing one.
_Avoid_: Shadow settings, custom shadow

**Soft Shadow**:
The subtle Shadow Preset intended for gentle separation from the page.

**Lifted Shadow**:
The medium Shadow Preset intended to make a Page Element appear raised from the page.

**Dramatic Shadow**:
The strongest Shadow Preset, intended as an intentionally stylized effect.
