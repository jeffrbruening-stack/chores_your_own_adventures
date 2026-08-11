/**
 * /api/character — matches the OpenAPI spec path consumed by the generated client.
 * Thin re-export of the same logic as /api/characters/me but at the spec-defined path.
 */
import { Router } from "express";
import { db } from "@workspace/db";
import {
  charactersTable, usersTable, shopItemsTable,
  userInventoryTable, equippedItemsTable, partyMembersTable,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router = Router();

// GET /api/character  (spec: getMyCharacter)
router.get("/", requireAuth, async (req, res) => {
  try {
    const [character] = await db.select().from(charactersTable)
      .where(eq(charactersTable.userId, req.userId!)).limit(1);
    if (!character) { res.status(404).json({ error: "No character" }); return; }
    res.json(character);
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

// PUT /api/character  (spec: saveCharacter)
router.put("/", requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;

    // Leaders bypass the 7-day appearance lock
    const [user] = await db.select({ activePartyId: usersTable.activePartyId })
      .from(usersTable).where(eq(usersTable.id, userId)).limit(1);

    let isLeader = false;
    if (user?.activePartyId) {
      const [membership] = await db.select({ role: partyMembersTable.role })
        .from(partyMembersTable)
        .where(and(
          eq(partyMembersTable.partyId, user.activePartyId),
          eq(partyMembersTable.userId, userId),
        )).limit(1);
      isLeader = membership?.role === "leader" || membership?.role === "founder";
    }

    const [existing] = await db.select().from(charactersTable)
      .where(eq(charactersTable.userId, userId)).limit(1);

    if (!isLeader && existing?.configured && existing?.cooldownUntil && existing.cooldownUntil > new Date()) {
      res.status(429).json({ error: "Character customization on cooldown", cooldownUntil: existing.cooldownUntil });
      return;
    }

    const ALLOWED = ["adventurerName","species","class","gender","skinTone","hairStyle","hairColor","eyeColor","hasGlasses","facialHair"];
    const updates: any = { updatedAt: new Date(), configured: true };
    for (const k of ALLOWED) { if (req.body[k] !== undefined) updates[k] = req.body[k]; }

    if (isLeader) {
      updates.cooldownUntil = null;
    } else if (existing?.configured) {
      updates.cooldownUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    let character;
    if (existing) {
      [character] = await db.update(charactersTable).set(updates)
        .where(eq(charactersTable.userId, userId)).returning();
    } else {
      [character] = await db.insert(charactersTable).values({ userId, ...updates }).returning();
    }

    // On first creation, auto-grant and equip the starter item
    if (!existing?.configured) {
      const [tunic] = await db.select({ id: shopItemsTable.id, slot: shopItemsTable.category })
        .from(shopItemsTable)
        .where(and(eq(shopItemsTable.isStarter, true), eq(shopItemsTable.isActive, true)))
        .limit(1);

      if (tunic) {
        await db.insert(userInventoryTable).values({ userId, shopItemId: tunic.id }).onConflictDoNothing();
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

// GET /api/character/users/:userId  (spec: getUserCharacter)
router.get("/users/:userId", requireAuth, async (req, res) => {
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
