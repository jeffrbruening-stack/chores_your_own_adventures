/**
 * AvatarCanvas — draws the composed layer stack onto a <canvas>.
 *
 * Handles both sprite kinds so swapping a placeholder ('grid') for real
 * generated art ('png') never touches compositor.ts or any item data: only
 * the registry entry in sprites.ts changes.
 */
import { useEffect, useRef } from 'react';
import { CANVAS_PX, GRID, SCALE } from '@/lib/avatar-poc/grid';
import { composeLayers, type Appearance, type Equipped } from '@/lib/avatar-poc/compositor';
import type { Role } from '@/lib/avatar-poc/palette';
import type { Sprite } from '@/lib/avatar-poc/sprites';

const imageCache = new Map<string, HTMLImageElement>();

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [
    Math.round(hue2rgb(h + 1 / 3) * 255),
    Math.round(hue2rgb(h) * 255),
    Math.round(hue2rgb(h - 1 / 3) * 255),
  ];
}

function drawGridLayer(ctx: CanvasRenderingContext2D, sprite: Extract<Sprite, { kind: 'grid' }>, palette: Record<Role, string>) {
  for (let y = 0; y < GRID; y++) {
    const row = sprite.grid[y];
    for (let x = 0; x < GRID; x++) {
      const role = sprite.legend[row[x]];
      if (!role) continue;
      ctx.fillStyle = palette[role];
      ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
    }
  }
}

const assetUrl = (rel: string) => `${import.meta.env.BASE_URL}${rel}`;

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

const lightnessRangeCache = new Map<string, { minL: number; maxL: number }>();

/** The actual min/max lightness among a source image's pixels matching `classify` — the "before" range a target Shadow→Highlight span gets remapped onto. Computed once per (image, role) and cached. */
function sourceLightnessRange(
  url: string,
  role: Role,
  data: Uint8ClampedArray,
  classify: (r: number, g: number, b: number) => boolean,
): { minL: number; maxL: number } {
  const key = `${url}::${role}`;
  const cached = lightnessRangeCache.get(key);
  if (cached) return cached;
  let minL = 1, maxL = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (!classify(r, g, b)) continue;
    const [, , l] = rgbToHsl(r, g, b);
    if (l < minL) minL = l;
    if (l > maxL) maxL = l;
  }
  const result = minL <= maxL ? { minL, maxL } : { minL: 0, maxL: 1 };
  lightnessRangeCache.set(key, result);
  return result;
}

/**
 * Every Gandalf layer shares the same source cell size, so scaling each one
 * by the same letterbox transform keeps them aligned — the pack's own
 * alignment guarantee carries through untouched. `sheet`-less sprites (a
 * possible future single-image asset) just fill the whole canvas.
 */
function destRectFor(sprite: Extract<Sprite, { kind: 'png' }>, sw: number, sh: number) {
  if (!sprite.sheet) return { dx: 0, dy: 0, dw: CANVAS_PX, dh: CANVAS_PX };
  const scale = Math.min(CANVAS_PX / sw, CANVAS_PX / sh);
  const dw = sw * scale, dh = sh * scale;
  return { dx: (CANVAS_PX - dw) / 2, dy: (CANVAS_PX - dh) / 2, dw, dh };
}

/**
 * Recolors a real PNG by hue/saturation-shifting every pixel a rule
 * `classify`s toward the resolved palette color for its `role`, preserving
 * each pixel's original lightness. Exact-color matching (the 'grid' swap
 * technique) doesn't work here — real art has hundreds of anti-aliased
 * shades per material, not a handful of flat tones.
 */
