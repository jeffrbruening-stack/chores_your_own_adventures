import { Router } from "express";
import { db } from "@workspace/db";
import {
  charactersTable, usersTable, shopItemsTable,
  userInventoryTable, equippedItemsTable, partyMembersTable,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { generateAndStorePortrait } from "../lib/portrait.js";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage.js";

const router = Router();

// Per-user guards for the expensive portrait generation call:
// - inProgress: prevents concurrent duplicate generations
// - lastGeneratedAt: 2-minute cooldown between generations
const portraitInProgress = new Set<number>();
const portraitLastGeneratedAt = new Map<number, number>();
const PORTRAIT_COOLDOWN_MS = 2 * 60 * 1000;

// POST /api/characters/me/portrait — (re)generate the AI portrait for the
// current user's character from their saved appearance. Slow (~20-60s).
router.post("/me/portrait", requireAuth, async (req, res) => {
  const userId = req.userId!;
  if (portraitInProgress.has(userId)) {
    res.status(409).json({ error: "A portrait is already being summoned. Hang tight!" });
    return;
  }
  const last = portraitLastGeneratedAt.get(userId) ?? 0;
  if (Date.now() - last < PORTRAIT_COOLDOWN_MS) {
    res.status(429).json({ error: "The portrait artist needs a short rest. Try again in a couple of minutes." });
    return;
  }
  portraitInProgress.add(userId);
  try {
    const [character] = await db.select().from(charactersTable)
      .where(eq(charactersTable.userId, userId)).limit(1);
    if (!character) { res.status(404).json({ error: "No character" }); return; }

    const portraitPath = await generateAndStorePortrait({
      class: character.class,
      gender: character.gender,
      skinTone: character.skinTone,
      hairStyle: character.hairStyle,
      hairColor: character.hairColor,
      eyeColor: character.eyeColor,
      hasGlasses: character.hasGlasses,
      facialHair: character.facialHair,
    });

    await db.update(charactersTable)
      .set({ portraitPath, updatedAt: new Date() })
      .where(eq(charactersTable.userId, userId));
    portraitLastGeneratedAt.set(userId, Date.now());

    // Best-effort cleanup of the superseded portrait object
    if (character.portraitPath && character.portraitPath !== portraitPath) {
      try {
        const storage = new ObjectStorageService();
        const oldFile = await storage.getObjectEntityFile(character.portraitPath);
        await oldFile.delete();
      } catch { /* ignore — orphaned object is harmless */ }
    }

    res.json({ portraitPath });
  } catch (err: any) {
    console.error("Portrait generation failed:", err);
    res.status(500).json({ error: err.message ?? "Portrait generation failed" });
  } finally {
    portraitInProgress.delete(userId);
  }
});

// GET /api/characters/portrait-image/:userId — serve a character's portrait PNG.
// Unauthenticated on purpose: <img> tags can't send Authorization headers, and
// portraits are non-sensitive game art addressed by numeric id.
router.get("/portrait-image/:userId", async (req, res) => {
  try {
    const targetId = parseInt(String(req.params.userId));
    if (!targetId) { res.status(400).json({ error: "Invalid user id" }); return; }
    const [character] = await db.select({ portraitPath: charactersTable.portraitPath })
      .from(charactersTable).where(eq(charactersTable.userId, targetId)).limit(1);
    if (!character?.portraitPath) { res.status(404).json({ error: "No portrait" }); return; }

    const storage = new ObjectStorageService();
    const file = await storage.getObjectEntityFile(character.portraitPath);
    const response = await storage.downloadObject(file, 86400);
    response.headers.forEach((v, k) => res.setHeader(k, v));
    const buf = Buffer.from(await response.arrayBuffer());
    res.end(buf);
  } catch (err) {
    if (err instanceof ObjectNotFoundError) { res.status(404).json({ error: "No portrait" }); return; }
    console.error("Portrait serve failed:", err);
    if (!res.headersSent) res.status(500).json({ error: "Failed" });
  }
});

// GET /api/characters/me
// Leaders always get cooldownUntil: null so the frontend never shows the lock.
router.get("/me", requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const [character] = await db.select().from(charactersTable)
      .where(eq(charactersTable.userId, userId)).limit(1);
    if (!character) { res.status(404).json({ error: "No character" }); return; }

    // Check if this user is a party leader so we can strip the cooldown from the response
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
      isLeader = membership?.role === "leader" || membership?.role === "adult";
    }

    res.json({ ...character, cooldownUntil: isLeader ? null : character.cooldownUntil });
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

// PUT /api/characters/me — create or update character
// Party Leaders/founders are never subject to the 7-day appearance lock.
// Regular adventurers/kids get the 7-day cooldown on subsequent saves.
router.put("/me", requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;

    // Check if this user is a party leader — leaders bypass appearance lock entirely
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
      isLeader = membership?.role === "leader" || membership?.role === "adult";
    }

    const [existing] = await db.select().from(charactersTable)
      .where(eq(charactersTable.userId, userId)).limit(1);

    // Cooldown enforcement — skip entirely for party leaders
    if (!isLeader && existing?.configured && existing?.cooldownUntil && existing.cooldownUntil > new Date()) {
      res.status(429).json({
        error: "Character customization on cooldown",
        cooldownUntil: existing.cooldownUntil,
      });
      return;
    }

    const ALLOWED = ["adventurerName","species","class","gender","skinTone","hairStyle","hairColor","eyeColor","hasGlasses","facialHair"];
    const updates: any = { updatedAt: new Date(), configured: true };
    for (const k of ALLOWED) { if (req.body[k] !== undefined) updates[k] = req.body[k]; }

    if (isLeader) {
      // Leaders: clear any existing cooldown — they can edit at any time
      updates.cooldownUntil = null;
    } else if (existing?.configured) {
      // Non-leaders editing an already-configured character → 7-day cooldown
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
        await db.insert(userInventoryTable).values({
          userId, shopItemId: tunic.id,
        }).onConflictDoNothing();

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

// POST /api/characters/me/reset — reset own progression to level 1 (keeps appearance)
router.post("/me/reset", requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    // Reset XP, level, legendaryCompletions — keep gold and appearance
    await db.update(usersTable)
      .set({ lifetimeXp: 0, currentLevel: 1, legendaryCompletions: 0, updatedAt: new Date() })
      .where(eq(usersTable.id, userId));
    // Clear appearance cooldown so they can re-customise immediately after reset
    await db.update(charactersTable)
      .set({ cooldownUntil: null })
      .where(eq(charactersTable.userId, userId));
    res.json({ ok: true, message: "Character progression reset to level 1" });
  } catch {
    res.status(500).json({ error: "Reset failed" });
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
