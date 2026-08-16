/**
 * compositor.ts — turns (appearance, equipped) into an ordered stack of
 * layers to draw. Pure function, no rendering: AvatarCanvas decides *how*
 * to paint a layer, this only decides *which* layers and *what order*.
 *
 * Z-order bottom → top: cloak (back) → body → legs → chest (body slot) →
 * weapon → hair → headgear. If a head item is equipped, hair is skipped
 * (helmet/hood hides hair).
 */
import { bodySpriteFor, HAIR, EQUIPMENT_SPRITES, type Sprite } from './sprites';
import { hairPalette, resolvePalette, type Role } from './palette';
import { SHOP_ITEMS, type Slot, type ShopItem } from './items';

export interface Appearance {
  skinTone: string;
  /** key into HAIR */
  hairStyle: string;
  hairColor: string;
}

/** slot → equipped item id */
export type Equipped = Partial<Record<Slot, string>>;

export interface RenderLayer {
  sprite: Sprite;
  palette: Record<Role, string>;
}

function itemById(id?: string): ShopItem | undefined {
  return id ? SHOP_ITEMS.find(i => i.id === id) : undefined;
}

export function composeLayers(appearance: Appearance, equipped: Equipped): RenderLayer[] {
  const layers: RenderLayer[] = [];
  // Equipment sprites carry no recolor, so a shared resolved palette (hair
  // color only, at this point) is all any layer needs.
  const palette = resolvePalette(hairPalette(appearance.hairColor));

  const back = itemById(equipped.back);
  if (back) layers.push({ sprite: EQUIPMENT_SPRITES[back.spriteKey], palette });

  layers.push({ sprite: bodySpriteFor(appearance.skinTone), palette });

  const legs = itemById(equipped.legs);
  if (legs) layers.push({ sprite: EQUIPMENT_SPRITES[legs.spriteKey], palette });

  const chest = itemById(equipped.body);
  if (chest) layers.push({ sprite: EQUIPMENT_SPRITES[chest.spriteKey], palette });

  const weapon = itemById(equipped.weapon);
  if (weapon) layers.push({ sprite: EQUIPMENT_SPRITES[weapon.spriteKey], palette });

  const head = itemById(equipped.head);
  if (!head) {
    const hair = HAIR[appearance.hairStyle];
    if (hair) layers.push({ sprite: hair, palette });
  } else {
    layers.push({ sprite: EQUIPMENT_SPRITES[head.spriteKey], palette });
  }

  return layers;
}
