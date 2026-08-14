import { Router } from "express";
import { db } from "@workspace/db";
import { partyGoalsTable, partiesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { assertLeader, assertMember, getMemberRole } from "../lib/party.js";

const router = Router();

// GET /api/party-goals?partyId=
router.get("/", requireAuth, async (req, res) => {
  try {
    const partyId = parseInt(req.query.partyId as string);
    if (!partyId) { res.status(400).json({ error: "partyId required" }); return; }
    await assertMember(partyId, req.userId!);
    const goals = await db.select().from(partyGoalsTable)
      .where(eq(partyGoalsTable.partyId, partyId));
    // Progress toward the active goal is the party's shared gold stash —
    // it counts everything earned so far, including gold from before activation.
    const [party] = await db.select({ partyGoldReserve: partiesTable.partyGoldReserve })
      .from(partiesTable).where(eq(partiesTable.id, partyId)).limit(1);
    const reserve = party?.partyGoldReserve ?? 0;
    res.json(goals.map(g => g.status === "active" ? { ...g, currentGold: reserve } : g));
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

// POST /api/party-goals
router.post("/", requireAuth, async (req, res) => {
  try {
    const { partyId, name, description, targetGold } = req.body;
    if (!partyId || !name || !targetGold) { res.status(400).json({ error: "Missing required fields" }); return; }
    await assertLeader(partyId, req.userId!);
    const [goal] = await db.insert(partyGoalsTable).values({
      partyId, name, description, targetGold,
      proposedBy: req.userId!,
    }).returning();
    res.status(201).json(goal);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

// POST /api/party-goals/:goalId/activate
router.post("/:goalId/activate", requireAuth, async (req, res) => {
  try {
    const goalId = parseInt(String(req.params.goalId));
    const [goal] = await db.select().from(partyGoalsTable)
      .where(eq(partyGoalsTable.id, goalId)).limit(1);
    if (!goal) { res.status(404).json({ error: "Not found" }); return; }
    await assertLeader(goal.partyId, req.userId!);
    // Deactivate any currently active goal
    await db.update(partyGoalsTable).set({ status: "available", updatedAt: new Date() })
      .where(and(eq(partyGoalsTable.partyId, goal.partyId), eq(partyGoalsTable.status, "active")));
    const [updated] = await db.update(partyGoalsTable).set({
      status: "active", activatedBy: req.userId!, updatedAt: new Date(),
    }).where(eq(partyGoalsTable.id, goalId)).returning();
    res.json(updated);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

// POST /api/party-goals/:goalId/propose-activation
router.post("/:goalId/propose-activation", requireAuth, async (req, res) => {
  try {
    const goalId = parseInt(String(req.params.goalId));
    const [goal] = await db.select().from(partyGoalsTable)
      .where(eq(partyGoalsTable.id, goalId)).limit(1);
    if (!goal) { res.status(404).json({ error: "Not found" }); return; }
    await assertMember(goal.partyId, req.userId!);
    const [updated] = await db.update(partyGoalsTable).set({
      status: "proposed", proposedBy: req.userId!, updatedAt: new Date(),
    }).where(eq(partyGoalsTable.id, goalId)).returning();
    res.json(updated);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

// POST /api/party-goals/:goalId/redeem
router.post("/:goalId/redeem", requireAuth, async (req, res) => {
  try {
    const goalId = parseInt(String(req.params.goalId));
    const [goal] = await db.select().from(partyGoalsTable)
      .where(eq(partyGoalsTable.id, goalId)).limit(1);
    if (!goal || goal.status !== "active") { res.status(400).json({ error: "Goal not active" }); return; }
    await assertLeader(goal.partyId, req.userId!);
    const [party] = await db.select({ partyGoldReserve: partiesTable.partyGoldReserve })
      .from(partiesTable).where(eq(partiesTable.id, goal.partyId)).limit(1);
    if ((party?.partyGoldReserve ?? 0) < goal.targetGold) {
      res.status(402).json({ error: "Not enough party gold" }); return;
    }
    await db.update(partiesTable).set({
      partyGoldReserve: party.partyGoldReserve - goal.targetGold, updatedAt: new Date(),
    }).where(eq(partiesTable.id, goal.partyId));
    const [updated] = await db.update(partyGoalsTable).set({
      status: "completed", redeemedAt: new Date(), updatedAt: new Date(),
    }).where(eq(partyGoalsTable.id, goalId)).returning();
    res.json(updated);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

// DELETE /api/party-goals/:goalId
router.delete("/:goalId", requireAuth, async (req, res) => {
  try {
    const goalId = parseInt(String(req.params.goalId));
    const [goal] = await db.select({ partyId: partyGoalsTable.partyId })
      .from(partyGoalsTable).where(eq(partyGoalsTable.id, goalId)).limit(1);
    if (!goal) { res.status(404).json({ error: "Not found" }); return; }
    await assertLeader(goal.partyId, req.userId!);
    await db.update(partyGoalsTable).set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(partyGoalsTable.id, goalId));
    res.status(204).send();
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

export default router;
