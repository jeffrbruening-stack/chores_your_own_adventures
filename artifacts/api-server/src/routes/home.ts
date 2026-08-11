import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable, partiesTable, partyMembersTable, charactersTable,
  questAssignmentsTable, questDefinitionsTable, partyGoalsTable,
  equippedItemsTable, shopItemsTable, catFoleyAppearancesTable,
  questProposalsTable,
} from "@workspace/db/schema";
import { eq, and, inArray, count } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { xpForLevel } from "../lib/rewards.js";
import { toUserProfile } from "./auth.js";

const router = Router();

// GET /api/home
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) { res.status(404).json({ error: "Not found" }); return; }

    const partyId = user.activePartyId;

    // Character
    const [character] = await db.select().from(charactersTable)
      .where(eq(charactersTable.userId, userId)).limit(1);

    // Active quests for user
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
      difficulty: questDefinitionsTable.difficulty,
      isLegendary: questDefinitionsTable.isLegendary,
      requiresVerification: questDefinitionsTable.requiresVerification,
      xpReward: questDefinitionsTable.xpReward,
      goldReward: questDefinitionsTable.goldReward,
      partyGoldReward: questDefinitionsTable.partyGoldReward,
      questType: questDefinitionsTable.questType,
    }).from(questAssignmentsTable)
      .innerJoin(questDefinitionsTable, eq(questDefinitionsTable.id, questAssignmentsTable.questDefinitionId))
      .where(and(
        eq(questAssignmentsTable.userId, userId),
        eq(questAssignmentsTable.partyId, partyId),
        inArray(questAssignmentsTable.status, ["active", "submitted"]),
      )) : [];

    // Active party
    const [activeParty] = partyId ? await db.select({
      id: partiesTable.id,
      name: partiesTable.name,
      partyGoldReserve: partiesTable.partyGoldReserve,
      routinesPaused: partiesTable.routinesPaused,
    }).from(partiesTable).where(eq(partiesTable.id, partyId)).limit(1) : [null];

    // Active party goal
    const [activeGoal] = partyId ? await db.select().from(partyGoalsTable)
      .where(and(eq(partyGoalsTable.partyId, partyId), eq(partyGoalsTable.status, "active"))).limit(1) : [null];

    // My role in party
    const [membership] = partyId ? await db.select({ role: partyMembersTable.role })
      .from(partyMembersTable)
      .where(and(eq(partyMembersTable.partyId, partyId), eq(partyMembersTable.userId, userId)))
      .limit(1) : [null];

    // Pending verifications count (for leaders)
    let pendingVerificationsCount = 0;
    let proposedQuestsCount = 0;
    if (partyId && (membership?.role === "leader" || membership?.role === "adult")) {
      const [vc] = await db.select({ count: count() }).from(questAssignmentsTable)
        .where(and(eq(questAssignmentsTable.partyId, partyId), eq(questAssignmentsTable.status, "submitted")));
      pendingVerificationsCount = Number(vc?.count ?? 0);
      const [pc] = await db.select({ count: count() }).from(questProposalsTable)
        .where(and(eq(questProposalsTable.partyId, partyId), eq(questProposalsTable.status, "pending")));
      proposedQuestsCount = Number(pc?.count ?? 0);
    }

    // Cat Foley active?
    const now = new Date();
    const [catFoley] = partyId ? await db.select().from(catFoleyAppearancesTable)
      .where(and(
        eq(catFoleyAppearancesTable.partyId, partyId),
      )).limit(1) : [null]; // simplified

    // XP for next level
    const xpNext = xpForLevel(user.currentLevel + 1) - xpForLevel(user.currentLevel);

    res.json({
      user: toUserProfile(user),
      character: character ?? null,
      activeParty: activeParty ?? null,
      myRole: membership?.role ?? null,
      myQuests,
      xpForNextLevel: xpNext,
      partyGoldReserve: activeParty?.partyGoldReserve ?? 0,
      activeGoal: activeGoal ?? null,
      pendingVerificationsCount,
      proposedQuestsCount,
      catFoleyActive: false, // simplified
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

export default router;
