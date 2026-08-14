/**
 * /api/quest-assignments — matches the OpenAPI spec paths consumed by the generated client.
 * These handlers mirror the logic in quests.ts but are mounted at the spec-defined URLs.
 */
import { Router } from "express";
import { db } from "@workspace/db";
import {
  questAssignmentsTable, questDefinitionsTable,
  usersTable, partiesTable,
} from "@workspace/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { assertLeader, assertMember } from "../lib/party.js";
import { DIFFICULTY_REWARDS, levelFromXp } from "../lib/rewards.js";
import { ensureRoutineAssignments, isAssignmentVisibleNow, tzOffsetFromHeader } from "../lib/routine.js";

const router = Router();

const ASSIGNMENT_SELECT = {
  id: questAssignmentsTable.id,
  questDefinitionId: questAssignmentsTable.questDefinitionId,
  status: questAssignmentsTable.status,
  expiresAt: questAssignmentsTable.expiresAt,
  completedAt: questAssignmentsTable.completedAt,
  xpAwarded: questAssignmentsTable.xpAwarded,
  goldAwarded: questAssignmentsTable.goldAwarded,
  partyGoldAwarded: questAssignmentsTable.partyGoldAwarded,
  plainTitle: questDefinitionsTable.plainTitle,
  adventureTitle: questDefinitionsTable.adventureTitle,
  description: questDefinitionsTable.description,
  difficulty: questDefinitionsTable.difficulty,
  isLegendary: questDefinitionsTable.isLegendary,
  requiresVerification: questDefinitionsTable.requiresVerification,
  verificationType: questDefinitionsTable.verificationType,
  proofPhotoPath: questAssignmentsTable.proofPhotoPath,
  xpReward: questDefinitionsTable.xpReward,
  goldReward: questDefinitionsTable.goldReward,
  partyGoldReward: questDefinitionsTable.partyGoldReward,
  questType: questDefinitionsTable.questType,
  timeWindowStart: questDefinitionsTable.timeWindowStart,
  timeWindowEnd: questDefinitionsTable.timeWindowEnd,
  isRoutine: questDefinitionsTable.isRoutine,
  routineSchedule: questDefinitionsTable.routineSchedule,
};

// GET /api/quest-assignments?partyId=
// Lists active + submitted assignments for the current user in a party.
router.get("/", requireAuth, async (req, res) => {
  try {
    const partyId = parseInt(req.query.partyId as string);
    const tz = tzOffsetFromHeader(req.headers["x-tz-offset"]);
    // Verify current membership before issuing routine assignments.
    if (partyId) await assertMember(partyId, req.userId!);
    if (partyId) await ensureRoutineAssignments(req.userId!, partyId, tz);
    const assignments = await db.select(ASSIGNMENT_SELECT)
      .from(questAssignmentsTable)
      .innerJoin(questDefinitionsTable, eq(questDefinitionsTable.id, questAssignmentsTable.questDefinitionId))
      .where(and(
        eq(questAssignmentsTable.userId, req.userId!),
        ...(partyId ? [eq(questAssignmentsTable.partyId, partyId)] : []),
        inArray(questAssignmentsTable.status, ["active", "submitted"]),
        eq(questDefinitionsTable.isArchived, false),
      ));
    res.json(assignments.filter((a) => isAssignmentVisibleNow(a, tz)));
  } catch (err) {
    console.error("quest-assignments error:", err);
    res.status(500).json({ error: "Failed" });
  }
});

// POST /api/quest-assignments/:assignmentId/complete
router.post("/:assignmentId/complete", requireAuth, async (req, res) => {
  try {
    const assignmentId = parseInt(String(req.params.assignmentId));
    const [assignment] = await db.select().from(questAssignmentsTable)
      .where(eq(questAssignmentsTable.id, assignmentId)).limit(1);
    if (!assignment || assignment.userId !== req.userId) {
      res.status(403).json({ error: "Not your quest" }); return;
    }
    if (assignment.status !== "active") {
      res.status(400).json({ error: "Quest not active" }); return;
    }
    const [quest] = await db.select().from(questDefinitionsTable)
      .where(eq(questDefinitionsTable.id, assignment.questDefinitionId)).limit(1);

    const newStatus = quest.requiresVerification ? "submitted" : "completed";
    const now = new Date();

    // Photo verification: a proof photo is required to submit
    let proofPhotoPath: string | null = null;
    if (quest.requiresVerification && quest.verificationType === "photo") {
      const photoPath = req.body?.photoPath;
      if (typeof photoPath !== "string" || !photoPath.startsWith("/objects/uploads/")) {
        res.status(400).json({ error: "This quest needs a photo as proof" });
        return;
      }
      proofPhotoPath = photoPath;
    }

    // Compare-and-set: only one concurrent complete can win the active→done transition
    const updated = await db.update(questAssignmentsTable).set({
      status: newStatus,
      completedAt: now,
      verificationNote: req.body?.note ?? null,
      proofPhotoPath,
      xpAwarded: quest.xpReward,
      goldAwarded: quest.goldReward,
      partyGoldAwarded: quest.partyGoldReward,
    }).where(and(
      eq(questAssignmentsTable.id, assignmentId),
      eq(questAssignmentsTable.status, "active"),
    )).returning({ id: questAssignmentsTable.id });
    if (updated.length === 0) { res.status(400).json({ error: "Quest not active" }); return; }

    let xpGained = 0;
    let goldGained = 0;
    let newLevel: number | undefined;
    let leveledUp = false;

    if (newStatus === "completed") {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
      const newXp = user.lifetimeXp + quest.xpReward;
      newLevel = levelFromXp(newXp);
      leveledUp = newLevel > user.currentLevel;
      xpGained = quest.xpReward;
      goldGained = quest.goldReward;
      await db.update(usersTable).set({
        lifetimeXp: newXp, currentLevel: newLevel,
        personalGold: user.personalGold + quest.goldReward,
        ...(quest.isLegendary ? { legendaryCompletions: user.legendaryCompletions + 1 } : {}),
        updatedAt: now,
      }).where(eq(usersTable.id, req.userId!));

      const [party] = await db.select({ partyGoldReserve: partiesTable.partyGoldReserve })
        .from(partiesTable).where(eq(partiesTable.id, assignment.partyId)).limit(1);
      if (party) {
        await db.update(partiesTable).set({
          partyGoldReserve: party.partyGoldReserve + quest.partyGoldReward,
          updatedAt: now,
        }).where(eq(partiesTable.id, assignment.partyId));
      }
    }

    res.json({ status: newStatus, xpAwarded: quest.xpReward, goldAwarded: quest.goldReward, xpGained, goldGained, newLevel, leveledUp });
  } catch (err) {
    console.error("quest-assignments error:", err);
    res.status(500).json({ error: "Failed" });
  }
});

