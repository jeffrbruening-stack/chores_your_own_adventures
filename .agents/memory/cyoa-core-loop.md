---
name: CYOA core game loop implementation
description: Key decisions and gotchas from building the core CYOA game loop (character creation → quests → shop → equip)
---

# CYOA Core Game Loop

## DB schema additions (applied via ALTER TABLE, AND Drizzle schema updated)
- `characters` table: `configured BOOLEAN DEFAULT FALSE` — set to true only after the user completes character creation; used to gate the `/create-character` redirect in ProtectedRoute
- `shop_items` table: `is_starter BOOLEAN DEFAULT FALSE` — used to identify Traveler's Tunic for auto-grant on first character save

**Why:** Auth context checks `hasCharacter` (derived from `configured=true`) to route new users to create-character vs home.

## Auth context
- `toUserProfile(userId)` in `auth.ts` is async — joins characters table to return `hasCharacter: boolean`
- Frontend `auth-context.tsx` exposes `hasCharacter` and `refreshUser()` — call `refreshUser()` after character creation then navigate
- On register, no character is auto-created; `hasCharacter` starts false

## Character creation
- First save (no existing row) skips 7-day cooldown — just upserts and auto-grants/equips Traveler's Tunic
- Subsequent saves set `cooldownUntil` to now+7days
- Auto-grant: query shop_items where is_starter=true, insert into user_inventory, insert into equipped_items for slot 'outfit'

## PixelCharacter component
- Located at `artifacts/cyoa/src/components/pixel-character.tsx`
- Full-body layered SVG (16×20 grid, 3px/unit)
- Props: `appearance` (skinTone, hairStyle, hairColor, eyeColor, hasGlasses, facialHair, species, gender, class) and `equipped` (head, outfit, main_hand, off_hand, pet, background, effect, pet_accessory)
- Exports: `SKIN_TONES`, `HAIR_COLORS`, `EYE_COLORS`, `HAIR_STYLES`, `SPECIES_LIST`, `CLASSES_LIST`, `FACIAL_HAIR_OPTIONS`

## Shop
- `pages/shop.tsx` uses direct `fetch` (not generated hooks) — generated hooks had type mismatch since server returns flat array, not `{unlocked,owned,comingSoon}`
- Initial fetch uses `useEffect(() => { fetchItems(activeTab); }, [activeTab])` — NOT useState initializer
- Tabs: weapon, off_hand, outfit, head, pet, pet_accessory, background, effect

## Party screen limitation
- Party members endpoint returns only species + class, not full appearance — PixelCharacter renders with defaults
- Fix tracked as follow-up: join characters table in the members query

**How to apply:** When touching auth flow, character creation, or shop — check these patterns first before inventing new ones.
