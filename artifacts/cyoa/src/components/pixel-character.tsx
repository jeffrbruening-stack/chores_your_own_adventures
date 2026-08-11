/**
 * PixelCharacter — layered pixel-art SVG sprite system
 * Character body: 16×20 "pixel" grid, each pixel = 3 SVG units
 * ViewBox extended to accommodate equipment overlays:
 *   left 8px for off-hand, top 7px for hats, right 10px for weapon+pet
 */

const P = 3; // SVG units per pixel

// ── PALETTES ──────────────────────────────────────────────────────────────────

export const SKIN_TONES = [
  { id: 'light',        label: 'Light',        color: '#FDDBB4' },
  { id: 'light-medium', label: 'Light Med',    color: '#F0C49A' },
  { id: 'medium',       label: 'Medium',       color: '#D4956A' },
  { id: 'tan',          label: 'Tan',          color: '#C07840' },
  { id: 'dark',         label: 'Dark',         color: '#8A4820' },
  { id: 'very-dark',    label: 'Very Dark',    color: '#4A2010' },
];

export const HAIR_COLORS = [
  { id: 'black',        label: 'Black',        color: '#201010' },
  { id: 'dark-brown',   label: 'Dark Brown',   color: '#3C2010' },
  { id: 'brown',        label: 'Brown',        color: '#6B3820' },
  { id: 'auburn',       label: 'Auburn',       color: '#8B3520' },
  { id: 'red',          label: 'Red',          color: '#C03018' },
  { id: 'blonde',       label: 'Blonde',       color: '#D8A840' },
  { id: 'light-blonde', label: 'Lt. Blonde',   color: '#F0D060' },
  { id: 'gray',         label: 'Gray',         color: '#989090' },
  { id: 'white',        label: 'White',        color: '#E8E8E0' },
];

export const EYE_COLORS = [
  { id: 'brown',  label: 'Brown',  color: '#6B3820' },
  { id: 'hazel',  label: 'Hazel',  color: '#8B6030' },
  { id: 'blue',   label: 'Blue',   color: '#2060A8' },
  { id: 'green',  label: 'Green',  color: '#306840' },
  { id: 'gray',   label: 'Gray',   color: '#607080' },
  { id: 'purple', label: 'Purple', color: '#5840A0' },
];

export const HAIR_STYLES = [
  { id: 'short', label: 'Short' },
  { id: 'long',  label: 'Long'  },
  { id: 'bun',   label: 'Bun'   },
  { id: 'curly', label: 'Curly' },
  { id: 'bald',  label: 'Bald'  },
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
  { id: 'none',     label: 'None'      },
  { id: 'mustache', label: 'Mustache'  },
  { id: 'beard',    label: 'Beard'     },
  { id: 'stubble',  label: 'Stubble'   },
];

// ── TYPES ─────────────────────────────────────────────────────────────────────

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
}

export interface EquippedItemRef {
  name: string;
  emoji?: string;
}

export interface EquippedItems {
  head?:          EquippedItemRef | null;
  outfit?:        EquippedItemRef | null;
  main_hand?:     EquippedItemRef | null;
  off_hand?:      EquippedItemRef | null;
  pet?:           EquippedItemRef | null;
  background?:    EquippedItemRef | null;
  effect?:        EquippedItemRef | null;
  pet_accessory?: EquippedItemRef | null;
}

interface PixelCharacterProps {
  appearance?: CharacterAppearance;
  equipped?: EquippedItems;
  size?: number;
  className?: string;
}

// ── COLOR HELPERS ─────────────────────────────────────────────────────────────

function skinColor(skinTone?: string, species?: string): string {
  if (species === 'orc')    return '#608840';
  if (species === 'goblin') return '#7A9830';
  const m: Record<string, string> = {
    'light': '#FDDBB4', 'light-medium': '#F0C49A', 'medium': '#D4956A',
    'tan': '#C07840',   'dark': '#8A4820',          'very-dark': '#4A2010',
  };
  return m[skinTone || 'medium'] ?? '#D4956A';
}