function drawPngLayer(
  ctx: CanvasRenderingContext2D,
  sprite: Extract<Sprite, { kind: 'png' }>,
  palette: Record<Role, string>,
  onReady: () => void,
) {
  const url = assetUrl(sprite.src);
  let img = imageCache.get(url);
  if (!img) {
    img = new Image();
    img.src = url;
    imageCache.set(url, img);
  }
  if (!img.complete || img.naturalWidth === 0) {
    img.onload = onReady;
    return;
  }

  const sw = sprite.sheet?.cellW ?? img.naturalWidth;
  const sh = sprite.sheet?.cellH ?? img.naturalHeight;
  const { dx, dy, dw, dh } = destRectFor(sprite, sw, sh);

  if (!sprite.recolor || sprite.recolor.length === 0) {
    ctx.drawImage(img, 0, 0, sw, sh, dx, dy, dw, dh);
    return;
  }

  // Crop to the idle cell at native resolution before recoloring — cheaper
  // than recoloring at canvas scale, and keeps the sampled lightness range
  // free of any other frames elsewhere in the sheet.
  const off = document.createElement('canvas');
  off.width = sw;
  off.height = sh;
  const octx = off.getContext('2d');
  if (!octx) return;
  octx.drawImage(img, 0, 0, sw, sh, 0, 0, sw, sh);
  const imgData = octx.getImageData(0, 0, sw, sh);
  const data = imgData.data;

  const rules = sprite.recolor.map(rule => {
    // Target hue/saturation from the role's mid tone; target lightness
    // range from its paired Shadow/Highlight roles (falls back to the mid
    // tone's own lightness if a paired role isn't in the palette) — that's
    // what lets a "Deep" skin tone actually read as darker, not just
    // differently-hued at the same brightness.
    const [tr, tg, tb] = hexToRgb(palette[rule.role]);
    const [targetH, targetS, targetL] = rgbToHsl(tr, tg, tb);
    const shadowHex = palette[`${rule.role}Shadow` as Role];
    const highlightHex = palette[`${rule.role}Highlight` as Role];
    const targetMinL = shadowHex ? rgbToHsl(...hexToRgb(shadowHex))[2] : targetL;
    const targetMaxL = highlightHex ? rgbToHsl(...hexToRgb(highlightHex))[2] : targetL;
    const sourceRange = sourceLightnessRange(url, rule.role, data, rule.classify);
    return { classify: rule.classify, targetH, targetS, targetMinL, targetMaxL, sourceRange };
  });

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue; // transparent, skip
    const r = data[i], g = data[i + 1], b = data[i + 2];
    for (const rule of rules) {
      if (!rule.classify(r, g, b)) continue;
      const [, , l] = rgbToHsl(r, g, b);
      const { minL, maxL } = rule.sourceRange;
      const t = maxL > minL ? clamp01((l - minL) / (maxL - minL)) : 0.5;
      const newL = rule.targetMinL + t * (rule.targetMaxL - rule.targetMinL);
      const [nr, ng, nb] = hslToRgb(rule.targetH, rule.targetS, newL);
      data[i] = nr; data[i + 1] = ng; data[i + 2] = nb;
      break;
    }
  }
  octx.putImageData(imgData, 0, 0);
  ctx.drawImage(off, 0, 0, sw, sh, dx, dy, dw, dh);
}

interface AvatarCanvasProps {
  appearance: Appearance;
  equipped: Equipped;
  /** Display size in px; canvas is always rendered at native 256×256 and scaled via CSS. */
  size?: number;
  className?: string;
  'data-testid'?: string;
}

export function AvatarCanvas({ appearance, equipped, size = CANVAS_PX, className, ...rest }: AvatarCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const appearanceKey = JSON.stringify(appearance);
  const equippedKey = JSON.stringify(equipped);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, CANVAS_PX, CANVAS_PX);
      for (const { sprite, palette } of composeLayers(appearance, equipped)) {
        if (sprite.kind === 'grid') drawGridLayer(ctx, sprite, palette);
        else drawPngLayer(ctx, sprite, palette, draw);
      }
    };
    draw();
    // appearance/equipped are re-derived from their JSON keys, not from identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appearanceKey, equippedKey]);

  return (
    <canvas
      ref={ref}
      width={CANVAS_PX}
      height={CANVAS_PX}
      className={className}
      style={{ width: size, height: size, imageRendering: 'pixelated' }}
      data-testid={rest['data-testid'] ?? 'avatar-poc-canvas'}
    />
  );
}
