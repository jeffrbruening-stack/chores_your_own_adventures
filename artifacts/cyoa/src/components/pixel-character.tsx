/**
 * pixel-character.tsx
 * 16-bit chibi RPG character renderer — 32×48 SVG canvas.
 * Displayed crisp via image-rendering: pixelated at chosen size.
 */
import React from 'react';

// ─── SPRITE IMPORTS (one per species × class) ────────────────────────────────
import sprite_human_fighter   from '../assets/sprites/sprite_human_fighter.png';
import sprite_human_ranger    from '../assets/sprites/sprite_human_ranger.png';
import sprite_human_wizard    from '../assets/sprites/sprite_human_wizard.png';
import sprite_human_rogue     from '../assets/sprites/sprite_human_rogue.png';
import sprite_human_cleric    from '../assets/sprites/sprite_human_cleric.png';
import sprite_human_barbarian from '../assets/sprites/sprite_human_barbarian.png';

import sprite_human_fighter_female   from '../assets/sprites/sprite_human_fighter_female.png';
import sprite_human_ranger_female    from '../assets/sprites/sprite_human_ranger_female.png';
import sprite_human_wizard_female    from '../assets/sprites/sprite_human_wizard_female.png';
import sprite_human_rogue_female     from '../assets/sprites/sprite_human_rogue_female.png';
import sprite_human_cleric_female    from '../assets/sprites/sprite_human_cleric_female.png';
import sprite_human_barbarian_female from '../assets/sprites/sprite_human_barbarian_female.png';

import sprite_elf_fighter   from '../assets/sprites/sprite_elf_fighter.png';
import sprite_elf_ranger    from '../assets/sprites/sprite_elf_ranger.png';
import sprite_elf_wizard    from '../assets/sprites/sprite_elf_wizard.png';
import sprite_elf_rogue     from '../assets/sprites/sprite_elf_rogue.png';
import sprite_elf_cleric    from '../assets/sprites/sprite_elf_cleric.png';
import sprite_elf_barbarian from '../assets/sprites/sprite_elf_barbarian.png';

import sprite_dwarf_fighter   from '../assets/sprites/sprite_dwarf_fighter.png';
import sprite_dwarf_ranger    from '../assets/sprites/sprite_dwarf_ranger.png';
import sprite_dwarf_wizard    from '../assets/sprites/sprite_dwarf_wizard.png';
import sprite_dwarf_rogue     from '../assets/sprites/sprite_dwarf_rogue.png';
import sprite_dwarf_cleric    from '../assets/sprites/sprite_dwarf_cleric.png';
import sprite_dwarf_barbarian from '../assets/sprites/sprite_dwarf_barbarian.png';

import sprite_gnome_fighter   from '../assets/sprites/sprite_gnome_fighter.png';
import sprite_gnome_ranger    from '../assets/sprites/sprite_gnome_ranger.png';
import sprite_gnome_wizard    from '../assets/sprites/sprite_gnome_wizard.png';
import sprite_gnome_rogue     from '../assets/sprites/sprite_gnome_rogue.png';
import sprite_gnome_cleric    from '../assets/sprites/sprite_gnome_cleric.png';
import sprite_gnome_barbarian from '../assets/sprites/sprite_gnome_barbarian.png';

import sprite_halfling_fighter   from '../assets/sprites/sprite_halfling_fighter.png';
import sprite_halfling_ranger    from '../assets/sprites/sprite_halfling_ranger.png';
import sprite_halfling_wizard    from '../assets/sprites/sprite_halfling_wizard.png';
import sprite_halfling_rogue     from '../assets/sprites/sprite_halfling_rogue.png';
import sprite_halfling_cleric    from '../assets/sprites/sprite_halfling_cleric.png';
import sprite_halfling_barbarian from '../assets/sprites/sprite_halfling_barbarian.png';

import sprite_orc_fighter   from '../assets/sprites/sprite_orc_fighter.png';
import sprite_orc_ranger    from '../assets/sprites/sprite_orc_ranger.png';
import sprite_orc_wizard    from '../assets/sprites/sprite_orc_wizard.png';
import sprite_orc_rogue     from '../assets/sprites/sprite_orc_rogue.png';
import sprite_orc_cleric    from '../assets/sprites/sprite_orc_cleric.png';
import sprite_orc_barbarian from '../assets/sprites/sprite_orc_barbarian.png';

