import { Router } from "express";
import { db } from "@workspace/db";
import { charactersTable, usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
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

// PUT /api/characters/me
router.put("/me", requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const [existing] = await db.select({ cooldownUntil: charactersTable.cooldownUntil })
      .from(charactersTable).where(eq(charactersTable.userId, userId)).limit(1);

    if (existing?.cooldownUntil && existing.cooldownUntil > new Date()) {
      res.status(429).json({ error: "Character customization on cooldown", cooldownUntil: existing.cooldownUntil });
      return;
    }

    const ALLOWED = ["adventurerName","species","class","gender","skinTone","hairStyle","hairColor","eyeColor","hasGlasses","facialHair"];
    const updates: any = { updatedAt: new Date() };
    for (const k of ALLOWED) { if (req.body[k] !== undefined) updates[k] = req.body[k]; }

    // Set 7-day cooldown on save
    updates.cooldownUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    let character;
    if (existing) {
      [character] = await db.update(charactersTable).set(updates)
        .where(eq(charactersTable.userId, userId)).returning();
    } else {
      [character] = await db.insert(charactersTable).values({ userId, ...updates }).returning();
    }
    res.json(character);
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

// GET /api/characters/:userId — view another user's character
router.get("/:userId", requireAuth, async (req, res) => {
  try {
    const targetId = parseInt(req.params.userId);
    const [character] = await db.select().from(charactersTable)
      .where(eq(charactersTable.userId, targetId)).limit(1);
    if (!character) { res.status(404).json({ error: "Not found" }); return; }
    res.json(character);
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

export default router;
