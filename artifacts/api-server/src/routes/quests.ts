import { Router } from "express";
import { db } from "@workspace/db";
import {
  questDefinitionsTable, questAssignmentsTable, questProposalsTable,
  usersTable, quickQuestsTable, partyMembersTable,
} from "@workspace/db/schema";
import { eq, and, inArray, count, asc, notInArray, ne } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { assertLeader, assertMember, getMemberRole } from "../lib/party.js";
import { DIFFICULTY_REWARDS, levelFromXp } from "../lib/rewards.js";
import { ensureRoutineAssignments, isAssignmentVisibleNow, tzOffsetFromHeader } from "../lib/routine.js";

const router = Router();

const QUEST_SELECT = {
  id: questDefinitionsTable.id,
  partyId: questDefinitionsTable.partyId,
  creatorId: questDefinitionsTable.creatorId,
  plainTitle: questDefinitionsTable.plainTitle,
  adventureTitle: questDefinitionsTable.adventureTitle,
  description: questDefinitionsTable.description,
  questType: questDefinitionsTable.questType,
  difficulty: questDefinitionsTable.difficulty,
  isLegendary: questDefinitionsTable.isLegendary,
  requiresVerification: questDefinitionsTable.requiresVerification,
  verificationType: questDefinitionsTable.verificationType,
  xpReward: questDefinitionsTable.xpReward,
  goldReward: questDefinitionsTable.goldReward,
  partyGoldReward: questDefinitionsTable.partyGoldReward,
  isRoutine: questDefinitionsTable.isRoutine,
  routineSchedule: questDefinitionsTable.routineSchedule,
  scheduledDate: questDefinitionsTable.scheduledDate,
  timeWindowStart: questDefinitionsTable.timeWindowStart,
  timeWindowEnd: questDefinitionsTable.timeWindowEnd,
  isPaused: questDefinitionsTable.isPaused,
  isArchived: questDefinitionsTable.isArchived,
  createdAt: questDefinitionsTable.createdAt,
};

