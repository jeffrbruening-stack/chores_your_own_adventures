import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable, partiesTable, partyMembersTable, charactersTable,
  questAssignmentsTable, questDefinitionsTable, partyGoalsTable,
  equippedItemsTable, shopItemsTable, catFoleyAppearancesTable,
  questProposalsTable, bonusGoldRequestsTable,
} from "@workspace/db/schema";
import { eq, and, inArray, count } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { xpForLevel } from "../lib/rewards.js";
import { toUserProfile } from "./auth.js";
import { assertMember } from "../lib/party.js";
import { ensureRoutineAssignments, isAssignmentVisibleNow, tzOffsetFromHeader } from "../lib/routine.js";

const router = Router();

// Shared assignment+definition select (canonical — same fields as /assignments/mine)
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
  xpReward: questDefinitionsTable.xpReward,
  goldReward: questDefinitionsTable.goldReward,
  partyGoldReward: questDefinitionsTable.partyGoldReward,
  questType: questDefinitionsTable.questType,
  timeWindowStart: questDefinitionsTable.timeWindowStart,
  timeWindowEnd: questDefinitionsTable.timeWindowEnd,
  isRoutine: questDefinitionsTable.isRoutine,
  routineSchedule: questDefinitionsTable.routineSchedule,
};

// GET /api/home/give-me-a-quest?partyId=
// Canonical "Give Me a Quest" endpoint.
// Priority: existing active/submitted → soon-expiring first → any active → then claim an open quest.
router.get("/give-me-a-quest", requireAuth, async (req, res) => {
  try {
    const partyId = parseInt(req.query.partyId as string);
    if (!partyId) { res.status(400).json({ error: "partyId required" }); return; }
    await assertMember(partyId, req.userId!);

    // Re-issue any routine quests due today so "Give me a quest!" sees them
    await ensureRoutineAssignments(req.userId!, partyId, tzOffsetFromHeader(req.headers["x-tz-offset"]));

    // 1. Check for existing active/submitted assignments (same filter as Home)
    const activeAssignments = await db.select(ASSIGNMENT_SELECT)
      .from(questAssignmentsTable)
      .innerJoin(questDefinitionsTable, eq(questDefinitionsTable.id, questAssignmentsTable.questDefinitionId))
      .where(and(
        eq(questAssignmentsTable.userId, req.userId!),
        eq(questAssignmentsTable.partyId, partyId),
        inArray(questAssignmentsTable.status, ["active", "submitted"]),
        eq(questDefinitionsTable.isArchived, false),
      ));

    const tz = tzOffsetFromHeader(req.headers["x-tz-offset"]);
    const visibleAssignments = activeAssignments.filter((a) => isAssignmentVisibleNow(a, tz));
    if (visibleAssignments.length > 0) {
      // Prioritise: expiring soonest → submitted (needs action) → then any active
      const sorted = [...visibleAssignments].sort((a, b) => {
        // Timed quests with expiry come first (ascending expiry)
        if (a.expiresAt && b.expiresAt) return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
        if (a.expiresAt && !b.expiresAt) return -1;
        if (!a.expiresAt && b.expiresAt) return 1;
        // Then submitted (needs leader attention / waiting review)
        if (a.status === "submitted" && b.status !== "submitted") return -1;
        if (a.status !== "submitted" && b.status === "submitted") return 1;
        return 0;
      });
      res.json({ hasQuest: true, quest: sorted[0], assignmentId: sorted[0].id, newlyAssigned: false });
      return;
    }

    // 2. No active assignments — try to assign an available open quest
    const openDefs = await db.select().from(questDefinitionsTable)
      .where(and(
        eq(questDefinitionsTable.partyId, partyId),
        eq(questDefinitionsTable.questType, "open"),
        eq(questDefinitionsTable.isArchived, false),
        eq(questDefinitionsTable.isPaused, false),
      ));

    if (openDefs.length === 0) {
      res.json({ hasQuest: false, message: "All clear! No quests available right now. Take a break, hero!" });
      return;
    }

    const questDef = openDefs[Math.floor(Math.random() * openDefs.length)];
    const [assignment] = await db.insert(questAssignmentsTable).values({
      questDefinitionId: questDef.id,
      userId: req.userId!,
      partyId,
      status: "active",
      claimedBy: req.userId!,
    }).returning();

    // Return the same shape as an assignment+definition join
    const newQuest = {
      id: assignment.id,
      questDefinitionId: questDef.id,
      status: "active",
      expiresAt: assignment.expiresAt,
      completedAt: null,
      xpAwarded: 0,
      goldAwarded: 0,
      partyGoldAwarded: 0,
      plainTitle: questDef.plainTitle,
      adventureTitle: questDef.adventureTitle,
      description: questDef.description,
      difficulty: questDef.difficulty,
      isLegendary: questDef.isLegendary,
      requiresVerification: questDef.requiresVerification,
      xpReward: questDef.xpReward,
      goldReward: questDef.goldReward,
      partyGoldReward: questDef.partyGoldReward,
      questType: questDef.questType,
      timeWindowStart: questDef.timeWindowStart,
      timeWindowEnd: questDef.timeWindowEnd,
    };
    res.json({ hasQuest: true, quest: newQuest, assignmentId: assignment.id, newlyAssigned: true });
  } catch (err: any) {
    console.error("give-me-a-quest error:", err);
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

// GET /api/home
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) { res.status(404).json({ error: "Not found" }); return; }

    const partyId = user.activePartyId;
    const tz = tzOffsetFromHeader(req.headers["x-tz-offset"]);

    // Fetch party data, membership, and goal in parallel before issuing routines.
    const [activeParty, membership] = partyId ? await Promise.all([
      db.select({
        id: partiesTable.id,
        name: partiesTable.name,
        partyGoldReserve: partiesTable.partyGoldReserve,
        routinesPaused: partiesTable.routinesPaused,
      }).from(partiesTable).where(eq(partiesTable.id, partyId)).limit(1).then(r => r[0] ?? null),
      db.select({ role: partyMembersTable.role })
        .from(partyMembersTable)
        .where(and(eq(partyMembersTable.partyId, partyId), eq(partyMembersTable.userId, userId)))
        .limit(1).then(r => r[0] ?? null),
    ]) : [null, null];

    // Re-issue routine quests only when the user is an active member and
    // the party has not paused routines. A stale activePartyId (user was
    // removed) produces membership === null, so issuance is skipped.
    if (partyId && membership && !activeParty?.routinesPaused) {
      await ensureRoutineAssignments(userId, partyId, tz);
    }

    // Character
    const [character] = await db.select().from(charactersTable)
      .where(eq(charactersTable.userId, userId)).limit(1);

    // Active quests for user — canonical filter (same as /assignments/mine)
    const myQuests = partyId ? await db.select({
      id: questAssignmentsTable.id,
      questDefinitionId: questAssignmentsTable.questDefinitionId,
      status: questAssignmentsTable.status,
      xpAwarded: questAssignmentsTable.xpAwarded,
      goldAwarded: questAssignmentsTable.goldAwarded,
      partyGoldAwarded: questAssignmentsTable.partyGoldAwarded,
      expiresAt: questAssignmentsTable.expiresAt,
      completedAt: questAssignmentsTable.completedAt,
      plainTitle: questDefinitionsTable.plainTitle,
      adventureTitle: questDefinitionsTable.adventureTitle,
      description: questDefinitionsTable.description,
      difficulty: questDefinitionsTable.difficulty,
      isLegendary: questDefinitionsTable.isLegendary,
      requiresVerification: questDefinitionsTable.requiresVerification,
      xpReward: questDefinitionsTable.xpReward,
      goldReward: questDefinitionsTable.goldReward,
      partyGoldReward: questDefinitionsTable.partyGoldReward,
      questType: questDefinitionsTable.questType,
      timeWindowStart: questDefinitionsTable.timeWindowStart,
      timeWindowEnd: questDefinitionsTable.timeWindowEnd,
      isRoutine: questDefinitionsTable.isRoutine,
      routineSchedule: questDefinitionsTable.routineSchedule,
    }).from(questAssignmentsTable)
      .innerJoin(questDefinitionsTable, eq(questDefinitionsTable.id, questAssignmentsTable.questDefinitionId))
      .where(and(
        eq(questAssignmentsTable.userId, userId),
        eq(questAssignmentsTable.partyId, partyId),
        inArray(questAssignmentsTable.status, ["active", "submitted"]),
        eq(questDefinitionsTable.isArchived, false),
      )).then(rows => rows.filter((a) => isAssignmentVisibleNow(a, tz))) : [];

    // Active party goal
    const [activeGoal] = partyId ? await db.select().from(partyGoalsTable)
      .where(and(eq(partyGoalsTable.partyId, partyId), eq(partyGoalsTable.status, "active"))).limit(1) : [null];

    // Pending verifications count (for leaders)
    let pendingVerificationsCount = 0;
    let proposedQuestsCount = 0;
    let bonusRequestsCount = 0;
    if (partyId && (membership?.role === "leader" || membership?.role === "adult")) {
      const [vc] = await db.select({ count: count() }).from(questAssignmentsTable)
        .where(and(eq(questAssignmentsTable.partyId, partyId), eq(questAssignmentsTable.status, "submitted")));
      pendingVerificationsCount = Number(vc?.count ?? 0);
      const [pc] = await db.select({ count: count() }).from(questProposalsTable)
        .where(and(eq(questProposalsTable.partyId, partyId), eq(questProposalsTable.status, "pending")));
      proposedQuestsCount = Number(pc?.count ?? 0);
      const [bc] = await db.select({ count: count() }).from(bonusGoldRequestsTable)
        .where(and(eq(bonusGoldRequestsTable.partyId, partyId), eq(bonusGoldRequestsTable.status, "pending")));
      bonusRequestsCount = Number(bc?.count ?? 0);
    }

    // XP for next level
    const xpNext = xpForLevel(user.currentLevel + 1) - xpForLevel(user.currentLevel);

    res.json({
      user: await toUserProfile(user.id),
      character: character ?? null,
      activeParty: activeParty ?? null,
      myRole: membership?.role ?? null,
      myQuests,
      xpForNextLevel: xpNext,
      partyGoldReserve: activeParty?.partyGoldReserve ?? 0,
      activeGoal: activeGoal
        ? { ...activeGoal, currentGold: activeParty?.partyGoldReserve ?? 0 }
        : null,
      pendingVerificationsCount,
      proposedQuestsCount,
      bonusRequestsCount,
      catFoleyActive: false,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

export default router;
