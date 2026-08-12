/**
 * pixel-character.tsx
 * 16-bit chibi RPG character renderer — 32×48 SVG canvas.
 * Displayed crisp via image-rendering: pixelated at chosen size.
 */
import React from 'react';
import wizardAiSprite from '../assets/sprites/wizard-ai-benchmark-trimmed.png';

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface CharacterAppearance {
  skinTone?: string;
  hairStyle?: string;
  hairColor?: string;
  eyeColor?: string;
  hasGlasses?: boolean;
  facialHair?: string;
  species?: string;
  gender?: string;
  class?: string;
  expression?: string;
}

export interface EquippedItems {
  outfit?:        { name: string; emoji?: string } | null;
  head?:          { name: string; emoji?: string } | null;
  main_hand?:     { name: string; emoji?: string } | null;
  off_hand?:      { name: string; emoji?: string } | null;
  pet?:           { name: string; emoji?: string } | null;
  background?:    { name: string; emoji?: string } | null;
  effect?:        { name: string; emoji?: string } | null;
  pet_accessory?: { name: string; emoji?: string } | null;
}

interface PixelCharacterProps {
  appearance?: CharacterAppearance;
  equipped?: EquippedItems;
  /** Display width in px; height = size × 1.5. Default 192. */
  size?: number;
}

// ─── EXPORTED CONSTANTS ───────────────────────────────────────────────────────

export const SKIN_TONES = [
  // Realistic range
  { id: 'light',          label: 'Porcelain',     color: '#FDDBB4' },
  { id: 'light-medium',   label: 'Warm Light',    color: '#F0C49A' },
  { id: 'medium',         label: 'Golden',        color: '#D4956A' },
  { id: 'tan',            label: 'Honey',         color: '#C07840' },
  { id: 'dark',           label: 'Deep',          color: '#8A4820' },
  { id: 'very-dark',      label: 'Ebony',         color: '#4A2010' },
  // Fantasy
  { id: 'fantasy-red',    label: 'Crimson',       color: '#BB3030' },
  { id: 'fantasy-blue',   label: 'Azure',         color: '#3060BB' },
  { id: 'fantasy-green',  label: 'Jade',          color: '#30A040' },
  { id: 'fantasy-pink',   label: 'Rose',          color: '#CC5090' },
  { id: 'fantasy-purple', label: 'Violet',        color: '#7030B0' },
  { id: 'fantasy-gray',   label: 'Stone',         color: '#8090A0' },
  { id: 'fantasy-teal',   label: 'Teal',          color: '#209090' },
];

export const HAIR_COLORS = [
  { id: 'black',              label: 'Black',         color: '#1A1008' },
  { id: 'dark-brown',         label: 'Espresso',      color: '#3D1F0A' },
  { id: 'brown',              label: 'Chestnut',      color: '#6B3820' },
  { id: 'auburn',             label: 'Auburn',        color: '#8B3020' },
  { id: 'blonde',             label: 'Blonde',        color: '#C8A040' },
  { id: 'red',                label: 'Copper',        color: '#9A2010' },
  { id: 'gray',               label: 'Silver',        color: '#909090' },
  { id: 'white',              label: 'White',         color: '#E0E0E8' },
  { id: 'fantasy-blue',       label: 'Ocean',         color: '#1848BB' },
  { id: 'fantasy-green',      label: 'Forest',        color: '#208040' },
  { id: 'fantasy-pink',       label: 'Cotton Candy',  color: '#D040A0' },
  { id: 'fantasy-purple',     label: 'Amethyst',      color: '#7030BB' },
  { id: 'fantasy-bright-red', label: 'Fiery',         color: '#CC1010' },
  { id: 'fantasy-cyan',       label: 'Frost',         color: '#10B0C0' },
];

export const EYE_COLORS = [
  { id: 'brown',   label: 'Brown',   color: '#6B3820' },
  { id: 'hazel',   label: 'Hazel',   color: '#8B6030' },
  { id: 'green',   label: 'Green',   color: '#307040' },
  { id: 'blue',    label: 'Blue',    color: '#2050A8' },
  { id: 'gray',    label: 'Gray',    color: '#6080A0' },
  { id: 'black',   label: 'Black',   color: '#101010' },
  { id: 'amber',   label: 'Amber',   color: '#B06010' },
  { id: 'violet',  label: 'Violet',  color: '#7030B0' },
];

export const HAIR_STYLES = [
  { id: 'bald',      label: 'Bald'      },
  { id: 'short',     label: 'Short'     },
  { id: 'medium',    label: 'Medium'    },
  { id: 'long',      label: 'Long'      },
  { id: 'curly',     label: 'Curly'     },
  { id: 'ponytail',  label: 'Ponytail'  },
  { id: 'mohawk',    label: 'Mohawk'    },
];

export const SPECIES_LIST = [
  { id: 'human',    label: 'Human'    },
  { id: 'elf',      label: 'Elf'      },
  { id: 'dwarf',    label: 'Dwarf'    },
  { id: 'gnome',    label: 'Gnome'    },
  { id: 'halfling', label: 'Halfling' },
  { id: 'orc',      label: 'Orc'      },
  { id: 'goblin',   label: 'Goblin'   },
];

export const CLASSES_LIST = [
  { id: 'fighter',   label: 'Fighter',   icon: '⚔️' },
  { id: 'ranger',    label: 'Ranger',    icon: '🏹' },
  { id: 'wizard',    label: 'Wizard',    icon: '🪄' },
  { id: 'rogue',     label: 'Rogue',     icon: '🗡️' },
  { id: 'cleric',    label: 'Cleric',    icon: '✨' },
  { id: 'barbarian', label: 'Barbarian', icon: '🪓' },
];

export const FACIAL_HAIR_OPTIONS = [
  { id: 'none',     label: 'None'        },
  { id: 'mustache', label: 'Mustache'    },
  { id: 'beard',    label: 'Full Beard'  },
];

// ─── COLOR RESOLUTION ─────────────────────────────────────────────────────────

function sk(id?: string): string {
  return SKIN_TONES.find(t => t.id === id)?.color ?? '#D4956A';
}

function skDark(skinId?: string): string {
  const map: Record<string, string> = {
    '#FDDBB4': '#C8A070', '#F0C49A': '#B87840',
    '#D4956A': '#A06030', '#C07840': '#885020',
    '#8A4820': '#602808', '#4A2010': '#280800',
    '#BB3030': '#8B1010', '#3060BB': '#10408B',
    '#30A040': '#108020', '#CC5090': '#8C1060',
    '#7030B0': '#400080', '#8090A0': '#506070',
    '#209090': '#006060',
  };
  const c = sk(skinId);
  return map[c] ?? '#805028';
}

function hc(id?: string): string {
  return HAIR_COLORS.find(h => h.id === id)?.color ?? '#6B3820';
}

function ec(id?: string): string {
  return EYE_COLORS.find(e => e.id === id)?.color ?? '#2050A8';
}

// ─── SVG RECT HELPER ──────────────────────────────────────────────────────────

type El = React.ReactElement;
let _k = 0;
function R(x: number, y: number, w: number, h: number, fill: string, opacity?: number): El {
  return (
    <rect
      key={_k++}
      x={x} y={y} width={w} height={h}
      fill={fill}
      {...(opacity !== undefined ? { opacity } : {})}
    />
  );
}

// ─── BODY TEMPLATE ────────────────────────────────────────────────────────────

interface Body {
  // Head bounding box
  hx: number; hy: number; hw: number; hh: number;
  // Face anchors (absolute canvas coords)
  eyeY: number; eyeLX: number; eyeRX: number;
  noseX: number; noseY: number;
  mouthX: number; mouthY: number; mouthW: number;
  // Neck
  nx: number; ny: number; nw: number; nh: number;
  // Torso
  tx: number; ty: number; tw: number; th: number;
  // Arms (L = player-left, R = player-right; displayed mirrored)
  lax: number; lay: number; law: number; lah: number;
  rax: number; ray: number; raw: number; rah: number;
  // Legs
  llx: number; lly: number; llw: number; llh: number;
  rlx: number; rly: number; rlw: number; rlh: number;
  // Feet
  lfx: number; lfy: number; lfw: number; lfh: number;
  rfx: number; rfy: number; rfw: number; rfh: number;
}

const BODIES: Record<string, Body> = {
  // ─ Human: balanced, 43u tall ──────────────────────────────────
  human: {
    hx:10, hy:2, hw:12, hh:12,
    eyeY:7, eyeLX:11, eyeRX:18, noseX:15, noseY:11, mouthX:12, mouthY:13, mouthW:8,
    nx:14, ny:14, nw:4, nh:2,
    tx:8, ty:16, tw:16, th:11,
    lax:5, lay:16, law:3, lah:11, rax:24, ray:16, raw:3, rah:11,
    llx:8, lly:27, llw:7, llh:14, rlx:17, rly:27, rlw:7, rlh:14,
    lfx:7, lfy:41, lfw:8, lfh:3, rfx:17, rfy:41, rfw:8, rfh:3,
  },
  // ─ Elf: taller+slimmer, 45u tall, pointed integrated ears ────
  elf: {
    hx:11, hy:1, hw:10, hh:12,
    eyeY:6, eyeLX:12, eyeRX:18, noseX:15, noseY:10, mouthX:12, mouthY:12, mouthW:7,
    nx:14, ny:13, nw:4, nh:2,
    tx:9, ty:15, tw:14, th:13,
    lax:6, lay:15, law:3, lah:13, rax:23, ray:15, raw:3, rah:13,
    llx:9, lly:28, llw:6, llh:16, rlx:17, rly:28, rlw:6, rlh:16,
    lfx:8, lfy:44, lfw:7, lfh:2, rfx:17, rfy:44, rfw:7, rfh:2,
  },
  // ─ Dwarf: much shorter+wider, 34u tall ───────────────────────
  dwarf: {
    hx:9, hy:7, hw:14, hh:12,
    eyeY:12, eyeLX:11, eyeRX:19, noseX:15, noseY:16, mouthX:12, mouthY:18, mouthW:8,
    nx:13, ny:19, nw:6, nh:1,
    tx:6, ty:20, tw:20, th:10,
    lax:3, lay:20, law:3, lah:10, rax:26, ray:20, raw:3, rah:10,
    llx:7, lly:30, llw:8, llh:8, rlx:17, rly:30, rlw:8, rlh:8,
    lfx:6, lfy:38, lfw:9, lfh:3, rfx:17, rfy:38, rfw:9, rfh:3,
  },
  // ─ Gnome: smallest, 30u tall, large head ─────────────────────
  gnome: {
    hx:8, hy:11, hw:16, hh:13,
    eyeY:16, eyeLX:10, eyeRX:19, noseX:15, noseY:20, mouthX:11, mouthY:22, mouthW:9,
    nx:14, ny:24, nw:4, nh:1,
    tx:10, ty:25, tw:12, th:8,
    lax:7, lay:25, law:3, lah:8, rax:22, ray:25, raw:3, rah:8,
    llx:11, lly:33, llw:4, llh:6, rlx:17, rly:33, rlw:4, rlh:6,
    lfx:10, lfy:39, lfw:5, lfh:2, rfx:17, rfy:39, rfw:5, rfh:2,
  },
  // ─ Halfling: medium-short, 37u tall ──────────────────────────
  halfling: {
    hx:10, hy:5, hw:12, hh:11,
    eyeY:10, eyeLX:11, eyeRX:18, noseX:15, noseY:13, mouthX:12, mouthY:15, mouthW:7,
    nx:14, ny:16, nw:4, nh:2,
    tx:8, ty:18, tw:16, th:10,
    lax:5, lay:18, law:3, lah:10, rax:24, ray:18, raw:3, rah:10,
    llx:9, lly:28, llw:6, llh:10, rlx:17, rly:28, rlw:6, rlh:10,
    lfx:8, lfy:38, lfw:7, lfh:3, rfx:17, rfy:38, rfw:7, rfh:3,
  },
  // ─ Orc: broad+powerful, 43u tall, wide body ──────────────────
  orc: {
    hx:7, hy:2, hw:18, hh:12,
    eyeY:7, eyeLX:9, eyeRX:20, noseX:15, noseY:11, mouthX:10, mouthY:13, mouthW:12,
    nx:12, ny:14, nw:8, nh:2,
    tx:4, ty:16, tw:24, th:12,
    lax:1, lay:16, law:4, lah:12, rax:27, ray:16, raw:4, rah:12,
    llx:5, lly:28, llw:9, llh:13, rlx:18, rly:28, rlw:9, rlh:13,
    lfx:4, lfy:41, lfw:10, lfh:3, rfx:18, rfy:41, rfw:10, rfh:3,
  },
  // ─ Goblin: small+scrappy, 30u tall, giant ears ───────────────
  goblin: {
    hx:9, hy:9, hw:14, hh:11,
    eyeY:13, eyeLX:11, eyeRX:19, noseX:15, noseY:16, mouthX:11, mouthY:18, mouthW:9,
    nx:14, ny:20, nw:4, nh:1,
    tx:11, ty:21, tw:10, th:8,
    lax:8, lay:21, law:3, lah:8, rax:21, ray:21, raw:3, rah:8,
    llx:12, lly:29, llw:4, llh:7, rlx:16, rly:29, rlw:4, rlh:7,
    lfx:11, lfy:36, lfw:5, lfh:2, rfx:16, rfy:36, rfw:5, rfh:2,
  },
};

