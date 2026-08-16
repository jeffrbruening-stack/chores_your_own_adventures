/**
 * grid.ts — the fixed pixel grid every avatar layer is painted on.
 *
 * All sprites (body, hair, equipment) share this exact logical grid so the
 * compositor can stack them with zero per-layer alignment logic. GRID*SCALE
 * gives the final 256×256 canvas; SCALE is purely a display multiplier
 * (image-rendering: pixelated keeps the blocky look at any size).
 */

export const GRID = 64;
export const SCALE = 4;
export const CANVAS_PX = GRID * SCALE; // 256

/** One row per string, GRID chars wide. '.' = transparent. */
export type SpriteGrid = string[];

type MutableGrid = string[][];

export function blank(): MutableGrid {
  return Array.from({ length: GRID }, () => Array<string>(GRID).fill('.'));
}

export function rect(g: MutableGrid, x: number, y: number, w: number, h: number, ch: string) {
  for (let row = Math.max(0, y); row < Math.min(GRID, y + h); row++) {
    for (let col = Math.max(0, x); col < Math.min(GRID, x + w); col++) {
      g[row][col] = ch;
    }
  }
}

export function dot(g: MutableGrid, x: number, y: number, ch: string) {
  if (y >= 0 && y < GRID && x >= 0 && x < GRID) g[y][x] = ch;
}

/** Paints one row per [y, x, width] triple — the fast way to build a tapered silhouette (heads, torsos, limbs) out of rects. */
export function taper(g: MutableGrid, rows: [number, number, number][], ch: string) {
  for (const [y, x, w] of rows) rect(g, x, y, w, 1, ch);
}

export function freeze(g: MutableGrid): SpriteGrid {
  return g.map(row => row.join(''));
}