// POST /api/quest-assignments/:assignmentId/submit-verification
// Kid/member marks their quest as done and awaiting leader sign-off.
router.post("/:assignmentId/submit-verification", requireAuth, async (req, res) => {
  try {
    const assignmentId = parseInt(String(req.params.assignmentId));
    const [assignment] = await db.select().from(questAssignmentsTable)
      .where(eq(questAssignmentsTable.id, assignmentId)).limit(1);
    if (!assignment || assignment.userId !== req.userId) {
      res.status(403).json({ error: "Not your quest" }); return;
    }
    if (assignment.status !== "active") {
      res.status(400).json({ error: "Quest not active" }); return;
    }
    await db.update(questAssignmentsTable).set({
      status: "submitted",
      completedAt: new Date(),
      verificationNote: req.body?.note ?? null,
    }).where(eq(questAssignmentsTable.id, assignmentId));
    res.json({ status: "submitted" });
  } catch (err) {
    console.error("quest-assignments error:", err);
    res.status(500).json({ error: "Failed" });
  }
});

// POST /api/quest-assignments/:assignmentId/verify
// Leader approves or rejects a submitted quest.
router.post("/:assignmentId/verify", requireAuth, async (req, res) => {
  try {
    const assignmentId = parseInt(String(req.params.assignmentId));
    const [assignment] = await db.select().from(questAssignmentsTable)
      .where(eq(questAssignmentsTable.id, assignmentId)).limit(1);
    if (!assignment) { res.status(404).json({ error: "Not found" }); return; }
    if (assignment.status !== "submitted") { res.status(400).json({ error: "Not submitted" }); return; }
    await assertLeader(assignment.partyId, req.userId!);

    const { approved, note } = req.body;
    const newStatus = approved ? "completed" : "active";
    const now = new Date();

    // Compare-and-set: only one concurrent verify can win the submitted→done transition
    const updated = await db.update(questAssignmentsTable).set({
      status: newStatus,
      reviewedBy: req.userId!,
      verificationNote: note ?? assignment.verificationNote,
      // Rejected: clear the proof photo so a fresh one is required next time
      ...(approved ? {} : { proofPhotoPath: null, completedAt: null }),
    }).where(and(
      eq(questAssignmentsTable.id, assignmentId),
      eq(questAssignmentsTable.status, "submitted"),
    )).returning({ id: questAssignmentsTable.id });
    if (updated.length === 0) { res.status(400).json({ error: "Not submitted" }); return; }

    if (approved && assignment.userId) {
      const [quest] = await db.select().from(questDefinitionsTable)
        .where(eq(questDefinitionsTable.id, assignment.questDefinitionId)).limit(1);
      const [user] = await db.select().from(usersTable)
        .where(eq(usersTable.id, assignment.userId)).limit(1);
      const newXp = user.lifetimeXp + quest.xpReward;
      const newLevel = levelFromXp(newXp);
      await db.update(usersTable).set({
        lifetimeXp: newXp, currentLevel: newLevel,
        personalGold: user.personalGold + quest.goldReward,
        updatedAt: now,
      }).where(eq(usersTable.id, assignment.userId));
      const [party] = await db.select({ partyGoldReserve: partiesTable.partyGoldReserve })
        .from(partiesTable).where(eq(partiesTable.id, assignment.partyId)).limit(1);
      if (party) {
        await db.update(partiesTable).set({
          partyGoldReserve: party.partyGoldReserve + quest.partyGoldReward,
          updatedAt: now,
        }).where(eq(partiesTable.id, assignment.partyId));
      }
    }
    res.json({ status: newStatus });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

export default router;