// ─── SPECIES FEATURES (ears, tusks, brow ridges) ─────────────────────────────

function renderSpeciesFeatures(species: string, skinCol: string, sdark: string, b: Body): El[] {
  const out: El[] = [];
  if (species === 'elf') {
    // Classic fantasy pointed ears — flush to head, taper upward-outward (no gap, no rectangles)
    const ey = b.hy + 4; // mid-head vertical position
    // LEFT ear: base overlaps head edge for flush attachment, narrows to 1px tip
    out.push(R(b.hx - 1, ey,     2, 2, skinCol)); // base (2px wide, 1px overlaps head)
    out.push(R(b.hx - 2, ey - 1, 2, 1, skinCol)); // angles up-outward
    out.push(R(b.hx - 3, ey - 2, 1, 1, skinCol)); // pointed tip
    out.push(R(b.hx - 1, ey,     1, 1, sdark));   // inner ear shadow for depth
    // RIGHT ear (mirrored)
    const rbase = b.hx + b.hw - 1;
    out.push(R(rbase,     ey,     2, 2, skinCol));
    out.push(R(rbase + 1, ey - 1, 2, 1, skinCol));
    out.push(R(rbase + 3, ey - 2, 1, 1, skinCol));
    out.push(R(rbase + 1, ey,     1, 1, sdark));
  }
  if (species === 'orc') {
    // Heavy brow ridge — wider brow for a more brutish look
    out.push(R(b.hx + 1, b.hy + 1, b.hw - 2, 2, sdark));
    // Lower-canine tusks — small 1×2px protrusions at corners of mouth, inside head bounds.
    // They read as lower teeth/fangs peeking up, not dangling stalactites.
    const tuskL = b.mouthX + 1;
    const tuskR = b.mouthX + b.mouthW - 2;
    const tuskY = b.mouthY - 1; // one row above mouth line = visible as lower canines
    out.push(R(tuskL, tuskY, 1, 2, '#FFFAEC')); // left tusk
    out.push(R(tuskR, tuskY, 1, 2, '#FFFAEC')); // right tusk
  }
  if (species === 'goblin') {
    // Large bat-like ears
    const ey = b.hy + 1;
    // Left ear
    out.push(R(b.hx - 5, ey, 5, 5, skinCol));
    out.push(R(b.hx - 4, ey + 5, 4, 3, skinCol));
    out.push(R(b.hx - 3, ey + 8, 2, 2, skinCol));
    out.push(R(b.hx - 2, ey + 10, 1, 1, skinCol));
    out.push(R(b.hx - 3, ey + 1, 1, 5, sdark));
    // Right ear
    out.push(R(b.hx + b.hw, ey, 5, 5, skinCol));
    out.push(R(b.hx + b.hw, ey + 5, 4, 3, skinCol));
    out.push(R(b.hx + b.hw + 1, ey + 8, 2, 2, skinCol));
    out.push(R(b.hx + b.hw + 1, ey + 10, 1, 1, skinCol));
    out.push(R(b.hx + b.hw + 3, ey + 1, 1, 5, sdark));
    // (pointy chin removed — head shape now handled by chin taper in renderBody)
  }
  return out;
}

// ─── BODY RENDERER ────────────────────────────────────────────────────────────

function renderBody(
  b: Body, skinCol: string, sdark: string,
  outfitColor: string, legColor: string,
  gender: string, classId: string = 'fighter',
): El[] {
  const out: El[] = [];
  const isWizard = classId === 'wizard';

  // Feet / shoes
  out.push(R(b.lfx, b.lfy, b.lfw, b.lfh, '#3A2010'));
  out.push(R(b.rfx, b.rfy, b.rfw, b.rfh, '#3A2010'));
  // Shoe highlight
  out.push(R(b.lfx + 1, b.lfy, b.lfw - 2, 1, '#5A3018'));
  out.push(R(b.rfx + 1, b.rfy, b.rfw - 2, 1, '#5A3018'));

  // ── Lower body ──────────────────────────────────────────────
  if (isWizard) {
    // Full-length bell robe skirt — covers both legs, flares at hem
    const sTopY = b.lly;
    const sBottomY = b.lfy;
    const sH = sBottomY - sTopY;
    const sX = b.llx - 1;
    const sW = (b.rlx + b.rlw) - b.llx + 2;
    // Upper half: straight, torso-width
    out.push(R(sX, sTopY, sW, Math.floor(sH * 0.5), outfitColor));
    // Lower bell flare: 2px wider per side
    out.push(R(sX - 2, sTopY + Math.floor(sH * 0.5), sW + 4, Math.ceil(sH * 0.5), outfitColor));
    // Centre fold line (shadow strip)
    const foldX = b.tx + Math.floor(b.tw / 2);
    out.push(R(foldX, sTopY + 2, 1, sH - 2, shadeColor(outfitColor, -18)));
    // Hem arcane sparkle dots
    const hemY = sTopY + Math.floor(sH * 0.68);
    const sparkle = '#D0B0FF';
    out.push(R(sX + 1,                   hemY,     1, 1, sparkle));
    out.push(R(sX + Math.floor(sW * 0.3), hemY + 2, 1, 1, sparkle));
    out.push(R(foldX,                     hemY,     1, 1, sparkle));
    out.push(R(sX + Math.floor(sW * 0.7), hemY + 2, 1, 1, sparkle));
    out.push(R(sX + sW - 2,              hemY,     1, 1, sparkle));
  } else if (gender === 'feminine') {
    // Skirt/tunic: one wider unified shape covering upper legs with a flared hem
    const skirtY = b.lly;
    const skirtH = Math.floor(b.llh * 0.48);
    const skirtX = b.llx - 2;
    const skirtW = (b.rlx + b.rlw) - b.llx + 4;
    out.push(R(skirtX,     skirtY,              skirtW,     skirtH,     outfitColor));
    out.push(R(skirtX - 1, skirtY + skirtH - 3, skirtW + 2, 3,          outfitColor)); // flared hem
    // Legs peeking below skirt
    const belowY = skirtY + skirtH;
    const belowH = b.llh - skirtH;
    out.push(R(b.llx + 1, belowY, b.llw - 2, belowH, legColor));
    out.push(R(b.rlx + 1, belowY, b.rlw - 2, belowH, legColor));
  } else {
    // Masculine / Any: normal trousers
    out.push(R(b.llx, b.lly, b.llw, b.llh, legColor));
    out.push(R(b.rlx, b.rly, b.rlw, b.rlh, legColor));
    out.push(R(b.llx, b.lly, 1, b.llh, '#00000022')); // inner shadow
    out.push(R(b.rlx, b.rly, 1, b.rlh, '#00000022'));
    // Knee detail
    out.push(R(b.llx + 1, b.lly + Math.floor(b.llh * 0.45), b.llw - 2, 2, shadeColor(legColor, 15)));
    out.push(R(b.rlx + 1, b.rly + Math.floor(b.rlh * 0.45), b.rlw - 2, 2, shadeColor(legColor, 15)));
  }

  // ── Arms ────────────────────────────────────────────────────
  if (isWizard) {
    // Full-length robe sleeves — no bare skin, bell cuffs at wrist
    out.push(R(b.lax, b.lay, b.law, b.lah, outfitColor));
    out.push(R(b.rax, b.ray, b.raw, b.rah, outfitColor));
    // Bell cuffs (2px darker, 1px wider each side)
    out.push(R(b.lax - 1, b.lay + b.lah - 3, b.law + 2, 3, shadeColor(outfitColor, -22)));
    out.push(R(b.rax - 1, b.ray + b.rah - 3, b.raw + 2, 3, shadeColor(outfitColor, -22)));
    // Shoulder broadening
    out.push(R(b.lax - 1, b.lay, 1, 3, outfitColor));
    out.push(R(b.rax + b.raw, b.ray, 1, 3, outfitColor));
  } else {
    // Normal arms (bare lower, sleeved upper)
    out.push(R(b.lax, b.lay, b.law, b.lah, skinCol));
    out.push(R(b.rax, b.ray, b.raw, b.rah, skinCol));
    // Sleeve (outfit color on upper half)
    const sleeveH = Math.floor(b.lah * 0.55);
    out.push(R(b.lax, b.lay, b.law, sleeveH, outfitColor));
    out.push(R(b.rax, b.ray, b.raw, sleeveH, outfitColor));
    // Masculine: slight shoulder cap broadening
    if (gender === 'masculine') {
      out.push(R(b.lax - 1, b.lay, 1, 3, outfitColor));
      out.push(R(b.rax + b.raw, b.ray, 1, 3, outfitColor));
    }
  }

  // ── Torso ───────────────────────────────────────────────────
  const tw = gender === 'feminine' ? b.tw - 2 : gender === 'masculine' ? b.tw + 1 : b.tw;
  const tx = gender === 'feminine' ? b.tx + 1 : gender === 'masculine' ? b.tx - 1 : b.tx;
  out.push(R(tx, b.ty, tw, b.th, outfitColor));
  out.push(R(tx, b.ty, 1, b.th, '#00000020'));           // left edge shading
  out.push(R(tx + tw - 1, b.ty, 1, b.th, '#FFFFFF10')); // right edge highlight
  if (isWizard) {
    // Sash / cord at lower waist instead of belt
    const sashY = b.ty + Math.floor(b.th * 0.78);
    out.push(R(tx, sashY, tw, 2, shadeColor(outfitColor, -30)));
    // Sash knot in centre
    const knotX = tx + Math.floor(tw / 2) - 1;
    out.push(R(knotX, sashY - 1, 3, 4, shadeColor(outfitColor, -20)));
    out.push(R(knotX + 1, sashY - 1, 1, 1, shadeColor(outfitColor, 20))); // knot highlight
  } else {
    out.push(R(tx + 1, b.ty + b.th - 2, tw - 2, 2, shadeColor(outfitColor, -20))); // belt
    // Feminine waist taper hint
    if (gender === 'feminine') {
      out.push(R(tx, b.ty + Math.floor(b.th * 0.5), tw, 2, shadeColor(outfitColor, 12)));
    }
  }

  // Neck — rendered before head so the head covers its top row; neck flows cleanly into shirt below chin
  out.push(R(b.nx, b.ny - 1, b.nw, b.nh + 1, skinCol));

  // Head — clean flat rectangle drawn on top of neck; no chin taper or dangling pixels
  out.push(R(b.hx, b.hy, b.hw, b.hh, skinCol));
  // Head top highlight
  out.push(R(b.hx + 1, b.hy, b.hw - 2, 1, '#FFFFFF20'));

  return out;
}

function shadeColor(hex: string, pct: number): string {
  // Very lightweight lighten/darken — just return a semi-transparent overlay color.
  // For actual use we return the same color; the overlay rects handle shading.
  return pct > 0 ? lightenHex(hex, pct) : darkenHex(hex, -pct);
}

function lightenHex(hex: string, amt: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (n >> 16) + amt);
  const g = Math.min(255, ((n >> 8) & 0xff) + amt);
  const b = Math.min(255, (n & 0xff) + amt);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function darkenHex(hex: string, amt: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (n >> 16) - amt);
  const g = Math.max(0, ((n >> 8) & 0xff) - amt);
  const b = Math.max(0, (n & 0xff) - amt);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// ─── HAIR RENDERER ────────────────────────────────────────────────────────────

