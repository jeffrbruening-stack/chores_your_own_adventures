import { Router } from "express";
import { db } from "@workspace/db";
import { bonusGoldRequestsTable, usersTable, questAssignmentsTable, questDefinitionsTable } from "@workspace/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { assertMember, getMemberRole } from "../lib/party.js";

const router = Router();

// POST /api/bonus-requests — kid submits an extra-effort request
router.post("/", requireAuth, async (req, res) => {
  try {
    const { partyId, assignmentId, note } = req.body;
    if (!partyId) { res.status(400).json({ error: "partyId required" }); return; }
    await assertMember(partyId, req.userId!);
    const [row] = await db.insert(bonusGoldRequestsTable).values({
      userId: req.userId!,
      partyId,
      assignmentId: assignmentId ?? null,
      note: note?.trim() ?? null,
      status: "pending",
    }).returning();
    res.status(201).json(row);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

// GET /api/bonus-requests/mine — kid sees their own recent declined requests
router.get("/mine", requireAuth, async (req, res) => {
  try {
    const rows = await db.select({
      id: bonusGoldRequestsTable.id,
      note: bonusGoldRequestsTable.note,
      status: bonusGoldRequestsTable.status,
      bonusGold: bonusGoldRequestsTable.bonusGold,
      declineReason: bonusGoldRequestsTable.declineReason,
      reviewedAt: bonusGoldRequestsTable.reviewedAt,
      assignmentId: bonusGoldRequestsTable.assignmentId,
    })
      .from(bonusGoldRequestsTable)
      .where(and(
        eq(bonusGoldRequestsTable.userId, req.userId!),
        inArray(bonusGoldRequestsTable.status, ["declined", "approved"]),
      ))
      .orderBy(bonusGoldRequestsTable.reviewedAt);

    const assignmentIds = rows.map(r => r.assignmentId).filter((id): id is number => id != null);
    const questTitles: Record<number, string> = {};
    if (assignmentIds.length > 0) {
      const qs = await db.select({
        assignmentId: questAssignmentsTable.id,
        title: questDefinitionsTable.plainTitle,
      })
        .from(questAssignmentsTable)
        .innerJoin(questDefinitionsTable, eq(questDefinitionsTable.id, questAssignmentsTable.questDefinitionId))
        .where(inArray(questAssignmentsTable.id, assignmentIds));
      for (const q of qs) questTitles[q.assignmentId] = q.title;
    }

    res.json(rows.map(r => ({
      ...r,
      questTitle: r.assignmentId ? (questTitles[r.assignmentId] ?? null) : null,
    })));
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

// GET /api/bonus-requests?partyId= — adults list pending requests
router.get("/", requireAuth, async (req, res) => {
  try {
    const partyId = parseInt(String(req.query.partyId));
    if (!partyId) { res.status(400).json({ error: "partyId required" }); return; }
    const role = await getMemberRole(partyId, req.userId!);
    if (role !== "leader" && role !== "adult") {
      res.status(403).json({ error: "Adults only" }); return;
    }
    const rows = await db.select({
      id: bonusGoldRequestsTable.id,
      userId: bonusGoldRequestsTable.userId,
      partyId: bonusGoldRequestsTable.partyId,
      assignmentId: bonusGoldRequestsTable.assignmentId,
      note: bonusGoldRequestsTable.note,
      status: bonusGoldRequestsTable.status,
      bonusGold: bonusGoldRequestsTable.bonusGold,
      reviewedBy: bonusGoldRequestsTable.reviewedBy,
      reviewedAt: bonusGoldRequestsTable.reviewedAt,
      createdAt: bonusGoldRequestsTable.createdAt,
      userName: usersTable.displayName,
    })
      .from(bonusGoldRequestsTable)
      .leftJoin(usersTable, eq(usersTable.id, bonusGoldRequestsTable.userId))
      .where(and(
        eq(bonusGoldRequestsTable.partyId, partyId),
        eq(bonusGoldRequestsTable.status, "pending"),
      ))
      .orderBy(bonusGoldRequestsTable.createdAt);

    // Attach quest title + standard gold reward if assignmentId is set
    const assignmentIds = rows.map(r => r.assignmentId).filter((id): id is number => id != null);
    const questInfo: Record<number, { title: string; goldReward: number }> = {};
    if (assignmentIds.length > 0) {
      const qs = await db.select({
        assignmentId: questAssignmentsTable.id,
        title: questDefinitionsTable.plainTitle,
        goldReward: questDefinitionsTable.goldReward,
      })
        .from(questAssignmentsTable)
        .innerJoin(questDefinitionsTable, eq(questDefinitionsTable.id, questAssignmentsTable.questDefinitionId))
        .where(inArray(questAssignmentsTable.id, assignmentIds));
      for (const q of qs) questInfo[q.assignmentId] = { title: q.title, goldReward: q.goldReward };
    }

    res.json(rows.map(r => ({
      ...r,
      questTitle: r.assignmentId ? (questInfo[r.assignmentId]?.title ?? null) : null,
      questGoldReward: r.assignmentId ? (questInfo[r.assignmentId]?.goldReward ?? null) : null,
    })));
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

// POST /api/bonus-requests/:id/review — adult approves (with gold amount) or declines
router.post("/:id/review", requireAuth, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const { approved, bonusGold, declineReason } = req.body;
    const [request] = await db.select().from(bonusGoldRequestsTable)
      .where(eq(bonusGoldRequestsTable.id, id)).limit(1);
    if (!request || request.status !== "pending") {
      res.status(404).json({ error: "Request not found or already reviewed" }); return;
    }
    const role = await getMemberRole(request.partyId, req.userId!);
    if (role !== "leader" && role !== "adult") {
      res.status(403).json({ error: "Adults only" }); return;
    }

    if (approved) {
      const gold = Math.max(1, Math.min(9999, parseInt(String(bonusGold)) || 0));
      if (!gold) { res.status(400).json({ error: "bonusGold required when approving" }); return; }
      await db.update(bonusGoldRequestsTable).set({
        status: "approved", bonusGold: gold,
        reviewedBy: req.userId!, reviewedAt: new Date(),
      }).where(eq(bonusGoldRequestsTable.id, id));
      // Award the gold to the kid
      await db.execute(
        `UPDATE users SET personal_gold = personal_gold + ${gold}, updated_at = NOW() WHERE id = ${request.userId}`
      );
      res.json({ approved: true, bonusGold: gold });
    } else {
      await db.update(bonusGoldRequestsTable).set({
        status: "declined", reviewedBy: req.userId!, reviewedAt: new Date(),
        declineReason: declineReason?.trim() ?? null,
      }).where(eq(bonusGoldRequestsTable.id, id));
      res.json({ approved: false });
    }
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

export default router;
