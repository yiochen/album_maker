# Reference stable shadow presets

Page Elements reference a Shadow Preset by a string identity rather than storing a snapshot of its rendering parameters. Preset definitions remain stable; when a materially different appearance is needed, it is introduced as a new preset so the data model stays compact and the UI remains simple. If an existing preset definition is nevertheless changed, saved Page Elements using it will render with that updated definition. An unrecognized identity renders without a shadow but remains intact in persisted data for forward compatibility.