function renderHair(style: string, hairCol: string, b: Body, species: string): El[] {
  const out: El[] = [];
  if (style === 'bald') return out;

  const { hx, hy, hw } = b;

  switch (style) {
    case 'short':
      out.push(R(hx + 1, hy - 2, hw - 2, 3, hairCol)); // cap
      out.push(R(hx, hy, 2, 4, hairCol));               // L sideburn
      out.push(R(hx + hw - 2, hy, 2, 4, hairCol));      // R sideburn
      break;
    case 'medium':
      out.push(R(hx, hy - 3, hw, 4, hairCol));
      out.push(R(hx - 2, hy, 2, Math.floor(b.hh * 0.65), hairCol));
      out.push(R(hx + hw, hy, 2, Math.floor(b.hh * 0.65), hairCol));
      break;
    case 'long':
      out.push(R(hx, hy - 3, hw, 4, hairCol));
      out.push(R(hx - 2, hy, 2, b.hh + 6, hairCol));  // hangs below head
      out.push(R(hx + hw, hy, 2, b.hh + 6, hairCol));
      out.push(R(hx - 1, hy + b.hh + 4, 1, 4, hairCol)); // tapers
      out.push(R(hx + hw, hy + b.hh + 4, 1, 4, hairCol));
      break;
    case 'curly':
      // Bumpy crown
      out.push(R(hx + 2, hy - 5, 2, 3, hairCol));
      out.push(R(hx + 5, hy - 6, 3, 4, hairCol));
      out.push(R(hx + hw - 5, hy - 5, 3, 3, hairCol));
      out.push(R(hx, hy - 3, hw, 4, hairCol));
      out.push(R(hx - 2, hy, 2, Math.floor(b.hh * 0.5), hairCol));
      out.push(R(hx + hw, hy, 2, Math.floor(b.hh * 0.5), hairCol));
      // Side curls
      out.push(R(hx - 3, hy + 3, 2, 4, hairCol));
      out.push(R(hx + hw + 1, hy + 3, 2, 4, hairCol));
      break;
    case 'ponytail':
      out.push(R(hx, hy - 3, hw, 4, hairCol));
      out.push(R(hx, hy, 2, 3, hairCol));
      out.push(R(hx + hw - 2, hy, 2, 3, hairCol));
      // Tail going right
      out.push(R(hx + hw, hy + 1, 4, b.hh - 2, hairCol));
      out.push(R(hx + hw + 1, hy + b.hh - 1, 3, 5, hairCol));
      out.push(R(hx + hw + 2, hy + b.hh + 4, 2, 3, hairCol)); // curl
      break;
    case 'mohawk':
      // Shaved sides (dark)
      out.push(R(hx, hy, 3, Math.floor(b.hh * 0.6), '#282010'));
      out.push(R(hx + hw - 3, hy, 3, Math.floor(b.hh * 0.6), '#282010'));
      // Mohawk strip
      out.push(R(hx + Math.floor(hw / 2) - 1, hy - 7, 3, 8, hairCol));
      out.push(R(hx + Math.floor(hw / 2), hy - 9, 2, 2, hairCol));
      out.push(R(hx + Math.floor(hw / 2) - 1, hy - 4, 4, 4, hairCol));
      break;
    default:
      // fallback: short
      out.push(R(hx + 1, hy - 2, hw - 2, 3, hairCol));
      out.push(R(hx, hy, 2, 4, hairCol));
      out.push(R(hx + hw - 2, hy, 2, 4, hairCol));
  }
  return out;
}

// ─── FACE RENDERER ────────────────────────────────────────────────────────────

function renderFace(
  b: Body, skinCol: string, sdark: string,
  eyeCol: string, hasGlasses: boolean,
  facialHair: string, hairCol: string,
): El[] {
  const out: El[] = [];
  const { eyeY, eyeLX, eyeRX, noseX, noseY, mouthX, mouthY, mouthW } = b;

  // ── Eyes ────────────────────────────────────────────────────
  // 2×2 colored eye block — small, square, friendly (no vertical-slit look)
  out.push(R(eyeLX, eyeY, 2, 2, eyeCol));   // left eye
  out.push(R(eyeRX, eyeY, 2, 2, eyeCol));   // right eye
  // 1×1 shine pixel (top-right corner of each eye)
  out.push(R(eyeLX + 1, eyeY, 1, 1, '#FFFFFF'));
  out.push(R(eyeRX + 1, eyeY, 1, 1, '#FFFFFF'));
  // Upper eyelid line (thin 1px above each eye, slightly wider for emphasis)
  out.push(R(eyeLX - 1, eyeY - 1, 4, 1, sdark));
  out.push(R(eyeRX - 1, eyeY - 1, 4, 1, sdark));

  // ── Nose ────────────────────────────────────────────────────
  out.push(R(noseX, noseY, 2, 1, sdark));

  // ── Mouth (chibi smile) ─────────────────────────────────────
  // Center-high arc: outer pixels drop down 1
  out.push(R(mouthX + 1, mouthY,     mouthW - 2, 1, sdark)); // center
  out.push(R(mouthX,     mouthY + 1, 1,          1, sdark)); // left corner down
  out.push(R(mouthX + mouthW - 1, mouthY + 1, 1, 1, sdark)); // right corner down

  // ── Facial hair ─────────────────────────────────────────────
  // ── Mustache (standalone) ───────────────────────────────────
  if (facialHair === 'mustache') {
    // Simple, clear mustache centered directly under the nose
    const msx = noseX - 1;
    const msy = mouthY - 1;
    out.push(R(msx,     msy,     4, 1, hairCol)); // main bar
    out.push(R(msx - 1, msy + 1, 1, 1, hairCol)); // left end drops
    out.push(R(msx + 4, msy + 1, 1, 1, hairCol)); // right end drops
  }
  // ── Full beard (includes mustache + chin + connected sides) ─
  if (facialHair === 'beard') {
    const msx = noseX - 1;
    const msy = mouthY - 1;
    // Mustache portion at top
    out.push(R(msx,     msy,     4, 1, hairCol));
    out.push(R(msx - 1, msy + 1, 1, 1, hairCol));
    out.push(R(msx + 4, msy + 1, 1, 1, hairCol));
    // Jaw sides — connect mustache down into chin beard (clamped inside head)
    const jawMaxH = Math.max(0, b.hy + b.hh - (msy + 1) - 1);
    out.push(R(mouthX - 2, msy + 1, 2, Math.min(5, jawMaxH), hairCol));
    out.push(R(mouthX + mouthW, msy + 1, 2, Math.min(5, jawMaxH), hairCol));
    // Chin beard body
    const by = mouthY + 1;
    const bx = mouthX - 1;
    const bw = mouthW + 2;
    out.push(R(bx,     by,     bw,     3, hairCol));
    out.push(R(bx + 1, by + 3, bw - 2, 3, hairCol));
    out.push(R(bx + 2, by + 6, bw - 4, 2, hairCol));
    out.push(R(bx + 3, by + 8, bw - 6, 1, hairCol));
  }

  // ── Glasses ─────────────────────────────────────────────────
  if (hasGlasses) {
    const gy = eyeY - 1; // 1px above the 2×2 eye
    const fc = '#303030';
    // 4×4 frames precisely wrap the 2×2 eyes (1px border each side)
    const fw = 4, fh = 4;
    const lx = eyeLX - 1;
    const rx = eyeRX - 1;
    // Left lens frame
    out.push(R(lx,      gy,      fw, 1,    fc)); // top
    out.push(R(lx,      gy+fh-1, fw, 1,    fc)); // bottom
    out.push(R(lx,      gy+1,    1,  fh-2, fc)); // left side
    out.push(R(lx+fw-1, gy+1,    1,  fh-2, fc)); // right side
    // Right lens frame
    out.push(R(rx,      gy,      fw, 1,    fc));
    out.push(R(rx,      gy+fh-1, fw, 1,    fc));
    out.push(R(rx,      gy+1,    1,  fh-2, fc));
    out.push(R(rx+fw-1, gy+1,    1,  fh-2, fc));
    // Bridge between lenses
    const bridgeX = lx + fw;
    const bridgeW = Math.max(1, rx - bridgeX);
    out.push(R(bridgeX, gy + 1, bridgeW, 1, fc));
    // Temple arms
    out.push(R(lx - 2, gy + 1, 2, 1, fc));
    out.push(R(rx + fw, gy + 1, 2, 1, fc));
  }

  return out;
}

// ─── OUTFIT + LEGS COLORS ────────────────────────────────────────────────────

function getOutfitColors(equipped: EquippedItems, classId: string): { outfit: string; legs: string } {
  const name = (equipped.outfit?.name ?? '').toLowerCase();

  if (name.includes("traveler") || name.includes("tunic"))
    return { outfit: '#4A7830', legs: '#2E5018' }; // forest green — matches the 👕 icon
  if (name.includes("leather armor") || name.includes("leather"))
    return { outfit: '#5A3818', legs: '#382208' };
  if (name.includes("chain") || name.includes("mail"))
    return { outfit: '#9090A8', legs: '#6870A0' };
  if (name.includes("plate") || name.includes("full plate"))
    return { outfit: '#B8B8C8', legs: '#8890A8' };
  if (name.includes("robe") || name.includes("arcane") || name.includes("mage"))
    return { outfit: '#5030A0', legs: '#301870' };
  if (name.includes("ranger") || name.includes("scout") || name.includes("woodland"))
    return { outfit: '#3D6028', legs: '#2A4018' };
  if (name.includes("shadow") || name.includes("rogue") || name.includes("dark"))
    return { outfit: '#282828', legs: '#181818' };
  if (name.includes("holy") || name.includes("cleric") || name.includes("divine"))
    return { outfit: '#D8C870', legs: '#A89040' };
  if (name.includes("barbarian") || name.includes("beast") || name.includes("fur"))
    return { outfit: '#7A3818', legs: '#4A2008' };
  if (name.includes("dumpster") || name.includes("fire"))
    return { outfit: '#FF4010', legs: '#C03008' };

  // Class defaults when nothing is equipped
  const defaults: Record<string, { outfit: string; legs: string }> = {
    fighter:   { outfit: '#7A6850', legs: '#4A4030' },
    ranger:    { outfit: '#3D6028', legs: '#2A4018' },
    wizard:    { outfit: '#5030A0', legs: '#301870' },
    rogue:     { outfit: '#3A3530', legs: '#2A2020' },
    cleric:    { outfit: '#D8C870', legs: '#A89040' },
    barbarian: { outfit: '#7A3818', legs: '#4A2008' },
  };
  return defaults[classId] ?? { outfit: '#7A6850', legs: '#4A4030' };
}

// ─── HEADGEAR ─────────────────────────────────────────────────────────────────

function renderHeadgear(equipped: EquippedItems, classId: string, b: Body): El[] {
  const out: El[] = [];
  const name = (equipped.head?.name ?? '').toLowerCase();
  const hasHeadItem = !!equipped.head;
  const hx = b.hx, hy = b.hy, hw = b.hw;

  // Class defaults when no head item equipped
  const wantsHood   = !hasHeadItem && (classId === 'rogue');
  const wantsRangerCap = !hasHeadItem && classId === 'ranger';
  const wantsWizardHat = !hasHeadItem && classId === 'wizard';

  if (name.includes('wizard') || name.includes('witch') || wantsWizardHat) {
    // Brim
    out.push(R(hx - 2, hy - 2, hw + 4, 3, '#3820A0'));
    // Hat body, tapering to a point
    out.push(R(hx + 1, hy - 6, hw - 4, 4, '#3820A0'));
    out.push(R(hx + 2, hy - 9, hw - 6, 3, '#3820A0'));
    out.push(R(hx + 3, hy - 11, hw - 8, 2, '#3820A0'));
    out.push(R(hx + 4, hy - 12, 2, 1, '#3820A0'));
    // Star emblem
    out.push(R(hx + 3, hy - 7, 1, 3, '#FFD700'));
    out.push(R(hx + 2, hy - 6, 3, 1, '#FFD700'));
  } else if (name.includes('hood') || wantsHood) {
    // Rogue cowl: frames the face, NEVER covers it
    // Hood cap over the top of the head
    out.push(R(hx - 1, hy - 4, hw + 2, 5, '#2C2820')); // hood top above head
    out.push(R(hx,     hy - 1, hw,     2, '#342E28')); // where hood meets head top
    // Cowl sides frame the face (stop at mid-face level — face stays fully visible)
    const cowlH = Math.floor(b.hh * 0.5);
    out.push(R(hx - 2, hy, 2, cowlH, '#2C2820')); // left cowl side
    out.push(R(hx + hw, hy, 2, cowlH, '#2C2820')); // right cowl side
  } else if (name.includes('ranger') || name.includes('leaf') || wantsRangerCap) {
    // Ranger's cap + cloak hood
    out.push(R(hx, hy - 1, hw, 4, '#3D5828'));
    out.push(R(hx - 1, hy + 3, hw + 2, 3, '#4A6830'));
    // Feather
    out.push(R(hx + hw - 1, hy - 3, 2, 5, '#D0C850'));
    out.push(R(hx + hw, hy - 5, 1, 4, '#D0C850'));
  } else if (name.includes('helm') || name.includes('knight') || name.includes('iron')) {
    // Full metal helmet
    out.push(R(hx - 1, hy - 1, hw + 2, hw, '#8888A0'));
    out.push(R(hx, hy - 1, hw, 2, '#A0A0C0')); // top highlight
    // Visor slot
    out.push(R(hx + 1, hy + 3, hw - 2, 3, '#303038'));
    // Nasal guard
    out.push(R(hx + Math.floor(hw / 2) - 1, hy + 2, 2, 5, '#585870'));
  } else if (name.includes('crown')) {
    // Crown
    out.push(R(hx, hy - 2, hw, 3, '#FFD700'));
    out.push(R(hx + 1, hy - 4, 2, 2, '#FFD700'));
    out.push(R(hx + Math.floor(hw/2) - 1, hy - 5, 2, 3, '#FFD700'));
    out.push(R(hx + hw - 3, hy - 4, 2, 2, '#FFD700'));
    // Gems
    out.push(R(hx + 2, hy - 3, 1, 1, '#E84040'));
    out.push(R(hx + hw - 3, hy - 3, 1, 1, '#4040E8'));
    out.push(R(hx + Math.floor(hw/2), hy - 4, 1, 1, '#40E840'));
  } else if (hasHeadItem) {
    // Generic cap fallback
    out.push(R(hx - 1, hy - 2, hw + 2, 3, '#6B4020'));
    out.push(R(hx, hy, hw, 2, '#5A3010'));
  }

  return out;
}

