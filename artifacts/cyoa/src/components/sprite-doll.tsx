/**
 * sprite-doll.tsx
 * Paper-doll character renderer backed by the GandalfHardcore sprite packs
 * (user-provided art — no generated/redrawn assets).
 *
 * Compositing technique (proven in /paperdoll-preview): every layer is a
 * pixel-aligned sprite sheet (80×64px cells); stacking = absolutely positioned
 * divs cropping the same cell via background-position, image-rendering: pixelated.
 * Idle frame = cell (0, 0).
 *
 * Layer order: skin → boots → legs → torso → equipped legs/outfit overrides →
 * hair → ears → mask → hat → back → hand.
 *
 * Purchased equipment (equippedSpriteKeys) currently only has male art seeded
 * (see scripts/seed.ts) — overrides are gated on body === 'male' so female
 * characters just keep their class-default look until female sprite keys
 * exist, rather than showing misaligned male-cut clothing.
 */

export const CELL_W = 80;
export const CELL_H = 64;

export type SpriteBody = 'male' | 'female';

export interface SpriteAppearance {
  body: SpriteBody;
  /** 'skin-1'..'skin-5' or a special skin: 'orc' | 'zombie' | 'demon' | 'devil' | 'ghost' */
  skin: string;
  /** hair file stem (e.g. 'male-hair-7', 'fancy-hair') or 'bald' */
  hair: string | null;
  /** 'elven-ears-1'..'elven-ears-5' or null for human ears */
  ears: string | null;
  /** mask file stem (e.g. 'male-plague-mask') or null */
  mask: string | null;
}

// ─── OPTION MANIFEST (files under public/paperdoll/gandalf/) ─────────────────

export const SKIN_OPTIONS = [
  { id: 'skin-1', label: 'Fair',   swatch: '#f0c8a0' },
  { id: 'skin-2', label: 'Light',  swatch: '#e0b088' },
  { id: 'skin-3', label: 'Tan',    swatch: '#c08858' },
  { id: 'skin-4', label: 'Brown',  swatch: '#905830' },
  { id: 'skin-5', label: 'Deep',   swatch: '#583018' },
];

export const SPECIAL_SKIN_OPTIONS = [
  { id: 'orc',    label: 'Orc',    swatch: '#4e8a3c' },
  { id: 'zombie', label: 'Zombie', swatch: '#7a9a6a' },
  { id: 'demon',  label: 'Demon',  swatch: '#8a3ca0' },
  { id: 'devil',  label: 'Devil',  swatch: '#b03030' },
  { id: 'ghost',  label: 'Ghost',  swatch: '#9ab0c8' },
];

const MALE_HAIR = [
  ...Array.from({ length: 30 }, (_, i) => `male-hair-${i + 1}`),
  'fancy-hair', 'queen-hair', 'shield-maiden-hair',
];
const FEMALE_HAIR = Array.from({ length: 35 }, (_, i) => `female-hair-${i + 1}`);

export function hairOptions(body: SpriteBody): string[] {
  return body === 'female' ? FEMALE_HAIR : MALE_HAIR;
}

export const EAR_OPTIONS = Array.from({ length: 5 }, (_, i) => `elven-ears-${i + 1}`);

export function maskOptions(body: SpriteBody): { id: string; label: string }[] {
  return body === 'female'
    ? [
        { id: 'female-mask',            label: 'Mask' },
        { id: 'female-plague-mask',     label: 'Plague Mask' },
        { id: 'female-blue-face-paint', label: 'Face Paint' },
      ]
    : [
        { id: 'male-mask',        label: 'Mask' },
        { id: 'male-plague-mask', label: 'Plague Mask' },
        { id: 'male-bandit-scarf',label: 'Bandit Scarf' },
      ];
}

// ─── LAYER RESOLUTION ────────────────────────────────────────────────────────

interface Layer {
  path: string;   // relative to paperdoll/gandalf/
  sheetW: number; // sheet pixel width (ears sheets are 720, everything else 800)
  sheetH: number;
}

const SHEET = (path: string, sheetW = 800, sheetH = 448): Layer => ({ path, sheetW, sheetH });

const SPECIAL_SKINS = new Set(SPECIAL_SKIN_OPTIONS.map(s => s.id));

function skinLayer(body: SpriteBody, skin: string): Layer {
  if (SPECIAL_SKINS.has(skin)) {
    return SHEET(`special-skins/${body}-${skin}-skin.png`);
  }
  const n = /^skin-([1-5])$/.exec(skin)?.[1] ?? '1';
  return SHEET(`skins/${body}-skin-${n}.png`);
}

/** Default base outfit so the doll never appears undressed (base pack items). */
function baseOutfitLayers(body: SpriteBody): Layer[] {
  return body === 'female'
    ? [SHEET('female-boots.png'), SHEET('female-skirt.png'), SHEET('female-corset.png')]
    : [SHEET('male-boots.png'), SHEET('male-pants.png'), SHEET('male-shirt.png')];
}

