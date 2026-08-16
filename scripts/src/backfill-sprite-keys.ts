/**
 * backfill-sprite-keys.ts — non-destructive alternative to seed.ts's shop
 * items block for a database that may already have real purchases in it.
 *
 * - Existing items are matched by name and UPDATEd to add spriteKey only
 *   (no truncate, no id changes, nothing else touched).
 * - New legs/back items are INSERTed only if a row with that name doesn't
 *   already exist.
 *
 * Safe to run more than once. Requires DATABASE_URL in the environment.
 * Run from repo root: pnpm --filter scripts exec tsx src/backfill-sprite-keys.ts
 */
import { db } from "@workspace/db";
import { shopItemsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

// name → spriteKey, for items that already exist in shop_items (see scripts/seed.ts)
const spriteKeyByName: Record<string, string> = {
  "Wooden Sword": "hand-items/male/wooden-sword.png",
  "Steel Longsword": "hand-items/male/iron-sword.png",
  "Legendary Excalibur": "hand-items/male/golden-sword.png",
  "Adventurer's Tunic": "clothing/male/shirt.png",
  "Knight's Plate Armor": "clothing/male/chainmail.png",
  "Adventurer's Hat": "hats/male/male-hat-1.png",
  "Ranger's Hood": "hats/male/male-green-cap.png",
};

// Brand-new items for the new legs/back categories.
const newItems = [
  { name: "Traveler's Pants", category: "legs" as const, description: "Sturdy and road-worn", goldPrice: 40, minLevel: 1, emoji: "👖", spriteKey: "clothing/male/pants.png" },
  { name: "Ranger's Leggings", category: "legs" as const, description: "Quiet in the underbrush", goldPrice: 90, minLevel: 3, emoji: "🍃", spriteKey: "clothing/male/green-pants.png" },
  { name: "Adventurer's Backpack", category: "back" as const, description: "Room for all your loot", goldPrice: 50, minLevel: 1, emoji: "🎒", spriteKey: "back/small-backpack.png" },
  { name: "Traveler's Cape", category: "back" as const, description: "Billows dramatically in the wind", goldPrice: 130, minLevel: 4, emoji: "🧣", spriteKey: "back/cape-green.png" },
];

async function backfill() {
  console.log("Backfilling sprite keys (non-destructive)...");

  let updated = 0;
  for (const [name, spriteKey] of Object.entries(spriteKeyByName)) {
    const result = await db.update(shopItemsTable)
      .set({ spriteKey })
      .where(eq(shopItemsTable.name, name));
    if ((result as any).rowCount > 0) updated++;
  }
  console.log(`Updated spriteKey on ${updated}/${Object.keys(spriteKeyByName).length} existing items (0 rowCount = name not found, check spelling against your DB)`);

  let inserted = 0;
  for (const item of newItems) {
    const [existing] = await db.select({ id: shopItemsTable.id }).from(shopItemsTable)
      .where(eq(shopItemsTable.name, item.name)).limit(1);
    if (existing) continue;
    await db.insert(shopItemsTable).values(item);
    inserted++;
  }
  console.log(`Inserted ${inserted}/${newItems.length} new legs/back items (skipped ones that already exist)`);

  console.log("Backfill complete.");
  process.exit(0);
}

backfill().catch(e => {
  console.error("Backfill failed:", e);
  process.exit(1);
});