// ─── WEAPON & OFF-HAND ────────────────────────────────────────────────────────

function renderEquipment(classId: string, equipped: EquippedItems, b: Body): El[] {
  const out: El[] = [];
  const wpName = (equipped.main_hand?.name ?? '').toLowerCase();
  const ohName  = (equipped.off_hand?.name  ?? '').toLowerCase();

  // ── Main hand (right side of character) ─────────────────────
  const wx = b.rax + b.raw + 1;
  const wy = b.ray + 1;

  // Determine weapon type: equipped item overrides class default
  let weapon = classId; // default: class weapon
  if (equipped.main_hand) {
    if (wpName.includes('sword') || wpName.includes('blade')) weapon = 'sword';
    else if (wpName.includes('staff') || wpName.includes('wand')) weapon = 'staff';
    else if (wpName.includes('axe') || wpName.includes('hatchet')) weapon = 'axe';
    else if (wpName.includes('dagger') || wpName.includes('knife')) weapon = 'dagger';
    else if (wpName.includes('mace') || wpName.includes('hammer')) weapon = 'mace';
    else if (wpName.includes('bow')) weapon = 'bow';
    else weapon = 'sword'; // default equipped weapon
  }

  switch (weapon) {
    case 'fighter':
    case 'sword': {
      // Sword: pommel, guard, blade, tip
      out.push(R(wx + 1, wy - 2, 2, 1, '#808080')); // pommel
      out.push(R(wx,     wy - 1, 4, 1, '#606060')); // crossguard
      out.push(R(wx + 1, wy,     2, 10, '#C8C8D0')); // blade
      out.push(R(wx + 2, wy,     1, 10, '#E8E8F0')); // blade highlight
      out.push(R(wx + 1, wy + 10, 1, 2, '#B0B0C0')); // tip taper
      break;
    }
    case 'wizard':
    case 'staff': {
      // Staff: shaft + glowing orb
      out.push(R(wx + 1, wy - 4, 2, 14, '#7A5028')); // shaft
      out.push(R(wx,     wy - 7, 4, 4, '#8050C0')); // orb
      out.push(R(wx + 1, wy - 6, 2, 2, '#C080F0')); // orb glow
      out.push(R(wx + 2, wy - 7, 1, 1, '#E0B0FF')); // orb shine
      break;
    }
    case 'rogue':
    case 'dagger': {
      // Dagger: short and fast
      out.push(R(wx + 1, wy - 3, 2, 3, '#6A5028')); // handle
      out.push(R(wx,     wy,     4, 1, '#606070')); // crossguard
      out.push(R(wx + 1, wy + 1, 2, 7, '#C0C0C8')); // blade
      out.push(R(wx + 2, wy + 1, 1, 7, '#E0E0E8')); // blade shine
      out.push(R(wx + 1, wy + 8, 1, 1, '#B0B0B8')); // tip
      break;
    }
    case 'barbarian':
    case 'axe': {
      // Great axe: big head, long handle
      out.push(R(wx + 1, wy - 2, 2, 14, '#8B6030')); // handle
      out.push(R(wx - 2, wy - 6, 6, 6, '#9090A8')); // axe head
      out.push(R(wx - 3, wy - 5, 2, 4, '#B0B0C0')); // leading edge
      out.push(R(wx - 1, wy - 7, 5, 2, '#9090A8')); // top beard
      break;
    }
    case 'cleric':
    case 'mace': {
      // Mace: flanged head + handle
      out.push(R(wx + 1, wy + 1, 2, 10, '#9A8060')); // handle
      out.push(R(wx - 1, wy - 5, 6, 7, '#B0A070')); // mace head
      out.push(R(wx,     wy - 7, 4, 2, '#C0B080')); // top flanges
      out.push(R(wx + 1, wy - 8, 2, 1, '#C0B080'));
      out.push(R(wx - 2, wy - 2, 2, 4, '#C0B080')); // side flanges
      out.push(R(wx + 4, wy - 2, 2, 4, '#C0B080'));
      break;
    }
    case 'ranger':
    case 'bow': {
      // Bow: held in off-hand (left side), arrow nocked
      const bx = b.lax - 5;
      const by = b.lay - 2;
      out.push(R(bx + 1, by, 2, 16, '#7A5028')); // bow limbs
      out.push(R(bx, by,     1, 1, '#7A5028')); // upper tip
      out.push(R(bx, by + 15, 1, 1, '#7A5028')); // lower tip
      // Bowstring
      out.push(R(bx, by + 1, 1, 14, '#D0D0D0'));
      // Arrow
      out.push(R(bx + 3, by + 5, 10, 1, '#C8A840')); // shaft
      out.push(R(bx + 13, by + 4, 2, 3, '#808090')); // head
      out.push(R(bx + 3, by + 4, 2, 1, '#E87070')); // fletching
      out.push(R(bx + 3, by + 6, 2, 1, '#E87070'));
      break;
    }
    default:
      break;
  }

  // ── Off-hand (left side of character) ───────────────────────
  if (equipped.off_hand && weapon !== 'ranger' && weapon !== 'bow') {
    const ox = b.lax - 5;
    const oy = b.lay;
    if (ohName.includes('shield') || ohName.includes('buckler')) {
      out.push(R(ox - 1, oy - 2, 6, 10, '#7A7AA0')); // shield
      out.push(R(ox,     oy - 1, 4, 8, '#9090B8')); // face
      out.push(R(ox + 1, oy + 2, 2, 4, '#B0B0D0')); // boss
      out.push(R(ox + 2, oy + 3, 1, 2, '#D0D0F0')); // boss shine
    } else if (ohName.includes('orb') || ohName.includes('focus')) {
      out.push(R(ox + 1, oy, 4, 4, '#8030C0'));
      out.push(R(ox + 2, oy + 1, 2, 2, '#C060F0'));
      out.push(R(ox + 3, oy, 1, 1, '#E090FF'));
    } else if (ohName.includes('tome') || ohName.includes('book')) {
      out.push(R(ox - 1, oy - 1, 5, 7, '#8B5030'));
      out.push(R(ox,     oy,     4, 5, '#D0B880'));
      out.push(R(ox + 1, oy + 1, 2, 3, '#B09060'));
    }
  }

  return out;
}

// ─── PET ─────────────────────────────────────────────────────────────────────

function renderPet(equipped: EquippedItems): El[] {
  const out: El[] = [];
  if (!equipped.pet) return out;

  const name = equipped.pet.name.toLowerCase();
  // Pet sits to the right of character
  const px = 27, py = 30;

  if (name.includes('dragon') || name.includes('wyvern')) {
    out.push(R(px, py + 1, 5, 4, '#508020')); // body
    out.push(R(px + 4, py - 2, 4, 4, '#508020')); // head
    out.push(R(px + 7, py - 1, 1, 1, '#FF4010')); // eye
    out.push(R(px + 3, py - 1, 2, 3, '#508020')); // neck
    out.push(R(px - 1, py,     2, 2, '#406018')); // wing fold
    out.push(R(px + 4, py + 4, 1, 4, '#508020')); // tail
    out.push(R(px + 5, py + 7, 2, 1, '#508020'));
  } else if (name.includes('cat') || name.includes('kitten')) {
    out.push(R(px,     py + 2, 5, 3, '#D0A040')); // body
    out.push(R(px + 1, py,     4, 3, '#D0A040')); // head
    out.push(R(px + 1, py - 1, 1, 1, '#D0A040')); // L ear
    out.push(R(px + 4, py - 1, 1, 1, '#D0A040')); // R ear
    out.push(R(px + 2, py + 1, 1, 1, '#303030')); // eye
    out.push(R(px + 4, py + 1, 1, 1, '#303030')); // eye
    out.push(R(px + 5, py + 3, 4, 1, '#D0A040')); // tail
    out.push(R(px + 8, py + 2, 1, 1, '#D0A040'));
  } else if (name.includes('fox')) {
    out.push(R(px,     py + 2, 5, 3, '#C06020')); // body
    out.push(R(px + 1, py,     4, 3, '#C06020')); // head
    out.push(R(px + 2, py - 1, 1, 1, '#C06020')); // ear
    out.push(R(px + 4, py - 1, 1, 1, '#C06020')); // ear
    out.push(R(px - 1, py + 1, 3, 3, '#F0F0F0')); // tail
    out.push(R(px + 2, py + 1, 1, 1, '#303030')); // eye
  } else {
    // Generic small familiar
    out.push(R(px,     py + 2, 4, 3, '#9060C0'));
    out.push(R(px + 1, py,     3, 3, '#9060C0'));
    out.push(R(px + 1, py + 1, 1, 1, '#FFFFFF'));
    out.push(R(px + 3, py + 1, 1, 1, '#FFFFFF'));
    out.push(R(px + 4, py + 3, 3, 1, '#7040A0')); // tail
  }

  return out;
}

// ─── BACKGROUND ───────────────────────────────────────────────────────────────

function renderBackground(equipped: EquippedItems): El[] {
  const out: El[] = [];
  const name = (equipped.background?.name ?? '').toLowerCase();

  if (!name) {
    // Default dark dungeon
    out.push(R(0, 0, 32, 48, '#12101C'));
    out.push(R(0, 38, 32, 10, '#0C0A14'));
    // Some subtle floor tiles
    for (let x = 0; x < 32; x += 8) out.push(R(x, 40, 7, 1, '#1A1828'));
    return out;
  }

  if (name.includes('dumpster fire') || name.includes('dumpster')) {
    // Night sky
    out.push(R(0, 0, 32, 48, '#080610'));
    // Alley floor
    out.push(R(0, 38, 32, 10, '#1A1208'));
    // Alley walls (sides)
    out.push(R(0, 0, 7, 38, '#201A18'));
    out.push(R(25, 0, 7, 38, '#201A18'));
    // Bricks (L wall)
    for (let y = 4; y < 36; y += 6) {
      out.push(R(1, y, 4, 1, '#302018'));
      out.push(R(3, y + 3, 3, 1, '#302018'));
    }
    // Dumpster body (left)
    out.push(R(0, 24, 9, 13, '#2A4838'));
    out.push(R(1, 22, 7, 3, '#2A4838')); // lid
    out.push(R(2, 21, 5, 1, '#3A5848')); // lid highlight
    // Dumpster wheels
    out.push(R(1, 37, 3, 2, '#101010'));
    out.push(R(5, 37, 3, 2, '#101010'));
    // ── FIRE on dumpster ──
    out.push(R(1, 20, 7, 3, '#FF6010')); // base flame (bright)
    out.push(R(2, 17, 5, 3, '#FF4010'));
    out.push(R(3, 14, 3, 3, '#FF2010'));
    out.push(R(3, 12, 3, 2, '#EE1010'));
    // Secondary flame shapes
    out.push(R(1, 18, 2, 3, '#FFA020'));
    out.push(R(6, 19, 2, 2, '#FFA020'));
    out.push(R(4, 15, 2, 3, '#FFCC40')); // hottest inner
    out.push(R(4, 11, 1, 2, '#FFEE80'));
    // Sparks
    out.push(R(4, 10, 1, 1, '#FFDD60'));
    out.push(R(2,  9, 1, 1, '#FF8820'));
    out.push(R(7, 11, 1, 1, '#FF8820'));
    out.push(R(5,  8, 1, 1, '#FFEE80'));
    // Glow on left wall from fire
    out.push(R(0, 14, 1, 10, '#FF601020'));
    // Stars in sky
    out.push(R(11, 1, 1, 1, '#FFFFFF'));
    out.push(R(16, 3, 1, 1, '#FFFF80'));
    out.push(R(23, 2, 1, 1, '#FFFFFF'));
    out.push(R(28, 5, 1, 1, '#FFFFFF'));
    out.push(R(13, 6, 1, 1, '#FFFFFF'));
    out.push(R(20, 1, 1, 1, '#FFFF80'));
    // Scattered trash on ground
    out.push(R(20, 39, 6, 2, '#3A3020'));
    out.push(R(22, 37, 4, 2, '#2A2810'));
    out.push(R(19, 41, 3, 1, '#281810'));
    return out;
  }

  if (name.includes('forest') || name.includes('nature') || name.includes('grove')) {
    out.push(R(0, 0, 32, 48, '#183010'));
    out.push(R(0, 36, 32, 12, '#102008'));
    // Trees
    out.push(R(1, 14, 5, 22, '#204010')); // trunk+foliage
    out.push(R(0, 8, 7, 8, '#30601A')); // upper foliage
    out.push(R(25, 16, 5, 20, '#204010'));
    out.push(R(24, 10, 8, 8, '#30601A'));
    // Ground plants
    out.push(R(9, 38, 2, 2, '#308020'));
    out.push(R(20, 37, 2, 3, '#308020'));
    return out;
  }

  if (name.includes('tavern') || name.includes('inn') || name.includes('bar')) {
    out.push(R(0, 0, 32, 48, '#2A1808'));
    out.push(R(0, 36, 32, 12, '#3A2010'));
    // Wooden floor planks
    for (let x = 0; x < 32; x += 8) out.push(R(x, 38, 7, 10, '#3A2008'));
    // Wall decorations
    out.push(R(2, 5, 6, 4, '#5A3820')); // picture frame
    out.push(R(3, 6, 4, 2, '#C8A040'));
    out.push(R(24, 4, 5, 6, '#5A3820'));
    return out;
  }

  if (name.includes('cave') || name.includes('dungeon') || name.includes('mine')) {
    out.push(R(0, 0, 32, 48, '#060406'));
    out.push(R(0, 36, 32, 12, '#100C0A'));
    // Stalactite-like ceiling drips
    out.push(R(5, 0, 2, 5, '#181418'));
    out.push(R(12, 0, 3, 3, '#181418'));
    out.push(R(22, 0, 2, 6, '#181418'));
    // Rock walls
    out.push(R(0, 0, 3, 36, '#100C10'));
    out.push(R(29, 0, 3, 36, '#100C10'));
    return out;
  }

  if (name.includes('sky') || name.includes('cloud') || name.includes('heaven')) {
    out.push(R(0, 0, 32, 48, '#4090D0'));
    out.push(R(0, 28, 32, 20, '#A0D8F0'));
    // Clouds
    out.push(R(2, 4, 8, 3, '#F0F8FF'));
    out.push(R(1, 5, 10, 3, '#F0F8FF'));
    out.push(R(20, 8, 10, 3, '#F0F8FF'));
    out.push(R(19, 9, 12, 3, '#F0F8FF'));
    return out;
  }

  // Generic — just dark gradient
  out.push(R(0, 0, 32, 48, '#12101C'));
  out.push(R(0, 38, 32, 10, '#0C0A14'));
  return out;
}

