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

function generateHouseholdCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
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
      .where(eq(partiesTable.id, partyIds[0])); // simplified

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
    let householdCode = generateHouseholdCode();
    // Ensure unique
    const [existing] = await db.select({ id: partiesTable.id })
      .from(partiesTable).where(eq(partiesTable.householdCode, householdCode)).limit(1);
    if (existing) householdCode = generateHouseholdCode() + Math.floor(Math.random()*9);

    const [party] = await db.insert(partiesTable).values({
      name, householdCode, founderId: userId,
    }).returning();

    // Add founder as leader
    await db.insert(partyMembersTable).values({
      partyId: party.id, userId, role: "leader",
    });

    // Set as active party
    await db.update(usersTable).set({ activePartyId: party.id, updatedAt: new Date() })
      .where(eq(usersTable.id, userId));

    res.status(201).json({ ...party, myRole: "leader" });
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

// GET /api/parties/:partyId/members
router.get("/:partyId/members", requireAuth, async (req, res) => {
  try {
    const partyId = parseInt(String(req.params.partyId));
    await assertMember(partyId, req.userId!);
    const members = await db.select({
      id: usersTable.id,
      displayName: usersTable.displayName,
      userType: usersTable.userType,
      currentLevel: usersTable.currentLevel,
      personalGold: usersTable.personalGold,
      lifetimeXp: usersTable.lifetimeXp,
      role: partyMembersTable.role,
      adventurerName: charactersTable.adventurerName,
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
    // Create character
    await db.insert(charactersTable).values({ userId: kid.id, adventurerName: displayName });
    // Add to party
    await db.insert(partyMembersTable).values({ partyId, userId: kid.id, role: "kid" });
    res.status(201).json({ id: kid.id, displayName: kid.displayName, role: "kid" });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

// PATCH /api/parties/:partyId/members/:userId
router.patch("/:partyId/members/:memberId", requireAuth, async (req, res) => {
  try {
    const partyId = parseInt(String(req.params.partyId));
    const memberId = parseInt(String(req.params.memberId));
    await assertLeader(partyId, req.userId!);
    const { role, resetPin } = req.body;
    if (role) {
      await db.update(partyMembersTable).set({ role })
        .where(and(eq(partyMembersTable.partyId, partyId), eq(partyMembersTable.userId, memberId)));
    }
    if (resetPin) {
      const pinHash = await bcrypt.hash(resetPin, 12);
      await db.update(usersTable).set({ pinHash, pinAttempts: 0, pinLockedUntil: null })
        .where(eq(usersTable.id, memberId));
    }
    res.json({ message: "Updated" });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

// DELETE /api/parties/:partyId/members/:userId
router.delete("/:partyId/members/:memberId", requireAuth, async (req, res) => {
  try {
    const partyId = parseInt(String(req.params.partyId));
    const memberId = parseInt(String(req.params.memberId));
    await assertLeader(partyId, req.userId!);
    await db.delete(partyMembersTable)
      .where(and(eq(partyMembersTable.partyId, partyId), eq(partyMembersTable.userId, memberId)));
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
    const token = crypto.randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await db.insert(inviteTokensTable).values({
      partyId, token, createdBy: req.userId!, expiresAt,
    });
    res.json({ token, expiresAt, inviteUrl: `https://choresyourownadventure.com/join/${token}` });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

// POST /api/parties/join — join via invite
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
    if (!existing) {
      await db.insert(partyMembersTable).values({
        partyId: invite.partyId, userId: req.userId!, role: "adult",
      });
      await db.update(inviteTokensTable).set({ usedBy: req.userId!, usedAt: new Date() })
        .where(eq(inviteTokensTable.id, invite.id));
    }
    await db.update(usersTable).set({ activePartyId: invite.partyId, updatedAt: new Date() })
      .where(eq(usersTable.id, req.userId!));
    const [party] = await db.select().from(partiesTable)
      .where(eq(partiesTable.id, invite.partyId)).limit(1);
    res.json({ ...party, myRole: existing ?? "adult" });
  } catch {
    res.status(500).json({ error: "Failed" });
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
    // Cat Foley appears for 48 hours
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
    res.json({ id: updated.id, lifetimeXp: updated.lifetimeXp, personalGold: updated.personalGold });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

export default router;
