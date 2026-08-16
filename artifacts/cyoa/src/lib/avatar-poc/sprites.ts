/**
 * sprites.ts — the sprite registries, built on the existing Gandalf paperdoll
 * pack (public/paperdoll/gandalf/, already used by sprite-doll.tsx). Every
 * file is a multi-frame animation sheet on an 80×64 cell grid; we only ever
 * draw the idle frame at cell (0,0) — this POC is forward-facing only, no
 * directional/animated sprites.
 *
 * Two sprite kinds:
 *  - 'grid': a hand-authored 64×64 char grid + a legend mapping each char to
 *    a palette Role. Not used by anything currently registered below, but
 *    kept as an escape hatch for quick placeholder work.
 *  - 'png': a real image. `sheet` says "crop to this cell size, letterboxed
 *    to fit the shared canvas" — every Gandalf layer uses it so they all
 *    scale identically and stay aligned. `recolor` hue/saturation-shifts
 *    matching pixels toward a resolved palette color while preserving their
 *    original lightness, so shading survives the swap; skin tone doesn't
 *    need this (it's a different source file per tone), but hair color does
 *    (the pack ships hair in one fixed color per file).
 */
import { blank, freeze, type SpriteGrid } from './grid';
import type { Role } from './palette';

export interface RecolorRule {
  role: Role;
  classify: (r: number, g: number, b: number) => boolean;
}

export interface SpriteSheet {
  cellW: number;
  cellH: number;
}

export type Sprite =
  | { kind: 'grid'; grid: SpriteGrid; legend: Record<string, Role> }
  | { kind: 'png'; src: string; sheet?: SpriteSheet; recolor?: RecolorRule[] };

const GANDALF_CELL: SpriteSheet = { cellW: 80, cellH: 64 };
const gandalfUrl = (rel: string) => `paperdoll/gandalf/${rel}`;

/** A Gandalf sheet layer with no recolor — most equipment (each color/tier is its own pre-made file). */
function sheet(rel: string): Sprite {
  return { kind: 'png', src: gandalfUrl(rel), sheet: GANDALF_CELL };
}

/** A Gandalf sheet layer that's entirely one recolorable material (hair) — every opaque pixel belongs to `role`. */
function recolorableSheet(rel: string, role: Role): Sprite {
  return { kind: 'png', src: gandalfUrl(rel), sheet: GANDALF_CELL, recolor: [{ role, classify: () => true }] };
}

// ─── BASE BODY (bare skin; always drawn on the "body" layer) ─────────────────
// Skin tone is a different source file per tone (the pack ships 5 pre-drawn
// skins), not a runtime recolor — so this is a lookup, not a constant.
const SKIN_FILE: Record<string, string> = {
  'skin-1': 'skins/male-skin-1.png',
  'skin-2': 'skins/male-skin-2.png',
  'skin-3': 'skins/male-skin-3.png',
  'skin-4': 'skins/male-skin-4.png',
  'skin-5': 'skins/male-skin-5.png',
};

/** App skin-tone ids (create-character.tsx) → the pack's 5 skin files. Two of our 6 tones collapse onto skin-5 — same mapping sprite-doll.tsx already uses for the live app. */
const APP_SKIN_TO_GANDALF: Record<string, string> = {
  light: 'skin-1', 'light-medium': 'skin-2', medium: 'skin-3',
  tan: 'skin-4', dark: 'skin-5', 'very-dark': 'skin-5',
};

export function bodySpriteFor(skinToneId: string): Sprite {
  const gandalfSkin = APP_SKIN_TO_GANDALF[skinToneId] ?? 'skin-3';
  return sheet(SKIN_FILE[gandalfSkin]);
}

// ─── HAIR (POC scope: 3 of the pack's 30 male styles) ─────────────────────────
export const HAIR: Record<string, Sprite> = {
  buzzed: recolorableSheet('hair/male/male-hair-1.png', 'hair'),
  tousled: recolorableSheet('hair/male/male-hair-12.png', 'hair'),
  long: recolorableSheet('hair/male/male-hair-25.png', 'hair'),
};

// ─── EQUIPMENT SPRITES ─────────────────────────────────────────────────────
// Each is a real pre-made file from the pack — "variants" are different
// files (e.g. wooden/iron/golden sword), not a runtime palette swap, since
// that's how this pack actually ships its color/tier variety.
export const EQUIPMENT_SPRITES: Record<string, Sprite> = {
  'cap-green': sheet('hats/male/male-green-cap.png'),
  'helmet-guard': sheet('hats/male/guard-helmet.png'),
  'helmet-viking': sheet('hats/male/viking-helmet-with-horns.png'),

  shirt: sheet('clothing/male/shirt.png'),
  chainmail: sheet('clothing/male/chainmail.png'),

  pants: sheet('clothing/male/pants.png'),
  'pants-green': sheet('clothing/male/green-pants.png'),

  'backpack-small': sheet('back/small-backpack.png'),
  'cape-green': sheet('back/cape-green.png'),

  'sword-wood': sheet('hand-items/male/wooden-sword.png'),
  'sword-iron': sheet('hand-items/male/iron-sword.png'),
  'sword-gold': sheet('hand-items/male/golden-sword.png'),
};

// ─── Escape-hatch grid builder (unused by default registries above) ──────────
export function grid(build: (g: string[][]) => void, legend: Record<string, Role>): Sprite {
  const g = blank();
  build(g);
  return { kind: 'grid', grid: freeze(g), legend };
}