function skinDark(skinTone?: string, species?: string): string {
  const m: Record<string, string> = {
    '#FDDBB4': '#E8BF90', '#F0C49A': '#D8A878', '#D4956A': '#BA7848',
    '#C07840': '#A06028', '#8A4820': '#6A3010', '#4A2010': '#2A1008',
    '#608840': '#3A6018', '#7A9830': '#5A7820',
  };
  return m[skinColor(skinTone, species)] ?? '#C07040';
}

function hairColor(hc?: string): string {
  const m: Record<string, string> = {
    'black': '#201010',   'dark-brown': '#3C2010', 'brown': '#6B3820',
    'auburn': '#8B3520',  'red': '#C03018',        'blonde': '#D8A840',
    'light-blonde': '#F0D060', 'gray': '#989090',  'white': '#E8E8E0',
  };
  return m[hc || 'brown'] ?? '#6B3820';
}

function eyeColor(ec?: string): string {
  const m: Record<string, string> = {
    'brown': '#6B3820', 'hazel': '#8B6030', 'blue': '#2060A8',
    'green': '#306840', 'gray': '#607080',  'purple': '#5840A0',
  };
  return m[ec || 'brown'] ?? '#6B3820';
}

function outfitColors(name?: string): [string, string] {
  const m: Record<string, [string, string]> = {
    "Traveler's Tunic":          ['#8B6020', '#5A3C10'],
    "Apprentice Robes":          ['#4A3090', '#28185C'],
    "Ranger Gear":               ['#2D5C28', '#1A3A18'],
    "Fancy Adventurer Clothes":  ['#8B1A1A', '#601010'],
    "Knight Armor":              ['#7080A0', '#485068'],
    "Mage Robes":                ['#2C3090', '#181860'],
  };
  return m[name || ''] ?? ['#8B6020', '#5A3C10'];
}

// ── SVG RECT HELPER ───────────────────────────────────────────────────────────

let _k = 0;
function rk() { return `r${_k++}`; }

function R(x: number, y: number, w: number, h: number, fill: string) {
  if (w <= 0 || h <= 0) return null;
  return <rect key={rk()} x={x * P} y={y * P} width={w * P} height={h * P} fill={fill} />;
}

// ── BODY RENDERER ─────────────────────────────────────────────────────────────

