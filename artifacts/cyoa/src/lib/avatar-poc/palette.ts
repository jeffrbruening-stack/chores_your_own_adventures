/**
 * palette.ts — indexed-color palette swapping.
 *
 * Sprites never store a character's actual skin/hair color. They're painted
 * with a small set of neutral "roles" (skin, hair, base item color, metal,
 * wood, ...). At render time we resolve each role to a concrete hex for the
 * current kid + item combo. The pixel grid itself never changes — this is
 * the same trick real indexed-palette sprites use, and it's what makes an
 * "Iron Sword" and a "Golden Sword" the same art with a different `metal`.
 *
 * IDs below are kept identical to the ones already used in
 * create-character.tsx so this POC's choices line up with the real app.
 */

export type Role =
  | 'skin' | 'skinShadow' | 'skinHighlight'
  | 'hair' | 'hairShadow' | 'hairHighlight'
  | 'base' | 'baseShadow' | 'baseHighlight'
  | 'accent'
  | 'metal' | 'metalDark' | 'metalHighlight'
  | 'wood'
  | 'boot'
  | 'eye'
  | 'shaved';

export type Palette = Partial<Record<Role, string>>;

export const SKIN_TONES = [
  { id: 'light',        label: 'Light',      hex: '#FDDBB4' },
  { id: 'light-medium', label: 'Warm Light', hex: '#F0C49A' },
  { id: 'medium',       label: 'Tan',        hex: '#D4956A' },
  { id: 'tan',          label: 'Honey',      hex: '#C07840' },
  { id: 'dark',         label: 'Brown',      hex: '#8B5A2B' },
  { id: 'very-dark',    label: 'Deep',       hex: '#5C3317' },
] as const;

export const HAIR_COLORS = [
  { id: 'black',          label: 'Black',      hex: '#1a1a1a' },
  { id: 'dark-brown',     label: 'Dark Brown', hex: '#3B2417' },
  { id: 'brown',          label: 'Brown',      hex: '#6F4E37' },
  { id: 'auburn',         label: 'Auburn',     hex: '#A52A2A' },
  { id: 'blonde',         label: 'Blonde',     hex: '#E6C55C' },
  { id: 'red',            label: 'Red',        hex: '#C1440E' },
  { id: 'gray',           label: 'Gray',       hex: '#9E9E9E' },
  { id: 'white',          label: 'White',      hex: '#F5F5F5' },
  { id: 'fantasy-blue',   label: 'Blue',       hex: '#3B6FD4' },
  { id: 'fantasy-green',  label: 'Green',      hex: '#2E8B57' },
  { id: 'fantasy-pink',   label: 'Pink',       hex: '#E75480' },
  { id: 'fantasy-purple', label: 'Purple',     hex: '#8A2BE2' },
] as const;

/** POC scope: 3 of the Gandalf pack's 30 male hair styles (see sprites.ts HAIR). */
export const HAIR_STYLES = [
  { id: 'buzzed',  label: 'Buzzed' },
  { id: 'tousled', label: 'Tousled' },
  { id: 'long',    label: 'Long' },
] as const;

function darken(hex: string, amt: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (n >> 16) - amt);
  const g = Math.max(0, ((n >> 8) & 0xff) - amt);
  const b = Math.max(0, (n & 0xff) - amt);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function lighten(hex: string, amt: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (n >> 16) + amt);
  const g = Math.min(255, ((n >> 8) & 0xff) + amt);
  const b = Math.min(255, (n & 0xff) + amt);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** Highlight/base/shadow triad from one hex — this 3-band shading is what makes flat pixel art read as having volume. */
function shadeSet<P extends string>(base: string, prefix: P): Record<`${P}` | `${P}Shadow` | `${P}Highlight`, string> {
  return {
    [prefix]: base,
    [`${prefix}Shadow`]: darken(base, 35),
    [`${prefix}Highlight`]: lighten(base, 45),
  } as Record<`${P}` | `${P}Shadow` | `${P}Highlight`, string>;
}

/** Neutral colors baked into the placeholder art before any swap is applied. */
export const DEFAULT_PALETTE: Record<Role, string> = {
  ...shadeSet('#D4956A', 'skin'),
  ...shadeSet('#6F4E37', 'hair'),
  ...shadeSet('#6B4A2A', 'base'),
  accent: '#D8C870',
  metal: '#B8B8C8', metalDark: '#7A7A88', metalHighlight: '#F0F0F8',
  wood: '#7A5028',
  boot: '#3A2010',
  eye: '#241608',
  shaved: '#241608',
};

export function hairPalette(hairColorId: string): Palette {
  const hex = HAIR_COLORS.find(h => h.id === hairColorId)?.hex ?? DEFAULT_PALETTE.hair;
  return shadeSet(hex, 'hair');
}

/** Later overrides win — used to layer hair color, then an item's own overrides (none currently), on top of the neutral defaults. */
export function resolvePalette(...layers: Palette[]): Record<Role, string> {
  return Object.assign({}, DEFAULT_PALETTE, ...layers);
}
