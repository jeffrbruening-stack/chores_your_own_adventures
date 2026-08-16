/**
 * items.ts — the shop catalog.
 *
 * Kid-safety: every field here is a fixed enum value or a designer-picked
 * price. Nothing here is ever free text, and nothing here ever reaches a
 * generator — it's just data.
 *
 * Each item's spriteKey points at a real pre-made file in the Gandalf pack
 * (see sprites.ts EQUIPMENT_SPRITES) — "variants" here are different files
 * (wooden/iron/golden sword) rather than a runtime recolor, since that's how
 * this asset pack actually ships its tiers.
 */

export type Slot = 'head' | 'body' | 'legs' | 'back' | 'weapon';

export interface ShopItem {
  id: string;
  name: string;
  slot: Slot;
  price: number;
  /** Key into EQUIPMENT_SPRITES */
  spriteKey: string;
}

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'cap-green',      name: 'Green Cap',       slot: 'head', price: 15,  spriteKey: 'cap-green' },
  { id: 'helmet-guard',   name: 'Guard Helmet',    slot: 'head', price: 55,  spriteKey: 'helmet-guard' },
  { id: 'helmet-viking',  name: 'Viking Helmet',   slot: 'head', price: 90,  spriteKey: 'helmet-viking' },

  { id: 'shirt-plain',    name: 'Plain Shirt',     slot: 'body', price: 15, spriteKey: 'shirt' },
  { id: 'chainmail',      name: 'Chainmail',       slot: 'body', price: 70, spriteKey: 'chainmail' },

  { id: 'pants-plain',    name: 'Plain Pants',     slot: 'legs', price: 15, spriteKey: 'pants' },
  { id: 'pants-green',    name: 'Green Pants',     slot: 'legs', price: 30, spriteKey: 'pants-green' },

  { id: 'backpack-small', name: 'Small Backpack',  slot: 'back', price: 15,  spriteKey: 'backpack-small' },
  { id: 'cape-green',     name: 'Green Cape',       slot: 'back', price: 45, spriteKey: 'cape-green' },

  { id: 'sword-wood',     name: 'Wooden Sword',    slot: 'weapon', price: 15,  spriteKey: 'sword-wood' },
  { id: 'sword-iron',     name: 'Iron Sword',      slot: 'weapon', price: 50,  spriteKey: 'sword-iron' },
  { id: 'sword-gold',     name: 'Golden Sword',    slot: 'weapon', price: 120, spriteKey: 'sword-gold' },
];

export const SLOTS: { id: Slot; label: string }[] = [
  { id: 'head',   label: 'Head' },
  { id: 'body',   label: 'Body' },
  { id: 'legs',   label: 'Legs' },
  { id: 'back',   label: 'Back' },
  { id: 'weapon', label: 'Weapon' },
];
