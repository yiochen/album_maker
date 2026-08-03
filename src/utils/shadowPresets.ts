export interface ShadowPresetDefinition {
    id: string;
    label: string;
    color: string;
    opacity: number;
    directionDeg: number;
    distancePt: number;
    blurPt: number;
}

export interface ResolvedElementShadow extends ShadowPresetDefinition {
    colorWithOpacity: string;
    offsetXPx: number;
    offsetYPx: number;
    blurPx: number;
}

export const ELEMENT_SHADOW_PRESETS: readonly ShadowPresetDefinition[] = [
    {
        id: 'soft',
        label: 'Soft',
        color: '#000000',
        opacity: 0.16,
        directionDeg: 45,
        distancePt: 2,
        blurPt: 4,
    },
    {
        id: 'lifted',
        label: 'Lifted',
        color: '#000000',
        opacity: 0.22,
        directionDeg: 45,
        distancePt: 5,
        blurPt: 9,
    },
    {
        id: 'dramatic',
        label: 'Dramatic',
        color: '#000000',
        opacity: 0.30,
        directionDeg: 45,
        distancePt: 10,
        blurPt: 16,
    },
] as const;

export function getShadowPreset(presetId: string | undefined): ShadowPresetDefinition | null {
    if (!presetId) return null;
    return ELEMENT_SHADOW_PRESETS.find((preset) => preset.id === presetId) ?? null;
}

function colorWithOpacity(color: string, opacity: number): string {
    const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color);
    if (!match) return color;
    const [, red, green, blue] = match;
    return `rgba(${Number.parseInt(red, 16)}, ${Number.parseInt(green, 16)}, ${Number.parseInt(blue, 16)}, ${opacity})`;
}

export function resolveElementShadow(
    presetId: string | undefined,
    ppi: number,
): ResolvedElementShadow | null {
    const preset = getShadowPreset(presetId);
    if (!preset) return null;

    const radians = preset.directionDeg * Math.PI / 180;
    const pxPerPt = ppi / 72;
    return {
        ...preset,
        colorWithOpacity: colorWithOpacity(preset.color, preset.opacity),
        offsetXPx: Math.cos(radians) * preset.distancePt * pxPerPt,
        offsetYPx: Math.sin(radians) * preset.distancePt * pxPerPt,
        blurPx: preset.blurPt * pxPerPt,
    };
}

export function getShadowPresetCss(presetId: string | undefined): string | undefined {
    const preset = getShadowPreset(presetId);
    if (!preset) return undefined;
    const radians = preset.directionDeg * Math.PI / 180;
    const offsetXPt = Math.cos(radians) * preset.distancePt;
    const offsetYPt = Math.sin(radians) * preset.distancePt;
    return `${offsetXPt}pt ${offsetYPt}pt ${preset.blurPt}pt ${colorWithOpacity(preset.color, preset.opacity)}`;
}