function renderBody(ap: CharacterAppearance, outfitName?: string) {
  _k = 0;
  const sk  = skinColor(ap.skinTone, ap.species);
  const skD = skinDark(ap.skinTone, ap.species);
  const hc  = hairColor(ap.hairColor);
  const ec  = eyeColor(ap.eyeColor);
  const [outfit, outfitD] = outfitColors(outfitName);

  const PANTS  = '#2A3650';
  const PANTSB = '#1A2438'; // belt/seam
  const BOOT   = '#1A0A00';
  const MOUTH  = '#A04040';
  const EW     = '#F8F8F8'; // eye white
  const els    = [];

  // ─ HAIR ─
  const hs = ap.hairStyle || 'short';
  if (hs !== 'bald') {
    if (hs === 'bun') {
      els.push(R(5, -3, 6, 1, hc));
      els.push(R(4, -2, 8, 1, hc));
    }
    els.push(R(4, 0, 8, 1, hc)); // row 0 top
    els.push(R(3, 1, 10, 1, hc));
    els.push(R(3, 2, 10, 1, hc));
    if (hs === 'long') {
      els.push(R(3, 3, 1, 6, hc));   // left side
      els.push(R(12, 3, 1, 6, hc));  // right side
    }
    if (hs === 'curly') {
      els.push(R(2, 1, 1, 3, hc));
      els.push(R(13, 1, 1, 3, hc));
    }
  }

  // ─ FACE ─
  els.push(R(3, 3, 10, 1, sk)); // forehead

  // Eye row (row 4)
  els.push(R(3, 4, 1, 1, sk));  // skin left of eyes
  els.push(R(4, 4, 1, 1, EW));  // left white
  els.push(R(5, 4, 1, 1, ec));  // left iris
  els.push(R(6, 4, 4, 1, sk));  // between eyes
  els.push(R(10, 4, 1, 1, ec)); // right iris
  els.push(R(11, 4, 1, 1, EW)); // right white
  els.push(R(12, 4, 1, 1, sk)); // skin right of eyes

  els.push(R(3, 5, 10, 1, sk)); // mid face

  // Mouth row (row 6)
  els.push(R(3, 6, 3, 1, sk));  // left of mouth
  els.push(R(6, 6, 4, 1, MOUTH));
  els.push(R(10, 6, 3, 1, sk)); // right of mouth

  els.push(R(4, 7, 8, 1, sk));  // chin
  els.push(R(6, 8, 4, 1, sk));  // neck
  els.push(R(6, 9, 4, 1, sk));  // neck lower

  // ─ SPECIES EXTRAS ─
  if (ap.species === 'elf') {
    els.push(R(-1, 3, 1, 2, sk)); // pointed left ear
    els.push(R(16, 3, 1, 2, sk)); // pointed right ear
  }

  // ─ GLASSES ─
  if (ap.hasGlasses) {
    els.push(R(3, 4, 3, 1, '#404040')); // left frame
    els.push(R(10, 4, 3, 1, '#404040')); // right frame
    els.push(R(6, 4, 1, 1, '#505050'));  // bridge
  }

  // ─ FACIAL HAIR ─
  if (ap.facialHair === 'mustache') {
    els.push(R(6, 6, 4, 1, hc));
  } else if (ap.facialHair === 'beard') {
    els.push(R(5, 6, 6, 1, hc));
    els.push(R(4, 7, 8, 1, hc));
  } else if (ap.facialHair === 'stubble') {
    els.push(R(5, 7, 1, 1, skD));
    els.push(R(7, 7, 1, 1, skD));
    els.push(R(9, 7, 1, 1, skD));
    els.push(R(11, 7, 1, 1, skD));
  }

  // ─ OUTFIT / TORSO ─
  els.push(R(2, 10, 12, 4, outfit));    // torso rows 10-13
  els.push(R(3, 14, 10, 1, outfit));    // waist row 14
  els.push(R(2, 10, 1, 4, outfitD));   // left sleeve shade
  els.push(R(13, 10, 1, 4, outfitD));  // right sleeve shade
  els.push(R(7, 10, 2, 1, sk));         // collar skin peek

  // ─ PANTS ─
  els.push(R(3, 15, 10, 1, PANTS));     // upper legs
  els.push(R(7, 15, 2, 1, PANTSB));     // center seam
  els.push(R(3, 16, 4, 3, PANTS));      // left leg
  els.push(R(9, 16, 4, 3, PANTS));      // right leg

  // ─ BOOTS ─
  els.push(R(2, 19, 6, 1, BOOT));
  els.push(R(8, 19, 6, 1, BOOT));

  return els.filter(Boolean);
}

// ── HAT RENDERER ──────────────────────────────────────────────────────────────

