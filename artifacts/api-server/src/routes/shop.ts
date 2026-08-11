import { Router } from "express";
import { db } from "@workspace/db";
import {
  shopItemsTable, userInventoryTable, equippedItemsTable, usersTable,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router = Router();

// GET /api/shop?category=
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { category } = req.query;
    const [user] = await db.select({ currentLevel: usersTable.currentLevel, personalGold: usersTable.personalGold })
      .from(usersTable).where(eq(usersTable.id, userId)).limit(1);

    const ownedItems = await db.select({ shopItemId: userInventoryTable.shopItemId })
      .from(userInventoryTable).where(eq(userInventoryTable.userId, userId));
    const ownedIds = new Set(ownedItems.map(o => o.shopItemId));

    let query = db.select().from(shopItemsTable)
      .where(eq(shopItemsTable.isActive, true)) as any;
    if (category) {
      query = db.select().from(shopItemsTable)
        .where(and(eq(shopItemsTable.isActive, true), eq(shopItemsTable.category, category as any)));
    }
    const items = await query;
    res.json(items.map((item: any) => ({
      ...item,
      isOwned: ownedIds.has(item.id),
      isLocked: item.minLevel > user.currentLevel,
    })));
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

// POST /api/shop/:itemId/purchase
router.post("/:itemId/purchase", requireAuth, async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId);
    const userId = req.userId!;
    const [item] = await db.select().from(shopItemsTable).where(eq(shopItemsTable.id, itemId)).limit(1);
    if (!item || !item.isActive) { res.status(404).json({ error: "Item not available" }); return; }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (item.minLevel > user.currentLevel) {
      res.status(403).json({ error: `Requires level ${item.minLevel}` }); return;
    }
    if (user.personalGold < item.goldPrice) {
      res.status(402).json({ error: "Not enough gold" }); return;
    }
    // Check already owned
    const [owned] = await db.select({ id: userInventoryTable.id })
      .from(userInventoryTable)
      .where(and(eq(userInventoryTable.userId, userId), eq(userInventoryTable.shopItemId, itemId)))
      .limit(1);
    if (owned) { res.status(409).json({ error: "Already owned" }); return; }

    // Deduct gold
    await db.update(usersTable).set({
      personalGold: user.personalGold - item.goldPrice, updatedAt: new Date(),
    }).where(eq(usersTable.id, userId));

    const undoWindowEnd = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    const [inv] = await db.insert(userInventoryTable).values({
      userId, shopItemId: itemId, undoWindowEnd,
    }).returning();

    res.json({ purchase: inv, goldRemaining: user.personalGold - item.goldPrice });
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

// POST /api/shop/purchases/:inventoryId/undo
router.post("/purchases/:inventoryId/undo", requireAuth, async (req, res) => {
  try {
    const inventoryId = parseInt(req.params.inventoryId);
    const [inv] = await db.select().from(userInventoryTable)
      .where(and(eq(userInventoryTable.id, inventoryId), eq(userInventoryTable.userId, req.userId!)))
      .limit(1);
    if (!inv) { res.status(404).json({ error: "Not found" }); return; }
    if (!inv.undoWindowEnd || inv.undoWindowEnd < new Date()) {
      res.status(400).json({ error: "Undo window has closed" }); return;
    }
    const [item] = await db.select({ goldPrice: shopItemsTable.goldPrice })
      .from(shopItemsTable).where(eq(shopItemsTable.id, inv.shopItemId)).limit(1);
    await db.delete(userInventoryTable).where(eq(userInventoryTable.id, inventoryId));
    const [user] = await db.select({ personalGold: usersTable.personalGold })
      .from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    await db.update(usersTable).set({ personalGold: user.personalGold + item.goldPrice, updatedAt: new Date() })
      .where(eq(usersTable.id, req.userId!));
    res.json({ message: "Purchase undone" });
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

// GET /api/inventory
router.get("/inventory", requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const inventory = await db.select({
      id: userInventoryTable.id,
      shopItemId: userInventoryTable.shopItemId,
      purchasedAt: userInventoryTable.purchasedAt,
      name: shopItemsTable.name,
      category: shopItemsTable.category,
      emoji: shopItemsTable.emoji,
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

// POST /api/inventory/equip
router.post("/inventory/equip", requireAuth, async (req, res) => {
  try {
    const { shopItemId, slot } = req.body;
    const userId = req.userId!;
    // Verify owned
    const [owned] = await db.select().from(userInventoryTable)
      .where(and(eq(userInventoryTable.userId, userId), eq(userInventoryTable.shopItemId, shopItemId))).limit(1);
    if (!owned) { res.status(403).json({ error: "Item not owned" }); return; }
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
router.delete("/inventory/equip/:slot", requireAuth, async (req, res) => {
  try {
    const { slot } = req.params;
    await db.delete(equippedItemsTable)
      .where(and(eq(equippedItemsTable.userId, req.userId!), eq(equippedItemsTable.slot, slot)));
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

export default router;
