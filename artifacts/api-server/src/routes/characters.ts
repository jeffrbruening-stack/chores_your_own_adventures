import { Router } from "express";
import { db } from "@workspace/db";
import {
  charactersTable, usersTable, shopItemsTable,
  userInventoryTable, equippedItemsTable,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router = Router();

// GET /api/characters/me
router.get("/me", requireAuth, async (req, res) => {
  try {
    const [character] = await db.select().from(charactersTable)
      .where(eq(charactersTable.userId, req.userId!)).limit(1);
    if (!character) { res.status(404).json({ error: "No character" }); return; }
    res.json(character);
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

// PUT /api/characters/me — create or update character
// First-time creation (no existing row) does NOT set cooldown
// Subsequent saves trigger 7-day cooldown
router.put("/me", requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const [existing] = await db.select().from(charactersTable)
      .where(eq(charactersTable.userId, userId)).limit(1);

    // Cooldown only applies to EXISTING configured characters
    if (existing?.configured && existing?.cooldownUntil && existing.cooldownUntil > new Date()) {
      res.status(429).json({
        error: "Character customization on cooldown",
        cooldownUntil: existing.cooldownUntil,
      });
      return;
    }

    const ALLOWED = ["adventurerName","species","class","gender","skinTone","hairStyle","hairColor","eyeColor","hasGlasses","facialHair"];
    const updates: any = { updatedAt: new Date(), configured: true };
    for (const k of ALLOWED) { if (req.body[k] !== undefined) updates[k] = req.body[k]; }

    // Set 7-day cooldown only when EDITING an already-configured character
    if (existing?.configured) {
      updates.cooldownUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    let character;
    if (existing) {
      [character] = await db.update(charactersTable).set(updates)
        .where(eq(charactersTable.userId, userId)).returning();
    } else {
      [character] = await db.insert(charactersTable).values({ userId, ...updates }).returning();
    }

    // On first creation, auto-grant and equip the Traveler's Tunic
    if (!existing?.configured) {
      const [tunic] = await db.select({ id: shopItemsTable.id, slot: shopItemsTable.category })
        .from(shopItemsTable)
        .where(and(
          eq(shopItemsTable.isStarter, true),
          eq(shopItemsTable.isActive, true),
        )).limit(1);

      if (tunic) {
        // Grant ownership (idempotent)
        await db.insert(userInventoryTable).values({
          userId, shopItemId: tunic.id,
        }).onConflictDoNothing();

        // Equip in outfit slot
        const [existingEquip] = await db.select().from(equippedItemsTable)
          .where(and(eq(equippedItemsTable.userId, userId), eq(equippedItemsTable.slot, "outfit")))
          .limit(1);
        if (existingEquip) {
          await db.update(equippedItemsTable).set({ shopItemId: tunic.id, equippedAt: new Date() })
            .where(eq(equippedItemsTable.id, existingEquip.id));
        } else {
          await db.insert(equippedItemsTable).values({ userId, slot: "outfit", shopItemId: tunic.id });
        }
      }
    }

    res.json(character);
  } catch (err) {
    console.error("Character save error:", err);
    res.status(500).json({ error: "Failed" });
  }
});

// GET /api/characters/:userId — view another user's character
router.get("/:userId", requireAuth, async (req, res) => {
  try {
    const targetId = parseInt(String(req.params.userId));
    const [character] = await db.select().from(charactersTable)
      .where(eq(charactersTable.userId, targetId)).limit(1);
    if (!character) { res.status(404).json({ error: "Not found" }); return; }
    res.json(character);
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

export default router;
