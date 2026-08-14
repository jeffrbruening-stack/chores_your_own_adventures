import { Router } from "express";
import crypto from "crypto";
import { db } from "@workspace/db";
import {
  partiesTable, partyMembersTable, usersTable, inviteTokensTable, charactersTable,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { getMemberRole, assertLeader, assertMember } from "../lib/party.js";
import bcrypt from "bcrypt";

const router = Router();

// Only unambiguous characters: no 0/O/Q, 1/I/L, 5/S, 2/Z, 8/B, 6/G, U/V
function generateHouseholdCode(): string {
  const chars = "ACDEFHJKMNPRTWXY3479";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// GET /api/parties — list my parties
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const memberships = await db.select({
      partyId: partyMembersTable.partyId,
      role: partyMembersTable.role,
    }).from(partyMembersTable).where(eq(partyMembersTable.userId, userId));

    const partyIds = memberships.map(m => m.partyId);
    if (partyIds.length === 0) { res.json([]); return; }

    const parties = await db.select().from(partiesTable)
      .where(eq(partiesTable.id, partyIds[0]));

    res.json(parties.map(p => {
      const role = memberships.find(m => m.partyId === p.id)?.role;
      return { ...p, myRole: role };
    }));
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

// POST /api/parties — create party
router.post("/", requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { name } = req.body;
    if (!name) { res.status(400).json({ error: "name required" }); return; }
    // Retry until unique — stays 6 characters (the app expects exactly 6)
    let householdCode = generateHouseholdCode();
    for (let i = 0; i < 10; i++) {
      const [existing] = await db.select({ id: partiesTable.id })
        .from(partiesTable).where(eq(partiesTable.householdCode, householdCode)).limit(1);
      if (!existing) break;
      householdCode = generateHouseholdCode();
    }

    const [party] = await db.insert(partiesTable).values({
      name, householdCode, founderId: userId,
    }).returning();

    await db.insert(partyMembersTable).values({
      partyId: party.id, userId, role: "leader",
    });

    await db.update(usersTable).set({ activePartyId: party.id, updatedAt: new Date() })
      .where(eq(usersTable.id, userId));

    res.status(201).json({ ...party, myRole: "leader" });
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

// POST /api/parties/join — join via invite (must come before /:partyId)
router.post("/join", requireAuth, async (req, res) => {
  try {
    const { token } = req.body;
    const [invite] = await db.select().from(inviteTokensTable)
      .where(eq(inviteTokensTable.token, token)).limit(1);
    if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
      res.status(400).json({ error: "Invalid or expired invite" });
      return;
    }
    const existing = await getMemberRole(invite.partyId, req.userId!);
    const inviteRole = (invite as any).role ?? "adult";
    if (!existing) {
      await db.insert(partyMembersTable).values({
        partyId: invite.partyId, userId: req.userId!, role: inviteRole,
      });
      await db.update(inviteTokensTable).set({ usedBy: req.userId!, usedAt: new Date() })
        .where(eq(inviteTokensTable.id, invite.id));
    }
    await db.update(usersTable).set({ activePartyId: invite.partyId, updatedAt: new Date() })
      .where(eq(usersTable.id, req.userId!));
    const [party] = await db.select().from(partiesTable)
      .where(eq(partiesTable.id, invite.partyId)).limit(1);
    res.json({ ...party, myRole: existing ?? inviteRole });
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

// GET /api/parties/:partyId
router.get("/:partyId", requireAuth, async (req, res) => {
  try {
    const partyId = parseInt(String(req.params.partyId));
    await assertMember(partyId, req.userId!);
    const [party] = await db.select().from(partiesTable)
      .where(eq(partiesTable.id, partyId)).limit(1);
    if (!party) { res.status(404).json({ error: "Not found" }); return; }
    const role = await getMemberRole(partyId, req.userId!);
    res.json({ ...party, myRole: role });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

// PATCH /api/parties/:partyId
router.patch("/:partyId", requireAuth, async (req, res) => {
  try {
    const partyId = parseInt(String(req.params.partyId));
    await assertLeader(partyId, req.userId!);
    const { name, routinesPaused } = req.body;
    const updates: any = { updatedAt: new Date() };
    if (name) updates.name = name;
    if (typeof routinesPaused === "boolean") updates.routinesPaused = routinesPaused;
    const [party] = await db.update(partiesTable).set(updates)
      .where(eq(partiesTable.id, partyId)).returning();
    res.json(party);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

// DELETE /api/parties/:partyId
router.delete("/:partyId", requireAuth, async (req, res) => {
  try {
    const partyId = parseInt(String(req.params.partyId));
    const [party] = await db.select().from(partiesTable).where(eq(partiesTable.id, partyId)).limit(1);
    if (!party || party.founderId !== req.userId) {
      res.status(403).json({ error: "Only the founder can delete the party" });
      return;
    }
    await db.delete(partyMembersTable).where(eq(partyMembersTable.partyId, partyId));
    await db.delete(partiesTable).where(eq(partiesTable.id, partyId));
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

// GET /api/parties/:partyId/members — includes cooldownUntil for admin
router.get("/:partyId/members", requireAuth, async (req, res) => {
  try {
    const partyId = parseInt(String(req.params.partyId));
    await assertMember(partyId, req.userId!);
    const members = await db.select({
      userId: usersTable.id,
      displayName: usersTable.displayName,
      userType: usersTable.userType,
      currentLevel: usersTable.currentLevel,
      personalGold: usersTable.personalGold,
      lifetimeXp: usersTable.lifetimeXp,
      role: partyMembersTable.role,
      adventurerName: charactersTable.adventurerName,
      species: charactersTable.species,
      class: charactersTable.class,
      gender: charactersTable.gender,
      skinTone: charactersTable.skinTone,
      hairStyle: charactersTable.hairStyle,
      hairColor: charactersTable.hairColor,
      eyeColor: charactersTable.eyeColor,
      hasGlasses: charactersTable.hasGlasses,
      facialHair: charactersTable.facialHair,
      portraitPath: charactersTable.portraitPath,
      // For admin: appearance lock status
      cooldownUntil: charactersTable.cooldownUntil,
    }).from(partyMembersTable)
      .innerJoin(usersTable, eq(usersTable.id, partyMembersTable.userId))
      .leftJoin(charactersTable, eq(charactersTable.userId, partyMembersTable.userId))
      .where(eq(partyMembersTable.partyId, partyId));
    res.json(members);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

// POST /api/parties/:partyId/members/kid — add kid
router.post("/:partyId/members/kid", requireAuth, async (req, res) => {
  try {
    const partyId = parseInt(String(req.params.partyId));
    await assertLeader(partyId, req.userId!);
    const { displayName, pin } = req.body;
    if (!displayName || !pin) { res.status(400).json({ error: "displayName and pin required" }); return; }
    const pinHash = await bcrypt.hash(pin, 12);
    const [kid] = await db.insert(usersTable).values({
      displayName, pinHash, userType: "kid", activePartyId: partyId,
    }).returning();
    await db.insert(charactersTable).values({ userId: kid.id, adventurerName: displayName });
    await db.insert(partyMembersTable).values({ partyId, userId: kid.id, role: "kid" });
    res.status(201).json({ id: kid.id, displayName: kid.displayName, role: "kid" });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

// PATCH /api/parties/:partyId/members/:memberId — role change + PIN reset
router.patch("/:partyId/members/:memberId", requireAuth, async (req, res) => {
  try {
    const partyId = parseInt(String(req.params.partyId));
    const memberId = parseInt(String(req.params.memberId));
    await assertLeader(partyId, req.userId!);
    const { role, resetPin } = req.body;

    if (role) {
      // Prevent demotion/removal of founder by non-founder
      const [party] = await db.select({ founderId: partiesTable.founderId })
        .from(partiesTable).where(eq(partiesTable.id, partyId)).limit(1);
      if (party?.founderId === memberId && req.userId !== memberId) {
        res.status(403).json({ error: "Cannot change the founder's role" }); return;
      }
      await db.update(partyMembersTable).set({ role })
        .where(and(eq(partyMembersTable.partyId, partyId), eq(partyMembersTable.userId, memberId)));
      console.info(`[ADMIN] ${req.userId} changed role of ${memberId} in party ${partyId} to ${role}`);
    }

    if (resetPin) {
      const pinHash = await bcrypt.hash(resetPin, 12);
      await db.update(usersTable).set({ pinHash, pinAttempts: 0, pinLockedUntil: null })
        .where(eq(usersTable.id, memberId));
      console.info(`[ADMIN] ${req.userId} reset PIN for user ${memberId} in party ${partyId}`);
    }

    res.json({ message: "Updated" });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

// PATCH /api/parties/:partyId/members/:memberId/unlock-appearance — leader clears member's appearance lock
router.patch("/:partyId/members/:memberId/unlock-appearance", requireAuth, async (req, res) => {
  try {
    const partyId = parseInt(String(req.params.partyId));
    const memberId = parseInt(String(req.params.memberId));
    await assertLeader(partyId, req.userId!);

    // Verify target is a member of this party
    const [membership] = await db.select({ role: partyMembersTable.role })
      .from(partyMembersTable)
      .where(and(eq(partyMembersTable.partyId, partyId), eq(partyMembersTable.userId, memberId)))
      .limit(1);
    if (!membership) { res.status(404).json({ error: "Member not found" }); return; }

    await db.update(charactersTable)
      .set({ cooldownUntil: null, updatedAt: new Date() })
      .where(eq(charactersTable.userId, memberId));

    console.info(`[ADMIN] ${req.userId} unlocked appearance for user ${memberId} in party ${partyId}`);
    res.json({ message: "Appearance lock cleared" });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

// DELETE /api/parties/:partyId/members/:memberId
router.delete("/:partyId/members/:memberId", requireAuth, async (req, res) => {
  try {
    const partyId = parseInt(String(req.params.partyId));
    const memberId = parseInt(String(req.params.memberId));
    await assertLeader(partyId, req.userId!);

    // Prevent removal of founder
    const [party] = await db.select({ founderId: partiesTable.founderId })
      .from(partiesTable).where(eq(partiesTable.id, partyId)).limit(1);
    if (party?.founderId === memberId) {
      res.status(403).json({ error: "Cannot remove the party founder" }); return;
    }

    await db.delete(partyMembersTable)
      .where(and(eq(partyMembersTable.partyId, partyId), eq(partyMembersTable.userId, memberId)));
    console.info(`[ADMIN] ${req.userId} removed member ${memberId} from party ${partyId}`);
    res.status(204).send();
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

// POST /api/parties/:partyId/invite
router.post("/:partyId/invite", requireAuth, async (req, res) => {
  try {
    const partyId = parseInt(String(req.params.partyId));
    await assertLeader(partyId, req.userId!);
    const role: string = req.body.role === "leader" ? "leader" : "adult";
    const token = crypto.randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.insert(inviteTokensTable).values({
      partyId, token, createdBy: req.userId!, expiresAt, role,
    });
    res.json({ token, expiresAt, role, inviteUrl: `https://choresyourownadventure.com/join/${token}` });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

// POST /api/parties/:partyId/leave
router.post("/:partyId/leave", requireAuth, async (req, res) => {
  try {
    const partyId = parseInt(String(req.params.partyId));
    await db.delete(partyMembersTable)
      .where(and(eq(partyMembersTable.partyId, partyId), eq(partyMembersTable.userId, req.userId!)));
    const [user] = await db.select({ activePartyId: usersTable.activePartyId })
      .from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    if (user.activePartyId === partyId) {
      await db.update(usersTable).set({ activePartyId: null, updatedAt: new Date() })
        .where(eq(usersTable.id, req.userId!));
    }
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

// POST /api/parties/:partyId/transfer-founder
router.post("/:partyId/transfer-founder", requireAuth, async (req, res) => {
  try {
    const partyId = parseInt(String(req.params.partyId));
    const [party] = await db.select().from(partiesTable).where(eq(partiesTable.id, partyId)).limit(1);
    if (!party || party.founderId !== req.userId) {
      res.status(403).json({ error: "Only the founder can transfer" });
      return;
    }
    const { newFounderId } = req.body;
    await db.update(partiesTable).set({ founderId: newFounderId, updatedAt: new Date() })
      .where(eq(partiesTable.id, partyId));
    await db.update(partyMembersTable).set({ role: "adult" })
      .where(and(eq(partyMembersTable.partyId, partyId), eq(partyMembersTable.userId, req.userId!)));
    await db.update(partyMembersTable).set({ role: "leader" })
      .where(and(eq(partyMembersTable.partyId, partyId), eq(partyMembersTable.userId, newFounderId)));
    console.info(`[ADMIN] ${req.userId} transferred founder of party ${partyId} to ${newFounderId}`);
    res.json({ message: "Transferred" });
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

// POST /api/parties/:partyId/pause-routines
router.post("/:partyId/pause-routines", requireAuth, async (req, res) => {
  try {
    const partyId = parseInt(String(req.params.partyId));
    await assertLeader(partyId, req.userId!);
    const [party] = await db.update(partiesTable)
      .set({ routinesPaused: true, updatedAt: new Date() })
      .where(eq(partiesTable.id, partyId)).returning();
    res.json(party);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

// POST /api/parties/:partyId/summon-cat-foley
router.post("/:partyId/summon-cat-foley", requireAuth, async (req, res) => {
  try {
    const partyId = parseInt(String(req.params.partyId));
    await assertLeader(partyId, req.userId!);
    const { catFoleyAppearancesTable } = await import("@workspace/db/schema");
    await db.insert(catFoleyAppearancesTable).values({
      partyId,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      message: req.body.message ?? "Cat Foley the merchant has arrived!",
    });
    res.json({ message: "Cat Foley summoned!" });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

// PATCH /api/parties/:partyId/members/:memberId/adjust (leader adjust member stats)
router.patch("/:partyId/members/:memberId/adjust", requireAuth, async (req, res) => {
  try {
    const partyId = parseInt(String(req.params.partyId));
    const memberId = parseInt(String(req.params.memberId));
    await assertLeader(partyId, req.userId!);
    const { xpDelta, goldDelta, reason } = req.body;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, memberId)).limit(1);
    const updates: any = { updatedAt: new Date() };
    if (xpDelta) updates.lifetimeXp = Math.max(0, user.lifetimeXp + xpDelta);
    if (goldDelta) updates.personalGold = Math.max(0, user.personalGold + goldDelta);
    const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, memberId)).returning();
    if (reason) console.info(`[ADMIN] ${req.userId} adjusted ${memberId} in party ${partyId}: xp=${xpDelta} gold=${goldDelta} reason=${reason}`);
    res.json({ id: updated.id, lifetimeXp: updated.lifetimeXp, personalGold: updated.personalGold });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

export default router;