// ─── EFFECT OVERLAY ───────────────────────────────────────────────────────────

function renderEffect(equipped: EquippedItems): El[] {
  const out: El[] = [];
  if (!equipped.effect) return out;
  const name = equipped.effect.name.toLowerCase();

  if (name.includes('star') || name.includes('sparkle') || name.includes('glitter')) {
    out.push(R(4, 4, 2, 2, '#FFD700', 0.7));
    out.push(R(26, 7, 2, 2, '#FFD700', 0.6));
    out.push(R(12, 2, 1, 1, '#FFFFFF', 0.9));
    out.push(R(20, 4, 1, 1, '#FFFFFF', 0.7));
    out.push(R(7, 10, 1, 1, '#FFD700', 0.5));
  } else if (name.includes('fire') || name.includes('flame')) {
    out.push(R(5, 15, 2, 5, '#FF6010', 0.6));
    out.push(R(25, 15, 2, 5, '#FF6010', 0.6));
    out.push(R(5, 13, 1, 2, '#FF8020', 0.5));
    out.push(R(26, 13, 1, 2, '#FF8020', 0.5));
  } else if (name.includes('glow') || name.includes('aura') || name.includes('holy')) {
    out.push(R(6, 3, 20, 40, '#FFFFFF', 0.07));
  } else if (name.includes('shadow') || name.includes('dark')) {
    out.push(R(0, 0, 32, 48, '#000000', 0.25));
  }

  return out;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WIZARD PIXEL RENDERER — 48×72 canvas (upgraded from 32×48 benchmark)
// Layers (z-order): cape → boots → skin → robe → hair → face → headgear → weapon → off-hand
// '.' = transparent. Tokens resolve to hex via buildWizardPalette() at render.
// RLE: one <rect> per horizontal run — ~300-500 rects total vs 3456 naïve.
// Equipped items: equipped.head overrides default hat layer;
//                 equipped.main_hand overrides default staff layer.
// ═══════════════════════════════════════════════════════════════════════════════

type Grid = string[];

/** RLE renderer: one SVG rect per horizontal run of the same palette token. */
function renderGrid(grid: Grid, pal: Record<string, string>, ox = 0, oy = 0): El[] {
  const out: El[] = [];
  for (let row = 0; row < grid.length; row++) {
    const s = grid[row];
    let col = 0;
    while (col < s.length) {
      const ch = s[col];
      if (ch !== '.') {
        const color = pal[ch];
        if (color) {
          let run = 1;
          while (col + run < s.length && s[col + run] === ch) run++;
          out.push(R(ox + col, oy + row, run, 1, color));
          col += run;
          continue;
        }
      }
      col++;
    }
  }
  return out;
}

/** Coordinate-based grid builder — avoids manual string counting. */
function buildGrid(
  w: number, h: number,
  draw: (put: (r: number, c: number, len: number, ch: string) => void) => void,
): Grid {
  const cells: string[][] = Array.from({ length: h }, () => Array(w).fill('.'));
  const put = (r: number, c: number, len: number, ch: string) => {
    for (let i = 0; i < len; i++) {
      if (r >= 0 && r < h && c + i >= 0 && c + i < w) cells[r][c + i] = ch;
    }
  };
  draw(put);
  return cells.map(row => row.join(''));
}

// ─── WIZARD PALETTE ───────────────────────────────────────────────────────────

function buildWizardPalette(
  skinBase: string, skinDark: string, hairBase: string, eyeBase: string, robeBase: string,
): Record<string, string> {
  return {
    // Skin
    A: lightenHex(skinBase, 30),   S: skinBase,
    s: darkenHex(skinBase, 18),    D: skinDark,
    // Eyes
    E: eyeBase,  B: '#101010',  W: '#F8F8F8',
    // Face/hair details
    Y: hairBase,                   y: darkenHex(hairBase, 25),
    N: darkenHex(skinBase, 28),   M: darkenHex(skinBase, 40),  m: darkenHex(skinBase, 55),
    // Hair
    j: lightenHex(hairBase, 22),  H: hairBase,   h: darkenHex(hairBase, 25),
    // Robe
    G: lightenHex(robeBase, 38),  R: robeBase,
    r: darkenHex(robeBase, 22),   X: darkenHex(robeBase, 44),  x: darkenHex(robeBase, 62),
    // Gold trim
    T: '#D4B840',  t: '#907820',
    // Hat cone
    P: darkenHex(robeBase, 12),   p: darkenHex(robeBase, 35),  q: darkenHex(robeBase, 58),
    // Hat brim
    V: darkenHex(robeBase, 5),    v: darkenHex(robeBase, 28),
    // Cape (rendered behind body at sides)
    K: darkenHex(robeBase, 22),   k: darkenHex(robeBase, 45),  J: lightenHex(robeBase, 12),
    // Boots
    Z: '#3A2010',  z: '#5A3820',  Q: '#1A0A04',
    // Staff wood
    F: '#9B5C2A',  f: '#5A3018',
    // Crystal gem (staff / orb)
    C: '#C89AFF',  c: '#7840A0',  g: '#EDD8FF',
    // Chest brooch gem
    O: '#E85020',  o: '#901808',
    // Generic weapon metals
    I: '#C8C8D0',  i: '#909098',  // silver blade / bright
    L: '#8B6030',  l: '#5A3018',  // brown handle / dark wood
  };
}

// ─── WIZARD LAYERS (48×72) ────────────────────────────────────────────────────
// Key layout:
//   Hat cone  rows  0-12  |  Hat brim rows 13-15
//   Head      rows 13-33  (visible from row ~16; brim covers 13-15)
//   Neck      rows 33-37  |  Cape sides: rows 34-70, cols 5-12 & 35-43
//   Shoulders rows 34-36  |  V-neck rows 37-44  |  Brooch rows 40-44
//   Torso     rows 44-54  |  Belt/buckle rows 47-52
//   Skirt     rows 55-65  |  Hem rows 63-65
//   Boots     rows 63-71  |  Staff: crystal rows 0-5, shaft cols 38-39 rows 6-71

/** Default staff — held in right hand (overridable by equipped.main_hand). */
const WIZARD_STAFF_GRID: Grid = (() => buildGrid(48, 72, put => {
  // Crystal gem (rows 0-5, cols 37-41)
  put(0, 38, 2, 'C');
  put(1, 37, 1, 'c'); put(1, 38, 2, 'C'); put(1, 40, 1, 'c');
  put(2, 36, 1, 'c'); put(2, 37, 1, 'C'); put(2, 38, 1, 'g'); put(2, 39, 1, 'C'); put(2, 40, 1, 'c');
  put(3, 36, 1, 'c'); put(3, 37, 3, 'C'); put(3, 40, 1, 'c');
  put(4, 37, 1, 'c'); put(4, 38, 2, 'C'); put(4, 40, 1, 'c');
  put(5, 37, 4, 'c');
  // Shaft 2px wide (F=warm front, f=shadow side), rows 6-71
  for (let r = 6; r < 72; r++) { put(r, 38, 1, 'F'); put(r, 39, 1, 'f'); }
  // Wood grain knots
  [22, 38, 52, 65].forEach(r => put(r, 38, 2, 'f'));
}))();

/** Alternative weapon grid: sword (for equipped swords/blades). */
const WIZARD_SWORD_GRID: Grid = (() => buildGrid(48, 72, put => {
  // Pommel
  put(2, 37, 3, 'I');
  // Crossguard (wide)
  put(4, 34, 8, 'i');
  // Blade (rows 5-20)
  for (let r = 5; r <= 20; r++) { put(r, 37, 2, 'I'); put(r, 38, 1, 'W'); }
  // Taper tip
  put(21, 37, 1, 'I');
  // Handle
  for (let r = 3; r <= 4; r++) { put(r, 37, 2, 'L'); }
}))();

/** Alternative weapon grid: dagger. */
const WIZARD_DAGGER_GRID: Grid = (() => buildGrid(48, 72, put => {
  // Handle (rows 2-6)
  for (let r = 2; r <= 6; r++) put(r, 37, 2, 'L');
  // Crossguard
  put(7, 35, 6, 'i');
  // Blade (rows 8-16)
  for (let r = 8; r <= 15; r++) { put(r, 37, 2, 'I'); put(r, 38, 1, 'W'); }
  put(16, 37, 1, 'i');
}))();

/**
 * Returns the main-hand weapon grid based on equipped.main_hand.
 * Defaults to the staff when nothing is equipped or item is a staff/wand.
 */
function buildWizardMainHandGrid(equipped: EquippedItems): Grid {
  const name = (equipped.main_hand?.name ?? '').toLowerCase();
  if (!equipped.main_hand) return WIZARD_STAFF_GRID;
  if (name.includes('staff') || name.includes('wand') || name.includes('rod')) return WIZARD_STAFF_GRID;
  if (name.includes('sword') || name.includes('blade') || name.includes('saber')) return WIZARD_SWORD_GRID;
  if (name.includes('dagger') || name.includes('knife')) return WIZARD_DAGGER_GRID;
  return WIZARD_STAFF_GRID; // fallback
}

/** Cape — at body sides behind the robe, with gold bottom hem. */
const WIZARD_CAPE_GRID: Grid = (() => buildGrid(48, 72, put => {
  // Left cape side (cols 5-12, rows 34-65)
  for (let r = 34; r <= 65; r++) {
    put(r, 5, 1, 'J');
    put(r, 6, 5, 'K');
    put(r, 11, 2, 'k');
    if (r === 44 || r === 56) put(r, 7, 3, 'k');
  }
  // Right cape side (cols 35-43, rows 34-65)
  for (let r = 34; r <= 65; r++) {
    put(r, 35, 2, 'k');
    put(r, 37, 5, 'K');
    put(r, 42, 1, 'J');
    if (r === 44 || r === 56) put(r, 38, 3, 'k');
  }
  // Cape bottom drape (rows 66-70)
  for (let r = 66; r <= 70; r++) {
    put(r, 4, 2, 'J'); put(r, 6, 7, 'K');
    put(r, 35, 7, 'K'); put(r, 42, 2, 'J');
    put(r, 13, 22, 'k'); // dark fold between boots
  }
  // Gold hem
  put(71, 4, 40, 'T'); put(71, 4, 3, 'G'); put(71, 41, 3, 't');
}))();

/** Skin — head silhouette, neck, wrists/hands. */
const WIZARD_SKIN_GRID: Grid = (() => buildGrid(48, 72, put => {
  // Head (rows 13-33; hat brim covers 13-15 but skin still there for overlap)
  put(13, 18, 2, 'A'); put(13, 20, 9, 'S'); put(13, 29, 2, 's');
  put(14, 18, 2, 'A'); put(14, 20, 9, 'S'); put(14, 29, 2, 's');
  put(15, 17, 2, 'A'); put(15, 19, 10, 'S'); put(15, 29, 3, 's');
  put(16, 16, 2, 'A'); put(16, 18, 11, 'S'); put(16, 29, 4, 's');
  put(17, 16, 2, 'A'); put(17, 18, 11, 'S'); put(17, 29, 4, 's');
  put(18, 15, 2, 'A'); put(18, 17, 12, 'S'); put(18, 29, 4, 's'); put(18, 33, 1, 'D');
  put(19, 15, 2, 'A'); put(19, 17, 12, 'S'); put(19, 29, 4, 's'); put(19, 33, 1, 'D');
  for (let r = 20; r <= 28; r++) {
    put(r, 14, 2, 'A'); put(r, 16, 14, 'S'); put(r, 30, 3, 's'); put(r, 33, 2, 'D');
  }
  put(29, 15, 2, 'A'); put(29, 17, 12, 'S'); put(29, 29, 3, 's'); put(29, 32, 1, 'D');
  put(30, 16, 2, 'A'); put(30, 18, 10, 'S'); put(30, 28, 4, 's');
  put(31, 18, 2, 'A'); put(31, 20, 8, 'S'); put(31, 28, 3, 's');
  put(32, 20, 2, 'A'); put(32, 22, 5, 'S'); put(32, 27, 3, 's');
  put(33, 22, 2, 'A'); put(33, 24, 3, 'S'); put(33, 27, 2, 's');

  // Neck (rows 34-37)
  for (let r = 34; r <= 37; r++) {
    put(r, 21, 2, 'A'); put(r, 23, 2, 'S'); put(r, 25, 2, 's');
  }
  // Chest skin in V-neck opening (rows 38-43)
  put(38, 21, 7, 'S'); put(38, 28, 1, 's');
  put(39, 22, 6, 'S'); put(39, 28, 1, 's');
  put(40, 23, 5, 'S'); put(40, 28, 1, 's');
  put(41, 23, 5, 'S'); put(41, 28, 1, 's');
  put(42, 24, 4, 'S'); put(42, 28, 1, 's');
  put(43, 24, 4, 'S');

  // Left wrist/hand (rows 53-58, cols 6-12)
  put(53, 6, 5, 'S'); put(53, 11, 2, 's');
  put(54, 6, 5, 'S'); put(54, 11, 2, 's');
  put(55, 7, 5, 'S'); put(55, 12, 1, 's');
  put(56, 8, 4, 'S'); put(56, 12, 1, 's');
  put(57, 8, 4, 's'); put(58, 9, 3, 's');

  // Right wrist/hand (rows 53-58, cols 35-41)
  put(53, 35, 2, 's'); put(53, 37, 5, 'S');
  put(54, 35, 2, 's'); put(54, 37, 5, 'S');
  put(55, 35, 1, 's'); put(55, 36, 5, 'S');
  put(56, 35, 1, 's'); put(56, 36, 4, 'S');
  put(57, 35, 4, 's'); put(58, 36, 3, 's');
}))();

/** Robe — V-neck lapels, chest brooch, tapered sleeves, torso folds, leather belt+buckle, flared skirt, gold hem. */
const WIZARD_ROBE_GRID: Grid = (() => buildGrid(48, 72, put => {
  // Left sleeve (rows 34-54, tapers shoulder→cuff)
  for (let r = 34; r <= 37; r++) { put(r, 5, 1, 'G'); put(r, 6, 7, 'R'); put(r, 13, 1, 'r'); put(r, 14, 1, 'x'); }
  for (let r = 38; r <= 43; r++) { put(r, 6, 1, 'G'); put(r, 7, 5, 'R'); put(r, 12, 1, 'r'); put(r, 13, 1, 'x'); }
  for (let r = 44; r <= 48; r++) { put(r, 7, 1, 'G'); put(r, 8, 3, 'R'); put(r, 11, 1, 'r'); put(r, 12, 1, 'X'); }
  for (let r = 49; r <= 52; r++) { put(r, 8, 1, 'G'); put(r, 9, 2, 'R'); put(r, 11, 1, 'X'); }
  put(53, 5, 8, 'T'); put(53, 5, 2, 'G'); put(53, 12, 2, 't'); // gold cuff
  put(54, 5, 8, 'T'); put(54, 5, 1, 'G'); put(54, 12, 1, 't');

  // Right sleeve (rows 34-54)
  for (let r = 34; r <= 37; r++) { put(r, 33, 1, 'x'); put(r, 34, 1, 'r'); put(r, 35, 7, 'R'); put(r, 42, 1, 'G'); }
  for (let r = 38; r <= 43; r++) { put(r, 34, 1, 'x'); put(r, 35, 1, 'r'); put(r, 36, 5, 'R'); put(r, 41, 1, 'G'); }
  for (let r = 44; r <= 48; r++) { put(r, 35, 1, 'X'); put(r, 36, 1, 'r'); put(r, 37, 3, 'R'); put(r, 40, 1, 'G'); }
  for (let r = 49; r <= 52; r++) { put(r, 36, 1, 'X'); put(r, 37, 2, 'R'); put(r, 39, 1, 'G'); }
  put(53, 35, 2, 't'); put(53, 37, 8, 'T'); put(53, 42, 2, 'G'); // gold cuff
  put(54, 35, 1, 't'); put(54, 36, 8, 'T'); put(54, 42, 1, 'G');

  // Wide shoulders (rows 34-36, skip neck cols 21-26)
  for (let r = 34; r <= 36; r++) {
    put(r, 14, 2, 'G'); put(r, 16, 5, 'R'); put(r, 20, 2, 'r'); // left half
    put(r, 26, 2, 'r'); put(r, 28, 5, 'R'); put(r, 33, 2, 'X'); // right half
  }

  // V-neck lapels (rows 37-44)
  put(37, 14, 6, 'R'); put(37, 14, 2, 'G'); put(37, 19, 2, 'r'); put(37, 27, 2, 'r'); put(37, 29, 5, 'R'); put(37, 33, 2, 'X');
  put(38, 14, 5, 'R'); put(38, 14, 2, 'G'); put(38, 18, 2, 'r'); put(38, 28, 2, 'r'); put(38, 30, 4, 'R'); put(38, 33, 2, 'X');
  put(39, 14, 4, 'R'); put(39, 14, 2, 'G'); put(39, 17, 2, 'r'); put(39, 29, 2, 'r'); put(39, 31, 3, 'R'); put(39, 33, 2, 'X');
  put(40, 14, 3, 'G'); put(40, 17, 2, 'R'); put(40, 19, 2, 'r'); put(40, 27, 2, 'r'); put(40, 29, 4, 'R'); put(40, 32, 2, 'X');
  put(41, 14, 3, 'G'); put(41, 17, 2, 'R'); put(41, 19, 2, 'r'); put(41, 27, 2, 'r'); put(41, 29, 4, 'R'); put(41, 32, 2, 'X');
  put(42, 14, 3, 'G'); put(42, 17, 4, 'R'); put(42, 21, 2, 'r'); put(42, 25, 2, 'r'); put(42, 27, 4, 'R'); put(42, 31, 3, 'X');
  put(43, 14, 3, 'G'); put(43, 17, 4, 'R'); put(43, 21, 2, 'r'); put(43, 25, 2, 'r'); put(43, 27, 4, 'R'); put(43, 31, 3, 'X');
  put(44, 14, 2, 'G'); put(44, 16, 16, 'R'); put(44, 32, 2, 'X'); // V closed

  // Chest brooch (rows 40-44, center cols 22-25)
  put(40, 23, 2, 'T');
  put(41, 22, 1, 'T'); put(41, 23, 2, 'O'); put(41, 25, 1, 'T');
  put(42, 22, 1, 'T'); put(42, 23, 1, 'g'); put(42, 24, 1, 'O'); put(42, 25, 1, 'T');
  put(43, 22, 1, 'T'); put(43, 23, 2, 'O'); put(43, 25, 1, 'T');
  put(44, 23, 2, 'T');

  // Torso body (rows 45-54, cols 14-33)
  for (let r = 45; r <= 54; r++) {
    put(r, 14, 2, 'G'); put(r, 16, 5, 'R'); put(r, 21, 1, 'r');
    put(r, 22, 2, 'R'); put(r, 24, 1, 'r'); put(r, 25, 2, 'R');
    put(r, 27, 5, 'R'); put(r, 32, 1, 'r'); put(r, 33, 2, 'X');
  }

  // Leather belt (rows 47-52) with gold center buckle
  for (let r = 47; r <= 52; r++) {
    put(r, 14, 20, 'Z'); put(r, 14, 2, 'z'); put(r, 32, 2, 'Q');
  }
  // Buckle frame (4px wide × 6px tall, center)
  put(47, 22, 4, 'T'); put(47, 22, 1, 'G');
  put(48, 22, 1, 'T'); put(48, 23, 2, 'x'); put(48, 25, 1, 'T');
  put(49, 22, 1, 'T'); put(49, 23, 2, 'x'); put(49, 25, 1, 'T');
  put(50, 22, 1, 'T'); put(50, 23, 2, 'x'); put(50, 25, 1, 'T');
  put(51, 22, 1, 'T'); put(51, 23, 2, 'x'); put(51, 25, 1, 'T');
  put(52, 22, 4, 'T'); put(52, 25, 1, 't');

  // Skirt (rows 55-65, flares outward)
  const skirt: Array<[number, number, number]> = [
    [55,14,20],[56,13,22],[57,12,24],[58,11,26],
    [59,10,28],[60,9,30],[61,8,32],[62,7,34],
    [63,7,34],[64,7,34],[65,7,34],
  ];
  for (const [row, c, w] of skirt) {
    put(row, c, 1, 'G'); put(row, c+1, w-4, 'R'); put(row, c+w-3, 1, 'r'); put(row, c+w-2, 2, 'X');
    [19,24,29].forEach(fc => { if (fc > c && fc < c+w) put(row, fc, 1, 'r'); });
  }

  // Gold robe hem (rows 63-65, overlays bottom of skirt)
  put(63, 7, 34, 'T'); put(63, 7, 3, 'G'); put(63, 38, 3, 't');
  put(64, 7, 34, 'T'); put(64, 7, 2, 'G'); put(64, 37, 2, 'T');
  put(65, 7, 34, 't');
}))();

/** Boots — peaking below robe hem. */
const WIZARD_BOOTS_GRID: Grid = (() => buildGrid(48, 72, put => {
  // Left boot (cols 9-20, rows 63-68)
  put(63,9,11,'Z'); put(63,9,3,'z'); put(63,19,1,'Q');
  put(64,9,12,'Z'); put(64,9,2,'z'); put(64,20,1,'Q');
  put(65,9,13,'Z'); put(65,9,1,'z'); put(65,21,1,'Q');
  put(66,9,14,'Q'); put(66,10,3,'Z');
  put(67,9,14,'Q'); put(68,10,12,'Q');
  // Right boot (cols 28-39, rows 63-68)
  put(63,28,11,'Z'); put(63,28,3,'z'); put(63,38,1,'Q');
  put(64,28,12,'Z'); put(64,28,2,'z'); put(64,39,1,'Q');
  put(65,28,13,'Z'); put(65,28,1,'z'); put(65,40,1,'Q');
  put(66,28,14,'Q'); put(66,29,3,'Z');
  put(67,28,14,'Q'); put(68,29,12,'Q');
}))();

// ─── DEFAULT WIZARD HAT ───────────────────────────────────────────────────────

/** Floppy conical wizard hat with gold star emblem and wide brim. */
const WIZARD_HAT_GRID: Grid = (() => buildGrid(48, 72, put => {
  // Cone (rows 0-12, leans left)
  put(0,23,2,'P');
  put(1,22,3,'P'); put(1,24,1,'p');
  put(2,21,3,'P'); put(2,24,2,'p');
  put(3,20,4,'P'); put(3,24,2,'p');
  put(4,18,6,'P'); put(4,24,3,'p');
  put(5,16,8,'P'); put(5,24,4,'p');
  put(6,14,10,'P'); put(6,24,4,'p');
  put(7,12,12,'P'); put(7,24,5,'p');
  put(8,10,14,'P'); put(8,24,5,'p');
  put(9,8,16,'P'); put(9,24,5,'p');
  put(10,7,17,'P'); put(10,24,6,'p');
  put(11,6,18,'P'); put(11,24,6,'p');
  put(12,5,19,'P'); put(12,24,7,'p');
  // Inner crease
  for (let r = 2; r <= 12; r++) put(r, 23, 1, 'q');
  // Gold star emblem (rows 6-8)
  put(6,15,1,'T'); put(7,14,3,'T'); put(8,15,1,'T');
  // Brim (rows 13-15)
  put(13,8,30,'V'); put(13,8,4,'G'); put(13,35,4,'v');
  put(14,7,32,'V'); put(14,7,3,'G'); put(14,37,4,'v');
  put(15,7,32,'v'); put(15,7,2,'V'); put(15,37,2,'V');
}))();

/** Alternative hat grids for equipped head items. */
const WIZARD_HOOD_GRID: Grid = (() => buildGrid(48, 72, put => {
  // Hood top
  for (let r = 8; r <= 15; r++) { put(r, 10, 28, 'p'); put(r, 10, 3, 'q'); put(r, 35, 3, 'q'); }
  // Cowl sides frame the face
  for (let r = 16; r <= 30; r++) { put(r, 10, 5, 'p'); put(r, 33, 5, 'p'); }
  put(15, 8, 32, 'q'); // brim band
}))();

const WIZARD_CROWN_GRID: Grid = (() => buildGrid(48, 72, put => {
  // Crown band (rows 12-15)
  put(12, 13, 22, 'T'); put(12, 13, 4, 'G'); put(12, 31, 4, 't');
  put(13, 12, 24, 'T'); put(13, 12, 3, 'G');
  put(14, 12, 24, 'T');
  put(15, 12, 24, 'T');
  // Crown points (3 points)
  put(7,  14, 3, 'T'); put(8, 13, 4, 'T'); put(9, 12, 5, 'T'); // left point
  put(7,  22, 3, 'T'); put(8, 21, 4, 'T'); put(9, 20, 5, 'T'); // center point
  put(7,  30, 3, 'T'); put(8, 29, 4, 'T'); put(9, 28, 5, 'T'); // right point
  // Crown gems
  put(13, 15, 2, 'O'); // left gem
  put(13, 22, 2, 'C'); // center gem
  put(13, 29, 2, 'O'); // right gem
}))();

const WIZARD_HELMET_GRID: Grid = (() => buildGrid(48, 72, put => {
  // Full visorless helm
  for (let r = 8; r <= 15; r++) { put(r, 11, 26, 'i'); put(r, 11, 3, 'I'); put(r, 34, 3, 'i'); }
  // Cheekguards
  for (let r = 14; r <= 20; r++) { put(r, 10, 5, 'i'); put(r, 33, 5, 'i'); }
  // Nasal guard
  for (let r = 14; r <= 22; r++) put(r, 23, 2, 'i');
  // Rim
  put(8, 11, 26, 'I'); put(15, 10, 28, 'i');
}))();

/**
 * Returns the headgear grid based on equipped.head.
 * Defaults to the floppy wizard hat when nothing is equipped.
 */
function buildWizardHeadLayer(equipped: EquippedItems): Grid {
  const name = (equipped.head?.name ?? '').toLowerCase();
  if (!equipped.head) return WIZARD_HAT_GRID;
  if (name.includes('wizard') || name.includes('witch') || name.includes('arcane hat')) return WIZARD_HAT_GRID;
  if (name.includes('hood') || name.includes('cowl')) return WIZARD_HOOD_GRID;
  if (name.includes('crown') || name.includes('tiara')) return WIZARD_CROWN_GRID;
  if (name.includes('helm') || name.includes('helmet')) return WIZARD_HELMET_GRID;
  return WIZARD_HAT_GRID; // fallback — keep default hat for unrecognized items
}

// ─── HAIR ─────────────────────────────────────────────────────────────────────

function buildWizardHairGrid(hairStyle: string): Grid {
  if (hairStyle === 'bald') return buildGrid(48, 72, () => {});
  return buildGrid(48, 72, put => {
    // Base sideburns below hat brim (rows 16-18)
    put(16,13,3,'j'); put(17,12,3,'H'); put(18,12,3,'h');
    put(16,32,3,'H'); put(17,33,3,'H'); put(18,33,3,'h');
    switch (hairStyle) {
      case 'medium':
        for (let r = 19; r <= 28; r++) { put(r,11,3,r<23?'j':'H'); put(r,34,3,'H'); }
        break;
      case 'long':
        for (let r = 16; r <= 52; r++) { put(r,10,4,r<20?'j':'H'); put(r,34,4,'H'); }
        break;
      case 'curly':
        put(16,10,5,'H'); put(17,9,5,'H'); put(18,9,5,'h');
        put(16,33,5,'H'); put(17,34,5,'H'); put(18,34,5,'h');
        break;
      case 'ponytail':
        for (let r = 18; r <= 44; r++) put(r,34,5,r<23?'j':'H');
        put(45,34,4,'H'); put(46,35,3,'h');
        break;
      case 'mohawk':
        put(16,12,3,'h'); put(17,12,3,'h');
        put(16,33,3,'h'); put(17,33,3,'h');
        break;
      // 'short' falls through to base sideburns only
    }
  });
}

// ─── FACE ─────────────────────────────────────────────────────────────────────

function buildWizardFaceGrid(facialHair: string, hasGlasses: boolean, expression = 'neutral'): Grid {
  return buildGrid(48, 72, put => {
    // Eyebrows (default row 18; vary by expression)
    if (expression === 'surprised') {
      put(16,16,5,'Y'); put(15,19,1,'Y');
      put(16,27,5,'Y'); put(15,29,1,'Y');
    } else if (expression === 'happy') {
      put(17,16,5,'Y'); put(16,19,1,'Y');
      put(17,27,5,'Y'); put(16,30,1,'Y');
    } else if (expression === 'angry') {
      put(18,16,4,'Y'); put(19,20,1,'Y');
      put(18,28,4,'Y'); put(19,27,1,'Y');
    } else {
      put(18,16,5,'Y'); put(17,19,1,'Y');
      put(18,27,5,'Y'); put(17,30,1,'Y');
    }

    // Eyes (5×5 area; happy=squint, surprised=wide, wink=L closed)
    if (expression === 'happy') {
      put(22,16,5,'B'); put(23,17,3,'y');
      put(22,27,5,'B'); put(23,28,3,'y');
    } else if (expression === 'surprised') {
      put(19,17,3,'B'); put(20,16,1,'B'); put(20,17,3,'E'); put(20,20,1,'B');
      put(21,16,1,'B'); put(21,17,1,'E'); put(21,18,1,'W'); put(21,19,2,'E'); put(21,20,1,'B');
      put(22,16,1,'B'); put(22,17,3,'E'); put(22,20,1,'B');
      put(23,16,1,'B'); put(23,17,3,'E'); put(23,20,1,'B'); put(24,17,3,'B');
      put(19,28,3,'B'); put(20,27,1,'B'); put(20,28,3,'E'); put(20,31,1,'B');
      put(21,27,1,'B'); put(21,28,1,'E'); put(21,29,1,'W'); put(21,30,2,'E'); put(21,31,1,'B');
      put(22,27,1,'B'); put(22,28,3,'E'); put(22,31,1,'B');
      put(23,27,1,'B'); put(23,28,3,'E'); put(23,31,1,'B'); put(24,28,3,'B');
    } else if (expression === 'wink') {
      put(22,16,5,'B'); put(23,17,3,'y'); // left eye closed
      put(20,28,3,'B'); put(21,27,1,'B'); put(21,28,3,'E'); put(21,31,1,'B');
      put(22,27,1,'B'); put(22,28,1,'E'); put(22,29,1,'W'); put(22,30,2,'E'); put(22,31,1,'B');
      put(23,27,1,'B'); put(23,28,3,'E'); put(23,31,1,'B'); put(24,28,3,'B');
    } else {
      put(20,17,3,'B'); put(21,16,1,'B'); put(21,17,3,'E'); put(21,20,1,'B');
      put(22,16,1,'B'); put(22,17,1,'E'); put(22,18,1,'W'); put(22,19,2,'E'); put(22,20,1,'B');
      put(23,16,1,'B'); put(23,17,3,'E'); put(23,20,1,'B'); put(24,17,3,'B');
      put(20,28,3,'B'); put(21,27,1,'B'); put(21,28,3,'E'); put(21,31,1,'B');
      put(22,27,1,'B'); put(22,28,1,'E'); put(22,29,1,'W'); put(22,30,2,'E'); put(22,31,1,'B');
      put(23,27,1,'B'); put(23,28,3,'E'); put(23,31,1,'B'); put(24,28,3,'B');
    }

    // Nose (rows 25-27)
    put(25,22,1,'N'); put(25,25,1,'N');
    put(26,21,1,'N'); put(26,26,1,'N');
    put(27,22,3,'N');

    // Mouth (rows 28-30)
    if (expression === 'happy') {
      put(27,18,1,'M'); put(27,29,1,'M');
      put(28,19,9,'M'); put(28,21,5,'m');
      put(29,20,8,'s');
    } else if (expression === 'surprised') {
      put(28,22,4,'B'); put(29,21,1,'B'); put(29,22,4,'m'); put(29,26,1,'B');
      put(30,21,1,'B'); put(30,22,4,'m'); put(30,26,1,'B'); put(31,22,4,'B');
    } else if (expression === 'angry') {
      put(28,20,8,'M'); put(29,21,1,'M'); put(29,27,1,'M');
    } else if (expression === 'thinking') {
      put(28,22,5,'M'); put(28,26,1,'m');
    } else {
      put(28,20,8,'M'); put(28,21,6,'m');
      put(29,19,1,'M'); put(29,28,1,'M');
    }

    // Facial hair
    if (facialHair === 'mustache' || facialHair === 'beard') {
      put(26,19,2,'Y'); put(26,21,5,'Y'); put(26,26,2,'Y');
      put(27,18,1,'Y'); put(27,28,1,'Y');
    }
    if (facialHair === 'beard') {
      put(29,18,12,'Y'); put(29,20,3,'y');
      put(30,17,13,'Y'); put(30,20,3,'y');
      put(31,17,13,'Y'); put(31,21,3,'y');
      put(32,18,11,'Y'); put(32,22,2,'y');
      put(33,19,9,'Y'); put(33,23,2,'y');
      put(34,20,7,'Y');
    }

    // Glasses
    if (hasGlasses) {
      // Left lens (rows 19-24, cols 15-21)
      put(19,16,5,'B'); put(24,16,5,'B');
      for (let r = 20; r <= 23; r++) { put(r,15,1,'B'); put(r,21,1,'B'); }
      // Right lens (rows 19-24, cols 26-32)
      put(19,27,5,'B'); put(24,27,5,'B');
      for (let r = 20; r <= 23; r++) { put(r,26,1,'B'); put(r,32,1,'B'); }
      // Bridge + temples
      put(21,22,4,'B');
      put(21,13,2,'B'); put(21,33,2,'B');
    }
  });
}

// ─── OFF-HAND ─────────────────────────────────────────────────────────────────

function buildWizardOffHandGrid(ohName: string): Grid {
  return buildGrid(48, 72, put => {
    if (ohName.includes('orb') || ohName.includes('focus') || ohName.includes('crystal')) {
      put(38,2,5,'C'); put(39,1,6,'C'); put(39,2,1,'g');
      put(40,1,6,'C'); put(40,3,1,'g');
      put(41,1,6,'C'); put(41,6,1,'c');
      put(42,1,5,'C'); put(42,5,2,'c');
      put(43,2,5,'c');
    } else if (ohName.includes('tome') || ohName.includes('book') || ohName.includes('grimoire')) {
      put(42,1,8,'t'); put(42,1,1,'T');
      for (let r = 43; r <= 57; r++) { put(r,1,8,'Z'); put(r,2,5,'z'); }
      put(58,1,8,'t');
    } else if (ohName.includes('shield') || ohName.includes('buckler')) {
      put(38,0,5,'r');
      for (let r = 39; r <= 50; r++) { put(r,0,7,'R'); put(r,1,2,'G'); }
      put(51,0,5,'r');
    }
  });
}

// ─── BACKGROUND / PET / EFFECT — 48×72 VERSIONS ──────────────────────────────
// These mirror the original 32×48 functions with coordinates scaled ×1.5
// so they fill the wizard's larger canvas correctly.

function renderBackground48(equipped: EquippedItems): El[] {
  const out: El[] = [];
  const name = (equipped.background?.name ?? '').toLowerCase();
  const W = 48, H = 72;

  if (!name) {
    out.push(R(0,0,W,H,'#12101C'));
    out.push(R(0,57,W,15,'#0C0A14'));
    for (let x = 0; x < W; x += 12) out.push(R(x,60,11,1,'#1A1828'));
    return out;
  }
  if (name.includes('dumpster fire') || name.includes('dumpster')) {
    out.push(R(0,0,W,H,'#080610'));
    out.push(R(0,57,W,15,'#1A1208'));
    // Alley walls
    out.push(R(0,0,10,57,'#201A18')); out.push(R(38,0,10,57,'#201A18'));
    for (let y = 6; y < 54; y += 9) { out.push(R(1,y,6,1,'#302018')); out.push(R(4,y+4,5,1,'#302018')); }
    // Dumpster
    out.push(R(0,36,14,20,'#2A4838')); out.push(R(1,33,11,4,'#2A4838')); out.push(R(3,31,8,2,'#3A5848'));
    out.push(R(1,56,4,3,'#101010')); out.push(R(7,56,4,3,'#101010'));
    // Fire
    out.push(R(1,30,11,4,'#FF6010')); out.push(R(3,25,8,5,'#FF4010'));
    out.push(R(5,21,5,4,'#FF2010')); out.push(R(5,18,4,3,'#EE1010'));
    out.push(R(1,27,3,5,'#FFA020')); out.push(R(9,28,3,3,'#FFA020'));
    out.push(R(6,22,3,5,'#FFCC40')); out.push(R(6,16,2,3,'#FFEE80'));
    out.push(R(6,15,2,2,'#FFDD60'));
    // Stars
    out.push(R(16,1,1,1,'#FFFFFF')); out.push(R(24,4,1,1,'#FFFF80'));
    out.push(R(34,3,1,1,'#FFFFFF')); out.push(R(42,7,1,1,'#FFFFFF'));
    out.push(R(20,9,1,1,'#FFFFFF')); out.push(R(30,2,1,1,'#FFFF80'));
    return out;
  }
  if (name.includes('forest') || name.includes('nature') || name.includes('grove')) {
    out.push(R(0,0,W,H,'#183010')); out.push(R(0,54,W,18,'#102008'));
    out.push(R(1,21,8,33,'#204010')); out.push(R(0,12,10,12,'#30601A'));
    out.push(R(38,24,8,30,'#204010')); out.push(R(36,15,12,12,'#30601A'));
    out.push(R(13,57,3,3,'#308020')); out.push(R(30,55,3,5,'#308020'));
    return out;
  }
  if (name.includes('tavern') || name.includes('inn') || name.includes('bar')) {
    out.push(R(0,0,W,H,'#2A1808')); out.push(R(0,54,W,18,'#3A2010'));
    for (let x = 0; x < W; x += 12) out.push(R(x,57,11,15,'#3A2008'));
    out.push(R(3,7,9,6,'#5A3820')); out.push(R(4,9,6,3,'#C8A040'));
    out.push(R(36,6,8,9,'#5A3820'));
    return out;
  }
  if (name.includes('cave') || name.includes('dungeon') || name.includes('mine')) {
    out.push(R(0,0,W,H,'#060406')); out.push(R(0,54,W,18,'#100C0A'));
    out.push(R(7,0,3,8,'#181418')); out.push(R(18,0,5,5,'#181418'));
    out.push(R(33,0,3,9,'#181418'));
    out.push(R(0,0,5,54,'#100C10')); out.push(R(43,0,5,54,'#100C10'));
    return out;
  }
  if (name.includes('sky') || name.includes('cloud') || name.includes('heaven')) {
    out.push(R(0,0,W,H,'#4090D0')); out.push(R(0,42,W,30,'#A0D8F0'));
    out.push(R(3,6,12,5,'#F0F8FF')); out.push(R(1,7,15,5,'#F0F8FF'));
    out.push(R(30,12,15,5,'#F0F8FF')); out.push(R(28,13,18,5,'#F0F8FF'));
    return out;
  }
  out.push(R(0,0,W,H,'#12101C')); out.push(R(0,57,W,15,'#0C0A14'));
  return out;
}

function renderPet48(equipped: EquippedItems): El[] {
  const out: El[] = [];
  if (!equipped.pet) return out;
  const name = equipped.pet.name.toLowerCase();
  // Pets sit to the right, scaled for 48×72 canvas
  const px = 36, py = 45;

  if (name.includes('dragon') || name.includes('wyvern')) {
    out.push(R(px,py+1,7,6,'#508020')); out.push(R(px+6,py-3,6,6,'#508020'));
    out.push(R(px+10,py-1,2,2,'#FF4010')); out.push(R(px+4,py-1,3,4,'#508020'));
    out.push(R(px-1,py,3,3,'#406018')); out.push(R(px+6,py+6,2,6,'#508020'));
  } else if (name.includes('cat') || name.includes('kitten')) {
    out.push(R(px,py+3,8,5,'#D0A040')); out.push(R(px+1,py,6,5,'#D0A040'));
    out.push(R(px+1,py-1,2,2,'#D0A040')); out.push(R(px+6,py-1,2,2,'#D0A040'));
    out.push(R(px+3,py+2,2,2,'#303030')); out.push(R(px+6,py+2,2,2,'#303030'));
    out.push(R(px+8,py+4,6,2,'#D0A040')); out.push(R(px+12,py+3,2,2,'#D0A040'));
  } else if (name.includes('fox')) {
    out.push(R(px,py+3,8,5,'#C06020')); out.push(R(px+1,py,6,5,'#C06020'));
    out.push(R(px+3,py-1,2,2,'#C06020')); out.push(R(px+6,py-1,2,2,'#C06020'));
    out.push(R(px-2,py+1,4,4,'#F0F0F0')); out.push(R(px+3,py+2,2,2,'#303030'));
  } else {
    out.push(R(px,py+3,6,5,'#9060C0')); out.push(R(px+1,py,5,5,'#9060C0'));
    out.push(R(px+2,py+2,2,2,'#FFFFFF')); out.push(R(px+5,py+2,2,2,'#FFFFFF'));
    out.push(R(px+6,py+5,5,2,'#7040A0'));
  }
  return out;
}

function renderEffect48(equipped: EquippedItems): El[] {
  const out: El[] = [];
  if (!equipped.effect) return out;
  const name = equipped.effect.name.toLowerCase();
  if (name.includes('star') || name.includes('sparkle') || name.includes('glitter')) {
    out.push(R(6,6,3,3,'#FFD700',0.7)); out.push(R(39,10,3,3,'#FFD700',0.6));
    out.push(R(18,3,2,2,'#FFFFFF',0.9)); out.push(R(30,6,2,2,'#FFFFFF',0.7));
    out.push(R(10,15,2,2,'#FFD700',0.5));
  } else if (name.includes('fire') || name.includes('flame')) {
    out.push(R(7,22,3,8,'#FF6010',0.6)); out.push(R(37,22,3,8,'#FF6010',0.6));
    out.push(R(7,19,2,3,'#FF8020',0.5)); out.push(R(39,19,2,3,'#FF8020',0.5));
  } else if (name.includes('glow') || name.includes('aura') || name.includes('holy')) {
    out.push(R(9,4,30,60,'#FFFFFF',0.07));
  } else if (name.includes('shadow') || name.includes('dark')) {
    out.push(R(0,0,48,72,'#000000',0.25));
  }
  return out;
}

// ─── MASTER COMPOSITOR ────────────────────────────────────────────────────────

function renderWizardSprite(
  appearance: CharacterAppearance,
  equipped: EquippedItems,
  skinCol: string, sdarkCol: string,
  hairCol: string, eyeCol: string,
  outfitColor: string,
): El[] {
  const pal        = buildWizardPalette(skinCol, sdarkCol, hairCol, eyeCol, outfitColor);
  const facialHair = appearance.facialHair ?? 'none';
  const hairStyle  = appearance.hairStyle  ?? 'short';
  const hasGlasses = appearance.hasGlasses ?? false;
  const expression = appearance.expression ?? 'neutral';
  const ohName     = (equipped.off_hand?.name ?? '').toLowerCase();

  return [
    ...renderBackground48(equipped),                                         // 0. Background (48×72)
    ...renderGrid(WIZARD_CAPE_GRID,                                   pal),  // 1. Cape (behind all)
    ...renderGrid(WIZARD_BOOTS_GRID,                                  pal),  // 2. Boots
    ...renderGrid(WIZARD_SKIN_GRID,                                   pal),  // 3. Skin
    ...renderGrid(WIZARD_ROBE_GRID,                                   pal),  // 4. Robe
    ...renderGrid(buildWizardHairGrid(hairStyle),                     pal),  // 5. Hair
    ...renderGrid(buildWizardFaceGrid(facialHair, hasGlasses, expression), pal), // 6. Face
    ...renderGrid(buildWizardHeadLayer(equipped),                     pal),  // 7. Headgear (equipped or default hat)
    ...renderGrid(buildWizardMainHandGrid(equipped),                   pal),  // 8. Main-hand weapon (equipped or default staff)
    ...renderGrid(buildWizardOffHandGrid(ohName),                     pal),  // 9. Off-hand item
    ...renderPet48(equipped),                                                // 10. Pet (48×72)
    ...renderEffect48(equipped),                                             // 11. Effect overlay (48×72)
  ];
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export function PixelCharacter({ appearance = {}, equipped = {}, size = 192 }: PixelCharacterProps) {
  _k = 0;

  const species    = appearance.species   ?? 'human';
  const classId    = appearance.class     ?? 'fighter';
  const skinId     = appearance.skinTone;
  const hairId     = appearance.hairColor;
  const eyeId      = appearance.eyeColor;
  const hairStyle  = appearance.hairStyle  ?? 'short';
  const facialHair = appearance.facialHair ?? 'none';
  const hasGlasses = appearance.hasGlasses ?? false;
  const gender     = appearance.gender    ?? 'any';

  const b        = BODIES[species] ?? BODIES.human;
  const skinCol  = sk(skinId);
  const sdark    = skDark(skinId);
  const hairCol  = hc(hairId);
  const eyeCol   = ec(eyeId);

  const { outfit: outfitColor, legs: legColor } = getOutfitColors(equipped, classId);

  // Wizard class → upgraded 48×72 pixel-grid renderer (background/pet/effect included).
  // All other classes → original 32×48 renderer, unchanged.
  const isWizard = classId === 'wizard';

  if (isWizard) {
    // Approved AI-generated benchmark sprite (single composite image).
    // Layered modular assets will replace this composite in a follow-up.
    // Equipped background renders behind the sprite; pet/effect render in front.
    // Wearable equipment (headgear/weapons) is baked into the composite until
    // the layered asset set exists.
    const bgElements = renderBackground(equipped);
    const fgElements = [...renderPet(equipped), ...renderEffect(equipped)];
    const h = Math.round(size * 1.5);
    const overlaySvg = (els: El[], z: number) =>
      els.length === 0 ? null : (
        <svg
          width={size}
          height={h}
          viewBox="0 0 32 48"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          style={{ position: 'absolute', inset: 0, zIndex: z, imageRendering: 'pixelated' } as React.CSSProperties}
          shapeRendering="crispEdges"
        >
          {els}
        </svg>
      );
    return (
      <div
        style={{
          position: 'relative',
          width: size,
          height: h,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
        }}
      >
        {overlaySvg(bgElements, 0)}
        <img
          src={wizardAiSprite}
          alt="Wizard character"
          style={{
            position: 'relative',
            zIndex: 1,
            maxWidth: '100%',
            maxHeight: '100%',
            imageRendering: 'pixelated',
          } as React.CSSProperties}
        />
        {overlaySvg(fgElements, 2)}
      </div>
    );
  }

  // Non-wizard: original 32×48 renderer — background, body, hair, face, headgear, equipment, pet, effect
  const elements: El[] = [
    ...renderBackground(equipped),
    ...renderBody(b, skinCol, sdark, outfitColor, legColor, gender, classId),
    ...renderSpeciesFeatures(species, skinCol, sdark, b),
    ...renderHair(hairStyle, hairCol, b, species),
    ...renderFace(b, skinCol, sdark, eyeCol, hasGlasses, facialHair, hairCol),
    ...renderHeadgear(equipped, classId, b),
    ...renderEquipment(classId, equipped, b),
    ...renderPet(equipped),
    ...renderEffect(equipped),
  ];

  return (
    <svg
      width={size}
      height={Math.round(size * 1.5)}
      viewBox="0 0 32 48"
      xmlns="http://www.w3.org/2000/svg"
      style={{ imageRendering: 'pixelated' } as React.CSSProperties}
      shapeRendering="crispEdges"
    >
      {elements}
    </svg>
  );
}

export default PixelCharacter;
