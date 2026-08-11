---
name: CYOA pixel character v2
description: Architecture of the rewritten pixel-character.tsx — 32×48 SVG, 7 species, layered rendering, equipment-driven colors
---

## Canvas
- ViewBox: `0 0 32 48`, displayed via CSS `image-rendering: pixelated`
- Default display width: 192px (size prop); height = size × 1.5
- All drawing done with SVG `<rect>` elements; no paths or text

## Species body templates (BODIES map)
Each species has distinct proportions stored as a `Body` struct with absolute canvas coords:
- **Human** 43u tall, 16w torso (baseline)
- **Elf** 45u tall, 14w torso + integrated pointed ears
- **Dwarf** 34u tall, 20w torso (shortest + widest)
- **Gnome** 30u tall, 12w torso + large head (13h vs human 12h)
- **Halfling** 37u tall, 16w torso (shorter than human)
- **Orc** 43u tall, 24w torso + heavy brow + tusks
- **Goblin** 30u tall, 10w torso + giant bat ears

## Render layers (order matters)
1. Background (dumpster fire, forest, dungeon, etc.)
2. Body (feet → legs → arms → torso → neck → head base)
3. Species features (elf ears, orc tusks/brow, goblin ears+chin)
4. Hair
5. Face (eyes, nose, mouth, blush, facial hair, glasses)
6. Headgear (wizard hat, hood, ranger cap, knight helm, crown)
7. Weapons (main_hand right side, off_hand left side)
8. Pet (right side of canvas, y≈30)
9. Effect overlay

## Face rendering (cross-eyed fix)
- Each eye is 3px wide, pupil placed at center (eyeLX+1, eyeRX+1)
- Both pupils face same direction → not cross-eyed
- Eye white: 3×2; pupil: 1×2; shine: top-right of pupil

## Equipment drives visual appearance
- `getOutfitColors(equipped, classId)` → `{ outfit, legs }` hex colors
  - Checks item name keywords (traveler/leather/chain/plate/robe/etc.)
  - Falls back to class defaults when no outfit equipped
  - Traveler's Tunic → `#7A5230` (brown leather); class Fighter default → `#7A6850` (tan)
- Outfit color applied to: torso rect + arm sleeve (upper ~55% of arm height)
- Head items: wizard hat (tall tapered rects), hood, ranger cap, knight helm, crown
- Weapons: sword, staff+orb, dagger, axe, mace, bow (ranger left-hand)
- Off-hand: shield, orb, tome

## Dumpster Fire background
Renders full pixel-art alley scene: night sky, brick walls, green dumpster, orange/red flame rects, sparks, stars, scattered trash on ground.

## Key exports
`SKIN_TONES`, `HAIR_COLORS`, `EYE_COLORS`, `HAIR_STYLES`, `SPECIES_LIST`, `CLASSES_LIST`, `FACIAL_HAIR_OPTIONS`, `CharacterAppearance`, `EquippedItems`, `PixelCharacter`

**Why:** Previous version used 16×20 grid at small scale, leading to illegible sprites, cross-eyed face, and no equipment visual changes.

**How to apply:** Use at any size via `size` prop. Pass `equipped` with slot keys matching DB inventory slots. Background slot renders behind the character.