function renderHat(hatName?: string) {
  if (!hatName) return [];
  _k = 1000;
  const els = [];
  const palettes: Record<string, [string, string]> = {
    "Adventurer Cap":           ['#8B4513', '#5A2C0A'],
    "Ridiculous Feathered Hat": ['#4A3080', '#28185C'],
    "Wizard Hat":               ['#2C3090', '#181860'],
    "Ranger Hood":              ['#2D5C28', '#1A3A18'],
    "Iron Helm":                ['#7080A0', '#485068'],
  };
  const [c1, c2] = palettes[hatName] ?? ['#6B4020', '#3C2010'];

  if (hatName === "Wizard Hat") {
    els.push(R(7, -6, 2, 1, c1));
    els.push(R(6, -5, 4, 1, c1));
    els.push(R(5, -4, 6, 1, c1));
    els.push(R(4, -3, 8, 1, c1));
    els.push(R(3, -2, 10, 1, c1));
    els.push(R(2, -1, 12, 1, c2)); // brim
    els.push(R(5, -2, 1, 1, '#D4A847')); // buckle
  } else if (hatName === "Ridiculous Feathered Hat") {
    els.push(R(12, -7, 1, 1, '#FCEA60')); // feather tip
    els.push(R(11, -6, 2, 1, '#E8C840'));
    els.push(R(11, -5, 2, 1, '#D4A847'));
    els.push(R(2, -3, 12, 1, c2)); // wide brim
    els.push(R(4, -4, 8, 1, c1));
    els.push(R(5, -5, 6, 1, c1));
  } else if (hatName === "Ranger Hood") {
    els.push(R(4, -3, 8, 1, c1));
    els.push(R(3, -2, 10, 1, c1));
    els.push(R(2, -1, 12, 1, c2));
    els.push(R(2, 0, 1, 3, c1));  // hood left drape
    els.push(R(13, 0, 1, 3, c1)); // hood right drape
  } else if (hatName === "Iron Helm") {
    els.push(R(4, -3, 8, 1, c1));
    els.push(R(2, -2, 12, 1, c1));
    els.push(R(2, -1, 12, 1, c2));
    els.push(R(4, -1, 8, 1, '#0A0808')); // visor slit
  } else if (hatName.toLowerCase().includes('crown')) {
    els.push(R(3, -2, 10, 1, '#D4A847'));
    els.push(R(4, -3, 2, 1, '#D4A847'));
    els.push(R(7, -3, 2, 1, '#D4A847'));
    els.push(R(10, -3, 2, 1, '#D4A847'));
    els.push(R(5, -4, 1, 1, '#FFD700'));
    els.push(R(8, -4, 1, 1, '#FFD700'));
    els.push(R(11, -4, 1, 1, '#FFD700'));
  } else {
    // Adventurer Cap / default
    els.push(R(3, -2, 10, 1, c1));
    els.push(R(2, -1, 12, 1, c2));
  }
  return els.filter(Boolean);
}

// ── MAIN HAND WEAPON (group at x = character right edge = 16 pixels) ──────────

function renderMainHand(weaponName?: string) {
  if (!weaponName) return [];
  _k = 2000;
  const els = [];

  if (weaponName.includes("Staff")) {
    els.push(R(1, 7, 2, 1, '#8050C0'));
    els.push(R(0, 8, 4, 1, '#A060E0'));
    els.push(R(1, 9, 2, 1, '#8050C0'));
    els.push(R(1, 10, 1, 9, '#6B3820'));
  } else if (weaponName.includes("Bow")) {
    els.push(R(2, 8, 1, 1, '#6B3820'));
    els.push(R(1, 9, 1, 1, '#6B3820'));
    els.push(R(0, 10, 1, 3, '#6B3820'));
    els.push(R(1, 13, 1, 1, '#6B3820'));
    els.push(R(2, 14, 1, 1, '#6B3820'));
    els.push(R(3, 8, 1, 7, '#D0C070')); // string
  } else if (weaponName.includes("Axe")) {
    els.push(R(0, 9, 4, 1, '#A0B0C0'));
    els.push(R(0, 10, 5, 1, '#B0C0D0'));
    els.push(R(0, 11, 4, 1, '#A0B0C0'));
    els.push(R(1, 12, 1, 7, '#6B3820'));
  } else if (weaponName.includes("Iron") || weaponName.includes("Battle")) {
    // Silver sword
    els.push(R(1, 9, 1, 6, '#A0B0C0'));
    els.push(R(0, 15, 3, 1, '#D4A847'));
    els.push(R(1, 16, 1, 2, '#606060'));
    els.push(R(0, 18, 2, 1, '#808080'));
  } else {
    // Default sword (wooden, tan blade)
    els.push(R(1, 9, 1, 6, '#A07840'));
    els.push(R(0, 15, 3, 1, '#D4A847'));
    els.push(R(1, 16, 1, 2, '#6B3820'));
    els.push(R(0, 18, 2, 1, '#3C1810'));
  }
  return els.filter(Boolean);
}

// ── OFF HAND (group at x = -8 pixels from char start) ────────────────────────