import sprite_goblin_fighter   from '../assets/sprites/sprite_goblin_fighter.png';
import sprite_goblin_ranger    from '../assets/sprites/sprite_goblin_ranger.png';
import sprite_goblin_wizard    from '../assets/sprites/sprite_goblin_wizard.png';
import sprite_goblin_rogue     from '../assets/sprites/sprite_goblin_rogue.png';
import sprite_goblin_cleric    from '../assets/sprites/sprite_goblin_cleric.png';
import sprite_goblin_barbarian from '../assets/sprites/sprite_goblin_barbarian.png';

const SPRITES: Record<string, string> = {
  human_fighter: sprite_human_fighter,   human_ranger: sprite_human_ranger,
  human_wizard:  sprite_human_wizard,    human_rogue:  sprite_human_rogue,
  human_cleric:  sprite_human_cleric,    human_barbarian: sprite_human_barbarian,

  human_fighter_female: sprite_human_fighter_female,   human_ranger_female: sprite_human_ranger_female,
  human_wizard_female:  sprite_human_wizard_female,    human_rogue_female:  sprite_human_rogue_female,
  human_cleric_female:  sprite_human_cleric_female,    human_barbarian_female: sprite_human_barbarian_female,

  elf_fighter: sprite_elf_fighter,   elf_ranger: sprite_elf_ranger,
  elf_wizard:  sprite_elf_wizard,    elf_rogue:  sprite_elf_rogue,
  elf_cleric:  sprite_elf_cleric,    elf_barbarian: sprite_elf_barbarian,

  dwarf_fighter: sprite_dwarf_fighter,   dwarf_ranger: sprite_dwarf_ranger,
  dwarf_wizard:  sprite_dwarf_wizard,    dwarf_rogue:  sprite_dwarf_rogue,
  dwarf_cleric:  sprite_dwarf_cleric,    dwarf_barbarian: sprite_dwarf_barbarian,

  gnome_fighter: sprite_gnome_fighter,   gnome_ranger: sprite_gnome_ranger,
  gnome_wizard:  sprite_gnome_wizard,    gnome_rogue:  sprite_gnome_rogue,
  gnome_cleric:  sprite_gnome_cleric,    gnome_barbarian: sprite_gnome_barbarian,

  halfling_fighter: sprite_halfling_fighter,   halfling_ranger: sprite_halfling_ranger,
  halfling_wizard:  sprite_halfling_wizard,    halfling_rogue:  sprite_halfling_rogue,
  halfling_cleric:  sprite_halfling_cleric,    halfling_barbarian: sprite_halfling_barbarian,

  orc_fighter: sprite_orc_fighter,   orc_ranger: sprite_orc_ranger,
  orc_wizard:  sprite_orc_wizard,    orc_rogue:  sprite_orc_rogue,
  orc_cleric:  sprite_orc_cleric,    orc_barbarian: sprite_orc_barbarian,

  goblin_fighter: sprite_goblin_fighter,   goblin_ranger: sprite_goblin_ranger,
  goblin_wizard:  sprite_goblin_wizard,    goblin_rogue:  sprite_goblin_rogue,
  goblin_cleric:  sprite_goblin_cleric,    goblin_barbarian: sprite_goblin_barbarian,
};

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

  // All classes & species → AI-generated sprite renderer.
  // Background renders behind via SVG; pet/effect render in front via SVG.
  // Wearable equipment (headgear/weapons) is baked into the composite sprites
  // until the layered asset set is built in a follow-up task.
  // Feminine characters get the female sprite variant when one exists;
  // falls back to the base sprite for species/classes without one.
  const spriteKey = `${species}_${classId}`;
  const spriteSrc = (gender === 'feminine' && SPRITES[`${spriteKey}_female`]) || SPRITES[spriteKey];

  if (spriteSrc) {
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
          src={spriteSrc}
          alt={`${species} ${classId} character`}
          style={{
            position: 'relative',
            zIndex: 1,
            maxWidth: '100%',
            maxHeight: '100%',
            imageRendering: 'pixelated',
            objectFit: 'contain',
          } as React.CSSProperties}
        />
        {overlaySvg(fgElements, 2)}
      </div>
    );
  }

  // Fallback: original 32×48 SVG renderer (no sprite found)
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