// Shared assignment+definition select shape — used across multiple endpoints
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

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTANT: All static/sub-path routes MUST appear before /:questId
// to prevent Express from routing e.g. GET /open as GET /:questId with id='open'
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/quests?partyId=
router.get("/", requireAuth, async (req, res) => {
  try {
    const partyId = parseInt(req.query.partyId as string);
    if (!partyId) { res.status(400).json({ error: "partyId required" }); return; }
    await assertMember(partyId, req.userId!);
    const quests = await db.select(QUEST_SELECT).from(questDefinitionsTable)
      .where(and(
        eq(questDefinitionsTable.partyId, partyId),
        eq(questDefinitionsTable.isArchived, false),
      )).orderBy(asc(questDefinitionsTable.createdAt));
    res.json(quests);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

// POST /api/quests — create quest
router.post("/", requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const {
      partyId, plainTitle, adventureTitle, description, questType,
      difficulty, isLegendary, assignedUserIds, requiresVerification, verificationType,
      xpReward, goldReward, partyGoldReward, isRoutine, routineSchedule,
      timeWindowStart, timeWindowEnd, schoolCalendarId,
      // Schedule fields from new UI
      scheduleType, scheduledDate, recurrenceDays,
    } = req.body;
    if (!partyId || !plainTitle) { res.status(400).json({ error: "partyId and plainTitle required" }); return; }
    const role = await getMemberRole(partyId, userId);
    if (!role) { res.status(403).json({ error: "Not a member" }); return; }

    // Kids can't create live quests — their ideas become proposals a grown-up reviews.
    if (role === "kid") {
      const [proposal] = await db.insert(questProposalsTable).values({
        partyId, proposedBy: userId,
        plainTitle, adventureTitle, description,
        difficulty: (difficulty && difficulty in DIFFICULTY_REWARDS ? difficulty : "normal") as any,
      }).returning();
      res.status(201).json({ ...proposal, proposed: true });
      return;
    }

    const rewards = DIFFICULTY_REWARDS[difficulty as keyof typeof DIFFICULTY_REWARDS] ?? DIFFICULTY_REWARDS.normal;

    // Derive isRoutine / routineSchedule from scheduleType + recurrenceDays when provided
    if (scheduleType === 'recurring' && (!Array.isArray(recurrenceDays) || recurrenceDays.length === 0) && !routineSchedule) {
      res.status(400).json({ error: "Recurring quests need at least one repeat day" });
      return;
    }
    if ((timeWindowStart && !timeWindowEnd) || (!timeWindowStart && timeWindowEnd)) {
      res.status(400).json({ error: "Time window needs both start and end" });
      return;
    }
    const effectiveIsRoutine = scheduleType === 'recurring' ? true : (scheduleType === 'date' ? false : (isRoutine ?? false));
    const effectiveRoutineSchedule =
      Array.isArray(recurrenceDays) && recurrenceDays.length > 0
        ? JSON.stringify({ days: recurrenceDays })
        : (routineSchedule ?? null);
    const effectiveScheduledDate = scheduleType === 'date' ? (scheduledDate ?? null) : null;

    const [quest] = await db.insert(questDefinitionsTable).values({
      partyId, creatorId: userId,
      plainTitle, adventureTitle, description,
      questType: questType ?? "individual",
      difficulty: difficulty ?? "normal",
      isLegendary: isLegendary ?? false,
      assignedToUserIds: assignedUserIds ?? null,
      requiresVerification: (requiresVerification ?? false) || !!verificationType,
      verificationType: verificationType === 'photo' || verificationType === 'inspection'
        ? verificationType
        : (requiresVerification ? 'inspection' : null),
      xpReward: xpReward ?? rewards.xp,
      goldReward: goldReward ?? rewards.gold,
      partyGoldReward: partyGoldReward ?? rewards.partyGold,
      isRoutine: effectiveIsRoutine,
      routineSchedule: effectiveRoutineSchedule,
      scheduledDate: effectiveScheduledDate,
      timeWindowStart: timeWindowStart ?? null,
      timeWindowEnd: timeWindowEnd ?? null,
      schoolCalendarId: schoolCalendarId ?? null,
    }).returning();

    // Individual quest: create assignment(s) for each assigned user
    if (questType === "individual" && Array.isArray(assignedUserIds) && assignedUserIds.length > 0) {
      for (const uid of assignedUserIds) {
        await db.insert(questAssignmentsTable).values({
          questDefinitionId: quest.id,
          userId: uid,
          partyId,
          status: "active",
        });
      }
    }

    // Party quest: create an active assignment for every current party member
    if (questType === "party") {
      const members = await db
        .select({ userId: partyMembersTable.userId })
        .from(partyMembersTable)
        .where(eq(partyMembersTable.partyId, partyId));
      if (members.length > 0) {
        await db.insert(questAssignmentsTable).values(
          members.map((m) => ({
            questDefinitionId: quest.id,
            userId: m.userId,
            partyId,
            status: "active" as const,
          }))
        );
      }
    }

    res.status(201).json(quest);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

// ─── SUB-ROUTES (must come before /:questId) ────────────────────────────────

// GET /api/quests/assignments/mine?partyId= — canonical active assignments for current user
router.get("/assignments/mine", requireAuth, async (req, res) => {
  try {
    const partyId = parseInt(req.query.partyId as string);
    const tz = tzOffsetFromHeader(req.headers["x-tz-offset"]);
    if (partyId) await assertMember(partyId, req.userId!);
    if (partyId) await ensureRoutineAssignments(req.userId!, partyId, tz);

    // Fetch active, submitted, AND completed (completed needed for "waiting on" state)
    const assignments = await db.select(ASSIGNMENT_SELECT)
      .from(questAssignmentsTable)
      .innerJoin(questDefinitionsTable, eq(questDefinitionsTable.id, questAssignmentsTable.questDefinitionId))
      .where(and(
        eq(questAssignmentsTable.userId, req.userId!),
        ...(partyId ? [eq(questAssignmentsTable.partyId, partyId)] : []),
        inArray(questAssignmentsTable.status, ["active", "submitted", "completed"]),
        eq(questDefinitionsTable.isArchived, false),
      ));

    const visible = assignments.filter((a) => isAssignmentVisibleNow(a, tz));

    // Look up co-assignees for multi-person quests
    const questDefIds = [...new Set(visible.map(a => a.questDefinitionId))];
    type CoRow = { userId: number; questDefinitionId: number; status: string; name: string | null };
    let coRows: CoRow[] = [];
    if (questDefIds.length > 0 && partyId) {
      coRows = await db.select({
        userId: questAssignmentsTable.userId,
        questDefinitionId: questAssignmentsTable.questDefinitionId,
        status: questAssignmentsTable.status,
        name: usersTable.displayName,
      })
        .from(questAssignmentsTable)
        .leftJoin(usersTable, eq(usersTable.id, questAssignmentsTable.userId))
        .where(and(
          inArray(questAssignmentsTable.questDefinitionId, questDefIds),
          eq(questAssignmentsTable.partyId, partyId),
          ne(questAssignmentsTable.userId, req.userId!),
        )) as CoRow[];
    }

    // Group co-assignees by quest definition id
    const coByQuest: Record<number, { name: string; completed: boolean }[]> = {};
    for (const row of coRows) {
      if (!coByQuest[row.questDefinitionId]) coByQuest[row.questDefinitionId] = [];
      coByQuest[row.questDefinitionId].push({
        name: row.name ?? "Adventurer",
        completed: row.status === "completed" || row.status === "submitted",
      });
    }

    // Drop completed solo assignments; drop completed party assignments where everyone else is also done
    const result = visible
      .filter(a => {
        if (a.status !== "completed") return true;
        const co = coByQuest[a.questDefinitionId] ?? [];
        return co.length > 0 && co.some(c => !c.completed); // keep only if someone still pending
      })
      .map(a => ({ ...a, coAssignees: coByQuest[a.questDefinitionId] ?? [] }));

    res.json(result);
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

// POST /api/quests/assignments/:assignmentId/complete
router.post("/assignments/:assignmentId/complete", requireAuth, async (req, res) => {
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
        lifetimeXp: newXp,
        currentLevel: newLevel,
        personalGold: user.personalGold + quest.goldReward,
        ...(quest.isLegendary ? { legendaryCompletions: user.legendaryCompletions + 1 } : {}),
        updatedAt: now,
      }).where(eq(usersTable.id, req.userId!));

      const { partiesTable } = await import("@workspace/db/schema");
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
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

// POST /api/quests/assignments/:assignmentId/proof-upload-url — signed URL for the kid to upload a proof photo
router.post("/assignments/:assignmentId/proof-upload-url", requireAuth, async (req, res) => {
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
    const [quest] = await db.select({
      requiresVerification: questDefinitionsTable.requiresVerification,
      verificationType: questDefinitionsTable.verificationType,
    }).from(questDefinitionsTable)
      .where(eq(questDefinitionsTable.id, assignment.questDefinitionId)).limit(1);
    if (!quest?.requiresVerification || quest.verificationType !== "photo") {
      res.status(400).json({ error: "This quest doesn't need a photo" }); return;
    }
    const { ObjectStorageService } = await import("../lib/objectStorage.js");
    const storage = new ObjectStorageService();
    const uploadURL = await storage.getObjectEntityUploadURL();
    const objectPath = storage.normalizeObjectEntityPath(uploadURL.split("?")[0]);
    res.json({ uploadURL, objectPath });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

// GET /api/quests/assignments/:assignmentId/proof-image?token= — serve the proof photo.
// <img> tags can't send Authorization headers, so the JWT is passed as a query
// param. Unlike portraits, chore photos are private: only party members may view.
router.get("/assignments/:assignmentId/proof-image", async (req, res) => {
  try {
    const assignmentId = parseInt(String(req.params.assignmentId));
    if (!assignmentId) { res.status(400).json({ error: "Invalid id" }); return; }
    const { verifyToken } = await import("../lib/auth.js");
    const payload = verifyToken(String(req.query.token ?? ""));
    if (!payload) { res.status(401).json({ error: "Unauthorized" }); return; }
    const [assignment] = await db.select({
      proofPhotoPath: questAssignmentsTable.proofPhotoPath,
      partyId: questAssignmentsTable.partyId,
    }).from(questAssignmentsTable).where(eq(questAssignmentsTable.id, assignmentId)).limit(1);
    if (!assignment?.proofPhotoPath) { res.status(404).json({ error: "No photo" }); return; }
    const role = await getMemberRole(assignment.partyId, payload.userId);
    if (!role) { res.status(403).json({ error: "Not a member" }); return; }
    const { ObjectStorageService, ObjectNotFoundError } = await import("../lib/objectStorage.js");
    const storage = new ObjectStorageService();
    try {
      const file = await storage.getObjectEntityFile(assignment.proofPhotoPath);
      const response = await storage.downloadObject(file, 3600);
      response.headers.forEach((v: string, k: string) => res.setHeader(k, v));
      const buf = Buffer.from(await response.arrayBuffer());
      res.end(buf);
    } catch (err) {
      if (err instanceof ObjectNotFoundError) { res.status(404).json({ error: "No photo" }); return; }
      throw err;
    }
  } catch (err) {
    console.error("Proof photo serve failed:", err);
    if (!res.headersSent) res.status(500).json({ error: "Failed" });
  }
});

// POST /api/quests/assignments/:assignmentId/verify (leader verifies submitted quest)
router.post("/assignments/:assignmentId/verify", requireAuth, async (req, res) => {
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
      const { partiesTable } = await import("@workspace/db/schema");
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

// POST /api/quests/give-me-one?partyId= — assign a random open quest (if no active assigned quests)
router.post("/give-me-one", requireAuth, async (req, res) => {
  try {
    const partyId = parseInt(req.query.partyId as string || req.body.partyId);
    if (!partyId) { res.status(400).json({ error: "partyId required" }); return; }
    await assertMember(partyId, req.userId!);
    const openQuests = await db.select(QUEST_SELECT).from(questDefinitionsTable)
      .where(and(
        eq(questDefinitionsTable.partyId, partyId),
        eq(questDefinitionsTable.questType, "open"),
        eq(questDefinitionsTable.isArchived, false),
        eq(questDefinitionsTable.isPaused, false),
      ));
    if (openQuests.length === 0) { res.status(404).json({ error: "No open quests available" }); return; }
    const quest = openQuests[Math.floor(Math.random() * openQuests.length)];
    const [assignment] = await db.insert(questAssignmentsTable).values({
      questDefinitionId: quest.id,
      userId: req.userId!,
      partyId,
      status: "active",
      claimedBy: req.userId!,
    }).returning();
    res.json({ quest, assignment });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

// GET /api/quests/open?partyId=
router.get("/open", requireAuth, async (req, res) => {
  try {
    const partyId = parseInt(req.query.partyId as string);
    if (!partyId) { res.status(400).json({ error: "partyId required" }); return; }
    await assertMember(partyId, req.userId!);
    const quests = await db.select(QUEST_SELECT).from(questDefinitionsTable)
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

// GET /api/quests/pending-verification?partyId=
router.get("/pending-verification", requireAuth, async (req, res) => {
  try {
    const partyId = parseInt(req.query.partyId as string);
    if (!partyId) { res.status(400).json({ error: "partyId required" }); return; }
    await assertLeader(partyId, req.userId!);
    const assignments = await db.select({
      id: questAssignmentsTable.id,
      userId: questAssignmentsTable.userId,
      questDefinitionId: questAssignmentsTable.questDefinitionId,
      status: questAssignmentsTable.status,
      completedAt: questAssignmentsTable.completedAt,
      verificationNote: questAssignmentsTable.verificationNote,
      proofPhotoPath: questAssignmentsTable.proofPhotoPath,
      plainTitle: questDefinitionsTable.plainTitle,
      adventureTitle: questDefinitionsTable.adventureTitle,
      description: questDefinitionsTable.description,
      difficulty: questDefinitionsTable.difficulty,
      isLegendary: questDefinitionsTable.isLegendary,
      requiresVerification: questDefinitionsTable.requiresVerification,
      verificationType: questDefinitionsTable.verificationType,
      xpReward: questDefinitionsTable.xpReward,
      goldReward: questDefinitionsTable.goldReward,
      partyGoldReward: questDefinitionsTable.partyGoldReward,
      questType: questDefinitionsTable.questType,
    }).from(questAssignmentsTable)
      .innerJoin(questDefinitionsTable, eq(questDefinitionsTable.id, questAssignmentsTable.questDefinitionId))
      .where(and(
        eq(questAssignmentsTable.partyId, partyId),
        eq(questAssignmentsTable.status, "submitted"),
      ));
    res.json(assignments);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

// POST /api/quests/propose
router.post("/propose", requireAuth, async (req, res) => {
  try {
    const { partyId, plainTitle, adventureTitle, description, difficulty } = req.body;
    await assertMember(partyId, req.userId!);
    const [proposal] = await db.insert(questProposalsTable).values({
      partyId, proposedBy: req.userId!,
      plainTitle, adventureTitle, description,
      difficulty: difficulty ?? "normal",
    }).returning();
    res.status(201).json(proposal);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

// Shared: list pending proposals for a party, shaped like the spec's QuestDefinition
async function listPendingProposals(partyId: number) {
  const rows = await db.select({
    proposal: questProposalsTable,
    proposerName: usersTable.displayName,
  })
    .from(questProposalsTable)
    .leftJoin(usersTable, eq(usersTable.id, questProposalsTable.proposedBy))
    .where(and(
      eq(questProposalsTable.partyId, partyId),
      eq(questProposalsTable.status, "pending"),
    ));
  return rows.map(({ proposal: p, proposerName }) => ({
    id: p.id,
    partyId: p.partyId,
    plainTitle: p.plainTitle,
    adventureTitle: p.adventureTitle,
    description: p.description,
    questType: "individual",
    difficulty: p.difficulty,
    status: "proposed",
    proposedByUserId: p.proposedBy,
    proposedByName: proposerName,
    proposedDifficulty: p.difficulty,
    xpReward: DIFFICULTY_REWARDS[p.difficulty as keyof typeof DIFFICULTY_REWARDS]?.xp ?? 25,
    goldReward: DIFFICULTY_REWARDS[p.difficulty as keyof typeof DIFFICULTY_REWARDS]?.gold ?? 15,
    partyGoldReward: DIFFICULTY_REWARDS[p.difficulty as keyof typeof DIFFICULTY_REWARDS]?.partyGold ?? 5,
    createdAt: p.createdAt,
  }));
}

// Grown-ups (leaders and adults) review kid suggestions
async function assertAdultOrLeader(partyId: number, userId: number) {
  const role = await getMemberRole(partyId, userId);
  if (role !== "leader" && role !== "adult") {
    throw Object.assign(new Error("Only grown-ups can review suggestions"), { status: 403 });
  }
}

// Shared: claim a pending proposal (compare-and-set so two simultaneous reviews
// can't both win) and, on approve, create the live quest — all in one transaction.
async function reviewProposalTx(
  proposalId: number,
  reviewerId: number,
  approve: boolean,
  note?: string | null,
  difficultyOverride?: string | null,
) {
  return db.transaction(async (tx) => {
    const [claimed] = await tx.update(questProposalsTable)
      .set({ status: approve ? "approved" : "rejected", reviewedBy: reviewerId, reviewNote: note ?? null })
      .where(and(eq(questProposalsTable.id, proposalId), eq(questProposalsTable.status, "pending")))
      .returning();
    if (!claimed) return null; // already reviewed
    if (!approve) return { declined: true as const };
    return { quest: await approveProposal(tx, claimed, reviewerId, difficultyOverride) };
  });
}

// Shared: approve a proposal → live quest assigned to the proposer
async function approveProposal(tx: Pick<typeof db, "insert">, proposal: typeof questProposalsTable.$inferSelect, reviewerId: number, difficultyOverride?: string | null) {
  const difficulty = (difficultyOverride && difficultyOverride in DIFFICULTY_REWARDS
    ? difficultyOverride
    : proposal.difficulty) as keyof typeof DIFFICULTY_REWARDS;
  const rewards = DIFFICULTY_REWARDS[difficulty] ?? DIFFICULTY_REWARDS.normal;
  const [quest] = await tx.insert(questDefinitionsTable).values({
    partyId: proposal.partyId,
    creatorId: reviewerId,
    plainTitle: proposal.plainTitle,
    adventureTitle: proposal.adventureTitle,
    description: proposal.description,
    difficulty: difficulty as any,
    questType: "individual",
    assignedToUserIds: [String(proposal.proposedBy)],
    xpReward: rewards.xp,
    goldReward: rewards.gold,
    partyGoldReward: rewards.partyGold,
  }).returning();
  await tx.insert(questAssignmentsTable).values({
    questDefinitionId: quest.id,
    userId: proposal.proposedBy,
    partyId: proposal.partyId,
    status: "active",
  });
  return quest;
}

// GET /api/quests/proposed?partyId= — spec: listProposedQuests (leader view)
router.get("/proposed", requireAuth, async (req, res) => {
  try {
    const partyId = parseInt(req.query.partyId as string);
    if (!partyId) { res.status(400).json({ error: "partyId required" }); return; }
    await assertAdultOrLeader(partyId, req.userId!);
    res.json(await listPendingProposals(partyId));
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

// GET /api/quests/proposals?partyId= — legacy path, same data
router.get("/proposals", requireAuth, async (req, res) => {
  try {
    const partyId = parseInt(req.query.partyId as string);
    if (!partyId) { res.status(400).json({ error: "partyId required" }); return; }
    await assertAdultOrLeader(partyId, req.userId!);
    res.json(await listPendingProposals(partyId));
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

// POST /api/quests/:questId/review-proposal — spec: reviewQuestProposal (questId = proposal id)
router.post("/:questId/review-proposal", requireAuth, async (req, res) => {
  try {
    const proposalId = parseInt(String(req.params.questId));
    const [proposal] = await db.select().from(questProposalsTable)
      .where(eq(questProposalsTable.id, proposalId)).limit(1);
    if (!proposal) { res.status(404).json({ error: "Not found" }); return; }
    await assertAdultOrLeader(proposal.partyId, req.userId!);
    const { action, difficulty, reason } = req.body;
    if (action !== "approve" && action !== "change_difficulty" && action !== "decline") {
      res.status(400).json({ error: "Invalid action" }); return;
    }
    const approve = action !== "decline";
    const result = await reviewProposalTx(proposalId, req.userId!, approve, reason, difficulty);
    if (!result) { res.status(409).json({ error: "Already reviewed" }); return; }
    res.json("quest" in result ? result.quest : { id: proposalId, status: "declined" });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

// POST /api/quests/proposals/:proposalId/review
router.post("/proposals/:proposalId/review", requireAuth, async (req, res) => {
  try {
    const proposalId = parseInt(String(req.params.proposalId));
    const [proposal] = await db.select().from(questProposalsTable)
      .where(eq(questProposalsTable.id, proposalId)).limit(1);
    if (!proposal) { res.status(404).json({ error: "Not found" }); return; }
    await assertAdultOrLeader(proposal.partyId, req.userId!);
    const { approved, note } = req.body;
    const result = await reviewProposalTx(proposalId, req.userId!, !!approved, note);
    if (!result) { res.status(409).json({ error: "Already reviewed" }); return; }
    res.json({ status: approved ? "approved" : "rejected" });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

// GET /api/quests/quick — quick quest templates
router.get("/quick", requireAuth, async (req, res) => {
  try {
    const quests = await db.select().from(quickQuestsTable)
      .where(eq(quickQuestsTable.isActive, true));
    res.json(quests);
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

// ─── WILD-CARD ROUTES — must come LAST ──────────────────────────────────────

// GET /api/quests/:questId
router.get("/:questId", requireAuth, async (req, res) => {
  try {
    const questId = parseInt(String(req.params.questId));
    if (isNaN(questId)) { res.status(404).json({ error: "Not found" }); return; }
    const [quest] = await db.select(QUEST_SELECT).from(questDefinitionsTable)
      .where(eq(questDefinitionsTable.id, questId)).limit(1);
    if (!quest) { res.status(404).json({ error: "Not found" }); return; }
    await assertMember(quest.partyId, req.userId!);
    res.json(quest);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

// PATCH /api/quests/:questId
router.patch("/:questId", requireAuth, async (req, res) => {
  try {
    const questId = parseInt(String(req.params.questId));
    if (isNaN(questId)) { res.status(404).json({ error: "Not found" }); return; }
    const [existing] = await db.select({ partyId: questDefinitionsTable.partyId })
      .from(questDefinitionsTable).where(eq(questDefinitionsTable.id, questId)).limit(1);
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    await assertLeader(existing.partyId, req.userId!);
    const allowed = ["plainTitle","adventureTitle","description","difficulty","requiresVerification",
      "xpReward","goldReward","partyGoldReward","timeWindowStart","timeWindowEnd","routineSchedule"];
    const updates: any = { updatedAt: new Date() };
    for (const k of allowed) { if (req.body[k] !== undefined) updates[k] = req.body[k]; }
    const [quest] = await db.update(questDefinitionsTable).set(updates)
      .where(eq(questDefinitionsTable.id, questId)).returning();
    res.json(quest);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

// DELETE /api/quests/:questId
router.delete("/:questId", requireAuth, async (req, res) => {
  try {
    const questId = parseInt(String(req.params.questId));
    if (isNaN(questId)) { res.status(404).json({ error: "Not found" }); return; }
    const [existing] = await db.select({ partyId: questDefinitionsTable.partyId })
      .from(questDefinitionsTable).where(eq(questDefinitionsTable.id, questId)).limit(1);
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    await assertLeader(existing.partyId, req.userId!);
    await db.update(questDefinitionsTable).set({ isArchived: true, updatedAt: new Date() })
      .where(eq(questDefinitionsTable.id, questId));
    res.status(204).send();
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

// PATCH /api/quests/:questId/pause
router.patch("/:questId/pause", requireAuth, async (req, res) => {
  try {
    const questId = parseInt(String(req.params.questId));
    if (isNaN(questId)) { res.status(404).json({ error: "Not found" }); return; }
    const [existing] = await db.select({ partyId: questDefinitionsTable.partyId, isPaused: questDefinitionsTable.isPaused })
      .from(questDefinitionsTable).where(eq(questDefinitionsTable.id, questId)).limit(1);
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    await assertLeader(existing.partyId, req.userId!);
    const [quest] = await db.update(questDefinitionsTable)
      .set({ isPaused: !existing.isPaused, updatedAt: new Date() })
      .where(eq(questDefinitionsTable.id, questId)).returning();
    res.json(quest);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

// POST /api/quests/:questId/duplicate
router.post("/:questId/duplicate", requireAuth, async (req, res) => {
  try {
    const questId = parseInt(String(req.params.questId));
    if (isNaN(questId)) { res.status(404).json({ error: "Not found" }); return; }
    const [existing] = await db.select().from(questDefinitionsTable)
      .where(eq(questDefinitionsTable.id, questId)).limit(1);
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    await assertLeader(existing.partyId, req.userId!);
    const { id, createdAt, updatedAt, ...rest } = existing;
    const [newQuest] = await db.insert(questDefinitionsTable).values({
      ...rest,
      plainTitle: `${rest.plainTitle} (copy)`,
      creatorId: req.userId!,
    }).returning();
    res.status(201).json(newQuest);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

export default router;