function renderOffHand(itemName?: string) {
  if (!itemName) return [];
  _k = 3000;
  const els = [];

  if (itemName.includes("Shield") || itemName.includes("Buckler")) {
    const sc = itemName.includes("Iron") ? '#7080A0' : '#A07040';
    const sd = itemName.includes("Iron") ? '#485068' : '#5A3010';
    // Shield shape (x=0..5, roughly centered in group)
    els.push(R(1, 10, 4, 1, sd));       // top edge
    els.push(R(0, 11, 6, 4, sc));       // body
    els.push(R(0, 11, 1, 4, sd));       // left border
    els.push(R(5, 11, 1, 4, sd));       // right border
    els.push(R(1, 15, 4, 1, sc));       // lower
    els.push(R(2, 16, 2, 1, sc));       // point
    els.push(R(2, 15, 1, 1, sd));       // point border
    // Cross emblem
    els.push(R(3, 11, 1, 4, '#D4A847'));
    els.push(R(1, 13, 4, 1, '#D4A847'));
  } else if (itemName.includes("Torch")) {
    els.push(R(2, 8, 2, 1, '#FFCC30'));   // flame tip
    els.push(R(1, 9, 4, 1, '#FF8820'));   // flame base
    els.push(R(2, 10, 2, 1, '#707060'));  // torch top
    els.push(R(2, 11, 2, 7, '#6B3820'));  // handle
  } else if (itemName.includes("Book") || itemName.includes("Spell")) {
    els.push(R(0, 9, 5, 1, '#D4A847'));
    els.push(R(0, 10, 5, 6, '#4A3090'));
    els.push(R(0, 16, 5, 1, '#D4A847'));
    els.push(R(1, 10, 1, 6, '#28185C'));   // spine
    els.push(R(2, 11, 3, 1, '#E8E0C0'));
    els.push(R(2, 13, 3, 1, '#E8E0C0'));
    els.push(R(2, 15, 3, 1, '#E8E0C0'));
  } else {
    // Generic small buckler
    els.push(R(1, 10, 4, 1, '#A07040'));
    els.push(R(0, 11, 5, 4, '#A07040'));
    els.push(R(1, 15, 3, 1, '#A07040'));
    els.push(R(2, 16, 1, 1, '#A07040'));
  }
  return els.filter(Boolean);
}

// ── PET (group at x = 18 pixels from char start) ─────────────────────────────

function renderPet(petName?: string) {
  if (!petName) return [];
  _k = 4000;
  const els = [];

  if (petName.includes("Egg")) {
    els.push(R(1, 13, 4, 1, '#F0E8C0'));
    els.push(R(0, 14, 5, 4, '#F0E8C0'));
    els.push(R(1, 18, 4, 1, '#F0E8C0'));
    els.push(R(2, 15, 1, 1, '#D0C8A0'));
    els.push(R(2, 16, 2, 1, '#D0C8A0'));
    return els.filter(Boolean);
  }
  if (petName.includes("Phoenix")) {
    els.push(R(1, 12, 3, 1, '#FF8020'));
    els.push(R(0, 13, 5, 1, '#FF6010'));
    els.push(R(1, 14, 3, 2, '#FF4000'));
    els.push(R(0, 16, 5, 1, '#FF8020'));
    els.push(R(2, 12, 1, 1, '#FFD700'));
    return els.filter(Boolean);
  }

  if (petName.includes("Puppy") || petName.includes("Dog")) {
    const bc = petName.includes("Black")   ? '#201818' :
               petName.includes("Spotted") ? '#C8A040' : '#A06830';
    const nose = '#2A1010';
    els.push(R(0, 13, 2, 1, bc));   // left ear
    els.push(R(4, 13, 2, 1, bc));   // right ear
    els.push(R(0, 14, 6, 3, bc));   // head
    els.push(R(1, 15, 1, 1, nose)); // left eye
    els.push(R(4, 15, 1, 1, nose)); // right eye
    els.push(R(2, 16, 2, 1, nose)); // nose
    if (petName.includes("Spotted")) {
      els.push(R(3, 14, 2, 1, '#201818')); // spot
    }
    els.push(R(0, 17, 6, 2, bc));   // body
    els.push(R(0, 19, 2, 1, bc));   // left leg
    els.push(R(4, 19, 2, 1, bc));   // right leg
    els.push(R(6, 15, 1, 3, bc));   // tail
    els.push(R(7, 14, 1, 1, bc));   // tail curl
  } else if (petName.includes("Cat")) {
    const cc = '#D4781A';
    els.push(R(0, 12, 1, 2, cc));   // left ear
    els.push(R(5, 12, 1, 2, cc));   // right ear
    els.push(R(0, 14, 6, 3, cc));   // head
    els.push(R(1, 15, 1, 1, '#20A020')); // left eye (green)
    els.push(R(4, 15, 1, 1, '#20A020')); // right eye
    els.push(R(2, 16, 2, 1, '#C03050')); // nose
    els.push(R(0, 17, 6, 3, cc));   // body
    els.push(R(0, 19, 2, 1, cc));   // legs
    els.push(R(4, 19, 2, 1, cc));
    els.push(R(6, 14, 1, 4, cc));   // tail
    els.push(R(7, 13, 1, 2, cc));   // tail curl
  } else {
    // Generic creature
    els.push(R(1, 13, 4, 1, '#808040'));
    els.push(R(0, 14, 5, 4, '#808040'));
    els.push(R(1, 18, 4, 1, '#808040'));
  }
  return els.filter(Boolean);
}

