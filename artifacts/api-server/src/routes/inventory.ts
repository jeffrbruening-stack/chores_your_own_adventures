import { Router } from "express";
import { db } from "@workspace/db";
import {
  shopItemsTable, userInventoryTable, equippedItemsTable,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router = Router();

// GET /api/inventory
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const inventory = await db.select({
      id: userInventoryTable.id,
      shopItemId: userInventoryTable.shopItemId,
      purchasedAt: userInventoryTable.purchasedAt,
      name: shopItemsTable.name,
      category: shopItemsTable.category,
      emoji: shopItemsTable.emoji,
      spriteKey: shopItemsTable.spriteKey,
      isEvolvingPet: shopItemsTable.isEvolvingPet,
      evolutionStages: shopItemsTable.evolutionStages,
    }).from(userInventoryTable)
      .innerJoin(shopItemsTable, eq(shopItemsTable.id, userInventoryTable.shopItemId))
      .where(eq(userInventoryTable.userId, userId));

    const equipped = await db.select().from(equippedItemsTable)
      .where(eq(equippedItemsTable.userId, userId));
    const equippedMap = Object.fromEntries(equipped.map(e => [e.slot, e.shopItemId]));

    res.json({ items: inventory, equipped: equippedMap });
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

// Allowed slots per item category.
// NOTE: also duplicated in artifacts/cyoa/src/pages/shop.tsx as CAT_TO_SLOT —
// keep both in sync when adding a category.
const CATEGORY_SLOTS: Record<string, string> = {
  weapon: 'main_hand',
  offhand: 'off_hand',
  outfit: 'outfit',
  head: 'head',
  legs: 'legs',
  back: 'back',
  pet: 'pet',
  pet_accessory: 'pet_accessory',
  background: 'background',
  effect: 'effect',
};

// POST /api/inventory/equip
router.post("/equip", requireAuth, async (req, res) => {
  try {
    const { shopItemId, slot } = req.body;
    const userId = req.userId!;
    // Verify owned and validate slot/category match
    const [owned] = await db.select({
      id: userInventoryTable.id,
      category: shopItemsTable.category,
    }).from(userInventoryTable)
      .innerJoin(shopItemsTable, eq(shopItemsTable.id, userInventoryTable.shopItemId))
      .where(and(eq(userInventoryTable.userId, userId), eq(userInventoryTable.shopItemId, shopItemId))).limit(1);
    if (!owned) { res.status(403).json({ error: "Item not owned" }); return; }
    const expectedSlot = CATEGORY_SLOTS[owned.category];
    if (!expectedSlot || expectedSlot !== slot) {
      res.status(400).json({ error: `Item category '${owned.category}' must be equipped in slot '${expectedSlot ?? owned.category}'` }); return;
    }
    // Upsert equipped slot
    const [existing] = await db.select().from(equippedItemsTable)
      .where(and(eq(equippedItemsTable.userId, userId), eq(equippedItemsTable.slot, slot))).limit(1);
    if (existing) {
      await db.update(equippedItemsTable).set({ shopItemId, equippedAt: new Date() })
        .where(eq(equippedItemsTable.id, existing.id));
    } else {
      await db.insert(equippedItemsTable).values({ userId, slot, shopItemId });
    }
    res.json({ message: "Equipped", slot, shopItemId });
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

// DELETE /api/inventory/equip/:slot
router.delete("/equip/:slot", requireAuth, async (req, res) => {
  try {
    const slot = String(req.params.slot);
    await db.delete(equippedItemsTable)
      .where(and(eq(equippedItemsTable.userId, req.userId!), eq(equippedItemsTable.slot, slot)));
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

export default router;