// ─── CLASS STARTER GEAR ──────────────────────────────────────────────────────
// Each class starts with an "appropriate" outfit + gear from the sprite packs.
// All paths relative to paperdoll/gandalf/. Cape sheets are 720px wide.

interface ClassGear {
  /** torso/legs/boots outfit layers (bottom→top), per body */
  outfit: { male: string[]; female: string[] };
  hat?: { male?: string; female?: string };
  mask?: { male?: string; female?: string };
  /** file name inside hand-items/<body>/ */
  hand?: string;
  /** file name inside back/ (capes are 720px wide) */
  back?: { male?: string; female?: string };
}

export const CLASS_GEAR: Record<string, ClassGear> = {
  fighter: {
    outfit: { male: ['boots', 'pants', 'chainmail'], female: ['boots', 'skirt', 'armored-corset'] },
    hat: { male: 'guard-helmet' },
    hand: 'iron-sword',
    back: { male: 'male-circle-shield', female: 'female-circle-shield' },
  },
  ranger: {
    outfit: { male: ['boots', 'green-pants', 'green-shirt-v-2'], female: ['boots', 'skirt', 'green-bodice-long-sleeves'] },
    hat: { male: 'male-green-cap', female: 'female-green-cap' },
    hand: 'wooden-axe',
    back: { male: 'small-backpack', female: 'small-backpack' },
  },
  wizard: {
    outfit: { male: ['shoes', 'purple-pants', 'purple-shirt-v-2'], female: ['boots', 'long-dress-purple'] },
    hat: { female: 'witch-hat' },
    hand: 'stick',
    back: { male: 'cape-purple', female: 'cape-purple' },
  },
  rogue: {
    outfit: { male: ['shoes', 'blue-pants', 'blue-shirt-v-2'], female: ['boots', 'short-skirt', 'blue-bodice'] },
    mask: { male: 'male-bandit-scarf', female: 'female-mask' },
    hand: 'bronze-sword',
  },
  cleric: {
    outfit: { male: ['boots', 'pants', 'shirt'], female: ['boots', 'skirt', 'corset-long-sleeves'] },
    hand: 'golden-sword',
    back: { male: 'male-lantern', female: 'female-lantern' },
  },
  barbarian: {
    outfit: { male: ['boots', 'pants'], female: ['boots', 'skirt', 'red-bodice'] },
    hat: { male: 'viking-helmet-with-horns' },
    hand: 'bronze-axe',
  },
};

const isCape = (name: string) => name.startsWith('cape-');

/** A shop item's spriteKey is already a full path relative to paperdoll/gandalf/ (e.g. "hats/male/male-green-cap.png") — capes and ear sheets are the pack's only 720px-wide exceptions. */
function sheetForSpriteKey(path: string): Layer {
  const narrow = /\/cape-[^/]+\.png$/.test(path) || path.startsWith('ears/');
  return SHEET(path, narrow ? 720 : 800);
}

/** Purchased-equipment overrides, keyed by the same slot strings equipped_items uses. Null/undefined = no override, class default (or nothing) shows instead. */
export interface EquippedSpriteKeys {
  head?: string | null;
  outfit?: string | null;
  legs?: string | null;
  main_hand?: string | null;
  back?: string | null;
}

/**
 * Compose the full layer stack.
 * Order: skin → boots → legs → torso → equipped legs/outfit overrides →
 * hair → ears → mask → hat → back → hand.
 * When a known class is given, its starter gear is the default outfit/hat/
 * hand/back; `equipped` overrides those per-slot when the kid has purchased
 * and equipped something (male-only art for now — see file header).
 */
export function spriteLayers(a: SpriteAppearance, charClass?: string | null, equipped?: EquippedSpriteKeys): Layer[] {
  const gear = charClass ? CLASS_GEAR[charClass] : undefined;
  const canEquip = a.body === 'male';
  const layers: Layer[] = [skinLayer(a.body, a.skin)];
  if (gear) {
    layers.push(...gear.outfit[a.body].map(f => SHEET(`clothing/${a.body}/${f}.png`)));
  } else {
    layers.push(...baseOutfitLayers(a.body));
  }
  // Legs/outfit(chest) don't have a single-file class override slot — the
  // class outfit above bundles boots+pants+chest as one array — so an
  // equipped item draws as an extra layer on top, covering just its region.
  if (canEquip && equipped?.legs) layers.push(sheetForSpriteKey(equipped.legs));
  if (canEquip && equipped?.outfit) layers.push(sheetForSpriteKey(equipped.outfit));

  if (a.hair && a.hair !== 'bald') layers.push(SHEET(`hair/${a.body}/${a.hair}.png`));
  if (a.ears) layers.push(SHEET(`ears/${a.body}/${a.ears}.png`, 720));
  const mask = a.mask ?? gear?.mask?.[a.body] ?? null;
  if (mask) layers.push(SHEET(`masks/${mask}.png`));

  const hat = canEquip && equipped?.head ? equipped.head : gear?.hat?.[a.body];
  if (hat) layers.push(canEquip && equipped?.head ? sheetForSpriteKey(hat) : SHEET(`hats/${a.body}/${hat}.png`));

  const back = canEquip && equipped?.back ? equipped.back : gear?.back?.[a.body];
  if (back) {
    layers.push(canEquip && equipped?.back
      ? sheetForSpriteKey(back)
      : SHEET(`back/${back}.png`, isCape(back) ? 720 : 800));
  }

  const hand = canEquip && equipped?.main_hand ? equipped.main_hand : gear?.hand;
  if (hand) layers.push(canEquip && equipped?.main_hand ? sheetForSpriteKey(hand) : SHEET(`hand-items/${a.body}/${hand}.png`));

  return layers;
}

