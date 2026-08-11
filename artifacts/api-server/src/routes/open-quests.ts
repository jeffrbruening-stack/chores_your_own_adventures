/**
 * /api/open-quests — matches the OpenAPI spec paths consumed by the generated client.
 */
import { Router } from "express";
import { db } from "@workspace/db";
import {
  questDefinitionsTable, questAssignmentsTable,
} from "@workspace/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { assertMember } from "../lib/party.js";

const router = Router();

// GET /api/open-quests?partyId=  (spec: listOpenQuests)
router.get("/", requireAuth, async (req, res) => {
  try {
    const partyId = parseInt(req.query.partyId as string);
    if (!partyId) { res.status(400).json({ error: "partyId required" }); return; }
    await assertMember(partyId, req.userId!);
    const quests = await db.select().from(questDefinitionsTable)
      .where(and(
        eq(questDefinitionsTable.partyId, partyId),
        eq(questDefinitionsTable.questType, "open"),
        eq(questDefinitionsTable.isArchived, false),
        eq(questDefinitionsTable.isPaused, false),
      ));
    res.json(quests);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

// POST /api/open-quests/:questId/claim  (spec: claimOpenQuest)
// questId here is the quest DEFINITION id (from the open quests list).
router.post("/:questId/claim", requireAuth, async (req, res) => {
  try {
    const questId = parseInt(String(req.params.questId));
    const [quest] = await db.select().from(questDefinitionsTable)
      .where(eq(questDefinitionsTable.id, questId)).limit(1);
    if (!quest) { res.status(404).json({ error: "Quest not found" }); return; }
    await assertMember(quest.partyId, req.userId!);

    // Check for an existing active assignment for this user+party
    const existing = await db.select().from(questAssignmentsTable)
      .where(and(
        eq(questAssignmentsTable.userId, req.userId!),
        eq(questAssignmentsTable.partyId, quest.partyId),
        inArray(questAssignmentsTable.status, ["active"]),
      )).limit(5);
    if (existing.length >= 3) {
      res.status(409).json({ error: "You already have active quests" }); return;
    }

    const [assignment] = await db.insert(questAssignmentsTable).values({
      questDefinitionId: quest.id,
      userId: req.userId!,
      partyId: quest.partyId,
      status: "active",
      claimedBy: req.userId!,
    }).returning();
    res.json(assignment);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

// POST /api/open-quests/:assignmentId/release  (spec: releaseOpenQuest)
router.post("/:assignmentId/release", requireAuth, async (req, res) => {
  try {
    const assignmentId = parseInt(String(req.params.assignmentId));
    const [assignment] = await db.select().from(questAssignmentsTable)
      .where(eq(questAssignmentsTable.id, assignmentId)).limit(1);
    if (!assignment || assignment.userId !== req.userId) {
      res.status(403).json({ error: "Not your assignment" }); return;
    }
    if (assignment.status !== "active") {
      res.status(400).json({ error: "Cannot release a non-active quest" }); return;
    }
    await db.update(questAssignmentsTable).set({ status: "cancelled" })
      .where(eq(questAssignmentsTable.id, assignmentId));
    res.json({ message: "Quest released" });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

export default router;