// ── BACKGROUND COLOR ──────────────────────────────────────────────────────────

function bgColor(bgName?: string): string | null {
  if (!bgName) return null;
  const m: Record<string, string> = {
    'Village':   '#D4A847', 'Forest': '#2D5C28', 'Castle':  '#607080',
    'Dungeon':   '#2A1840', 'Campfire': '#8B3020',
  };
  return m[bgName] ?? null;
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────

export function PixelCharacter({
  appearance = {},
  equipped = {},
  size = 120,
  className,
}: PixelCharacterProps) {
  const outfitName = equipped.outfit?.name;
  const bg = bgColor(equipped.background?.name);

  // ViewBox: left 8px, top 7px, right 10px, bottom 2px buffer around 16×20 body
  const VB_W = 34; // total pixel width  (8 + 16 + 10)
  const VB_H = 29; // total pixel height (7 + 20 + 2)
  const VB = `-24 -21 ${VB_W * P} ${VB_H * P}`;
  const aspectRatio = VB_W / VB_H;

  return (
    <div
      className={className}
      style={{ width: size, height: Math.round(size / aspectRatio), display: 'inline-block' }}
    >
      <svg
        viewBox={VB}
        width="100%"
        height="100%"
        style={{ shapeRendering: 'crispEdges', imageRendering: 'pixelated' }}
        aria-hidden="true"
      >
        {/* Background wash */}
        {bg && (
          <rect x={-24} y={-21} width={VB_W * P} height={VB_H * P} fill={bg} opacity={0.25} />
        )}

        {/* Off-hand (left side, group at -8 pixels from char x=0) */}
        {equipped.off_hand?.name && (
          <g transform={`translate(${-8 * P}, 0)`}>
            {renderOffHand(equipped.off_hand.name)}
          </g>
        )}

        {/* Character body */}
        {renderBody(appearance, outfitName)}

        {/* Hat (above head, rendered on top of hair) */}
        {renderHat(equipped.head?.name)}

        {/* Main hand weapon (right of character) */}
        {equipped.main_hand?.name && (
          <g transform={`translate(${16 * P}, 0)`}>
            {renderMainHand(equipped.main_hand.name)}
          </g>
        )}

        {/* Pet (lower-right of character) */}
        {equipped.pet?.name && (
          <g transform={`translate(${18 * P}, 0)`}>
            {renderPet(equipped.pet.name)}
          </g>
        )}

        {/* Sparkle effect */}
        {equipped.effect?.name?.includes('Sparkle') && (
          <g style={{ fontSize: 8, opacity: 0.7 }}>
            {[[-20, -8], [52, -4], [56, 38], [46, 62], [-14, 50]].map(([ex, ey], i) => (
              <text key={i} x={ex} y={ey}>✦</text>
            ))}
          </g>
        )}
        {equipped.effect?.name?.includes('Flower') && (
          <g style={{ fontSize: 8, opacity: 0.8 }}>
            {[[-22, 0], [50, 10], [48, 55], [-18, 45]].map(([ex, ey], i) => (
              <text key={i} x={ex} y={ey}>✿</text>
            ))}
          </g>
        )}
      </svg>
    </div>
  );
}

export default PixelCharacter;