// ─── LEGACY MIGRATION ────────────────────────────────────────────────────────

// Special skins (orc/zombie/etc.) are cut from the editor for now, so legacy
// fantasy tones map to the closest normal skin instead.
const LEGACY_SKIN_MAP: Record<string, string> = {
  'light': 'skin-1', 'light-medium': 'skin-2', 'medium': 'skin-3',
  'tan': 'skin-4', 'dark': 'skin-5', 'very-dark': 'skin-5',
  'fantasy-green': 'skin-3', 'fantasy-gray': 'skin-2', 'fantasy-purple': 'skin-3',
  'fantasy-red': 'skin-4', 'fantasy-blue': 'skin-1', 'fantasy-teal': 'skin-3',
  'fantasy-pink': 'skin-2',
};

const LEGACY_HAIR_INDEX: Record<string, number | null> = {
  bald: null, short: 1, medium: 2, long: 3, curly: 4, ponytail: 5, mohawk: 6,
};

/**
 * Build a SpriteAppearance from a character record.
 * Uses the new sprite* fields when present, otherwise derives sensible
 * defaults from the legacy appearance fields so existing characters
 * migrate gracefully without any data backfill.
 */
export function spriteFromCharacter(c?: {
  spriteBody?: string | null; spriteSkin?: string | null; spriteHair?: string | null;
  spriteEars?: string | null; spriteMask?: string | null;
  gender?: string | null; skinTone?: string | null; hairStyle?: string | null;
  species?: string | null;
} | null): SpriteAppearance {
  const body: SpriteBody =
    c?.spriteBody === 'female' || (!c?.spriteBody && c?.gender === 'feminine') ? 'female' : 'male';

  let skin = c?.spriteSkin ?? null;
  if (!skin) skin = LEGACY_SKIN_MAP[c?.skinTone ?? ''] ?? 'skin-3';

  let hair = c?.spriteHair !== undefined && c?.spriteHair !== null
    ? c.spriteHair
    : (() => {
        const idx = LEGACY_HAIR_INDEX[c?.hairStyle ?? 'short'];
        if (idx === null) return 'bald';
        return `${body}-hair-${idx ?? 1}`;
      })();
  if (hair === '') hair = 'bald';

  // Ears & masks are cut from the editor for now — render only if explicitly stored.
  const ears = c?.spriteEars ?? null;
  const mask = c?.spriteMask ?? null;
  return { body, skin, hair, ears, mask };
}

// ─── RENDERER ────────────────────────────────────────────────────────────────

const assetUrl = (rel: string) => `${import.meta.env.BASE_URL}paperdoll/gandalf/${rel}`;

interface SpriteDollProps {
  sprite: SpriteAppearance;
  /** Character class id — renders that class's starter gear (outfit, hat, weapon). */
  charClass?: string | null;
  /** Purchased equipment overrides — see EquippedSpriteKeys. */
  equipped?: EquippedSpriteKeys;
  /** Display width in px (height = width × 64/80). Default 120. */
  size?: number;
  /** Frame column/row in the sheet; (0,0) = idle. */
  col?: number;
  row?: number;
  className?: string;
  'data-testid'?: string;
}

export function SpriteDoll({ sprite, charClass, equipped, size = 120, col = 0, row = 0, className, ...rest }: SpriteDollProps) {
  const scale = size / CELL_W;
  const layers = spriteLayers(sprite, charClass, equipped);
  return (
    <div
      className={className}
      style={{ width: CELL_W * scale, height: CELL_H * scale, position: 'relative' }}
      data-testid={rest['data-testid'] ?? 'sprite-doll'}
    >
      {layers.map(layer => (
        <div
          key={layer.path}
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${assetUrl(layer.path)})`,
            backgroundPosition: `-${col * CELL_W * scale}px -${row * CELL_H * scale}px`,
            backgroundSize: `${layer.sheetW * scale}px ${layer.sheetH * scale}px`,
            imageRendering: 'pixelated',
          }}
        />
      ))}
    </div>
  );
}
