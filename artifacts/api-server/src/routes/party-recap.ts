/**
 * /api/party-recap — matches the OpenAPI spec path used by the generated client.
 * Adults/leaders only: recap of a member's (or the whole party's) accomplishments
 * within a time window.
 */
import { Router } from "express";
import { db } from "@workspace/db";
import {
  questAssignmentsTable, questDefinitionsTable, usersTable,
} from "@workspace/db/schema";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { getMemberRole } from "../lib/party.js";
import { levelFromXp } from "../lib/rewards.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const partyId = parseInt(String(req.query.partyId));
    const userId = req.query.userId ? parseInt(String(req.query.userId)) : null;
    const from = new Date(String(req.query.from));
    const to = new Date(String(req.query.to));
    if (!partyId || isNaN(from.getTime()) || isNaN(to.getTime())) {
      res.status(400).json({ error: "partyId, from and to are required" });
      return;
    }
    // Only adults and leaders can view recaps
    const role = await getMemberRole(partyId, req.userId!);
    if (role !== "leader" && role !== "adult") {
      res.status(403).json({ error: "Only grown-ups can view recaps" });
      return;
    }
    if (userId) {
      const targetRole = await getMemberRole(partyId, userId);
      if (!targetRole) {
        res.status(404).json({ error: "That adventurer isn't in this party" });
        return;
      }
    }

    const userFilter = userId ? [eq(questAssignmentsTable.userId, userId)] : [];

    // Completed quests inside the window
    const completed = await db.select({
      assignmentId: questAssignmentsTable.id,
      title: questDefinitionsTable.plainTitle,
      adventureTitle: questDefinitionsTable.adventureTitle,
      questType: questDefinitionsTable.questType,
      completedAt: questAssignmentsTable.completedAt,
      xpAwarded: questAssignmentsTable.xpAwarded,
      goldAwarded: questAssignmentsTable.goldAwarded,
      userId: questAssignmentsTable.userId,
      userName: usersTable.displayName,
    })
      .from(questAssignmentsTable)
      .innerJoin(questDefinitionsTable, eq(questDefinitionsTable.id, questAssignmentsTable.questDefinitionId))
      .leftJoin(usersTable, eq(usersTable.id, questAssignmentsTable.userId))
      .where(and(
        eq(questAssignmentsTable.partyId, partyId),
        eq(questAssignmentsTable.status, "completed"),
        gte(questAssignmentsTable.completedAt, from),
        lte(questAssignmentsTable.completedAt, to),
        ...userFilter,
      ))
      .orderBy(questAssignmentsTable.completedAt);

    // Completion rate uses a single cohort: assignments CREATED in the window.
    // Numerator = cohort members that ended up completed (regardless of when),
    // so the rate can never exceed 100%. The quest log above is independently
    // based on completion time.
    const assigned = await db.select({ id: questAssignmentsTable.id, status: questAssignmentsTable.status })
      .from(questAssignmentsTable)
      .where(and(
        eq(questAssignmentsTable.partyId, partyId),
        gte(questAssignmentsTable.createdAt, from),
        lte(questAssignmentsTable.createdAt, to),
        inArray(questAssignmentsTable.status, ["active", "submitted", "completed", "failed"]),
        ...userFilter,
      ));
    const cohortCompleted = assigned.filter((a) => a.status === "completed").length;

    const xpEarned = completed.reduce((s, q) => s + (q.xpAwarded ?? 0), 0);
    const goldEarned = completed.reduce((s, q) => s + (q.goldAwarded ?? 0), 0);

    // Quest type breakdown
    const byTypeMap: Record<string, number> = {};
    for (const q of completed) {
      const t = q.questType ?? "individual";
      byTypeMap[t] = (byTypeMap[t] ?? 0) + 1;
    }
    const byType = Object.entries(byTypeMap)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    // Level-ups: compare level at (current lifetime XP − XP earned in window) vs now.
    // Approximation — assumes no XP was earned outside the window after it ended.
    let levelUps = 0;
    let currentLevel: number | null = null;
    let userName: string | null = null;
    const memberIds = userId
      ? [userId]
      : [...new Set(completed.map((q) => q.userId).filter((id): id is number => id != null))];
    if (memberIds.length > 0) {
      const users = await db.select({
        id: usersTable.id, lifetimeXp: usersTable.lifetimeXp,
        currentLevel: usersTable.currentLevel, displayName: usersTable.displayName,
      }).from(usersTable).where(inArray(usersTable.id, memberIds));
      for (const u of users) {
        const xpInWindow = completed
          .filter((q) => q.userId === u.id)
          .reduce((s, q) => s + (q.xpAwarded ?? 0), 0);
        levelUps += Math.max(0, levelFromXp(u.lifetimeXp) - levelFromXp(u.lifetimeXp - xpInWindow));
        if (userId && u.id === userId) {
          currentLevel = u.currentLevel;
          userName = u.displayName;
        }
      }
    }

    // Completions per day (most active days), bucketed in the VIEWER's timezone.
    // tzOffset is JS Date.getTimezoneOffset() (minutes; positive = behind UTC).
    const tzOffset = req.query.tzOffset ? parseInt(String(req.query.tzOffset)) : 0;
    const tzShiftMs = Number.isFinite(tzOffset) ? tzOffset * 60_000 : 0;
    const byDayMap = new Map<string, number>();
    for (const q of completed) {
      if (!q.completedAt) continue;
      const d = new Date(q.completedAt.getTime() - tzShiftMs).toISOString().slice(0, 10);
      byDayMap.set(d, (byDayMap.get(d) ?? 0) + 1);
    }
    const byDay = [...byDayMap.entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const totalAssigned = assigned.length;
    const completedCount = completed.length;

    res.json({
      from: from.toISOString(),
      to: to.toISOString(),
      userId,
      userName,
      questsCompleted: completed.map((q) => ({
        ...q,
        completedAt: q.completedAt?.toISOString() ?? "",
      })),
      totalAssigned,
      completedCount,
      completionRate: totalAssigned > 0 ? Math.round((cohortCompleted / totalAssigned) * 100) : 0,
      xpEarned,
      goldEarned,
      levelUps,
      currentLevel,
      byDay,
      byType,
    });
  } catch (err) {
    console.error("party-recap error:", err);
    res.status(500).json({ error: "Failed to build recap" });
  }
});

export default router;
