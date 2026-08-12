import { db } from "@workspace/db";
import { questDefinitionsTable, questAssignmentsTable, partiesTable } from "@workspace/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";

/**
 * Lazily re-issue routine (recurring) quests for a user.
 *
 * Recurrence is stored as metadata on quest_definitions (isRoutine +
 * routineSchedule {days:[0-6]}), but nothing generates future occurrences.
 * Without this, a routine quest disappears forever after its first
 * completion, because quest lists only show active/submitted assignments.
 *
 * Called at the top of assignment-listing endpoints (/assignments/mine,
 * /api/home): for every routine definition in the party where this user has
 * assignment history, if today is one of the scheduled weekdays and the user
 * has no assignment created today, create a fresh active assignment.
 */
/**
 * The user's local "now" as a shifted Date read via getUTC* getters.
 * tzOffsetMin follows the JS getTimezoneOffset() convention: minutes to add
 * to local time to reach UTC (positive west of UTC, e.g. 300 for EST).
 * When undefined, falls back to the server clock.
 */
function localNow(tzOffsetMin?: number): { minsOfDay: number; weekday: number; localDayKey: (d: Date) => string; startedTodayLocal: (d: Date) => boolean } {
  const off = Number.isFinite(tzOffsetMin) ? (tzOffsetMin as number) : 0;
  const shift = (d: Date) => new Date(d.getTime() - off * 60000);
  const nowShifted = shift(new Date());
  const dayKey = (d: Date) => {
    const s = shift(d);
    return `${s.getUTCFullYear()}-${s.getUTCMonth()}-${s.getUTCDate()}`;
  };
  const todayKey = dayKey(new Date());
  // Note: with no offset header, off=0 means all fields consistently use UTC
  // (the server clock), so day keys, weekday, and minutes never mix bases.
  return {
    minsOfDay: nowShifted.getUTCHours() * 60 + nowShifted.getUTCMinutes(),
    weekday: nowShifted.getUTCDay(),
    localDayKey: dayKey,
    startedTodayLocal: (d: Date) => dayKey(d) === todayKey,
  };
}

/** True if today (user-local) is one of the routine's scheduled weekdays. */
export function isScheduledToday(routineSchedule?: string | null, tzOffsetMin?: number): boolean {
  if (!routineSchedule) return true; // no day filter = every day
  try {
    const days: number[] = JSON.parse(routineSchedule)?.days ?? [];
    return days.length === 0 || days.includes(localNow(tzOffsetMin).weekday);
  } catch {
    return true;
  }
}

/**
 * True if the user's current local time falls within an optional HH:MM window.
 * Assignments with a time window are hidden outside it (e.g. a 05:00–12:00
 * morning routine should not appear at 13:00). No window = always visible.
 */
export function isWithinTimeWindow(start?: string | null, end?: string | null, tzOffsetMin?: number): boolean {
  if (!start || !end) return true;
  const mins = localNow(tzOffsetMin).minsOfDay;
  const parse = (s: string) => {
    const [h, m] = s.split(":").map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  };
  const s = parse(start);
  const e = parse(end);
  if (Number.isNaN(s) || Number.isNaN(e)) return true;
  // Overnight windows (e.g. 21:00–06:00) wrap past midnight
  return s <= e ? mins >= s && mins <= e : mins >= s || mins <= e;
}

/**
 * Visibility filter for assignment lists: hide *active* assignments outside
 * their time window; submitted ones stay visible (awaiting verification).
 */
export function isAssignmentVisibleNow(
  a: { status: string; timeWindowStart?: string | null; timeWindowEnd?: string | null; isRoutine?: boolean | null; routineSchedule?: string | null },
  tzOffsetMin?: number,
): boolean {
  if (a.status !== "active") return true;
  // Routine quests only show on their scheduled weekdays (e.g. a Tue-only
  // chore created on Wed stays hidden until Tuesday).
  if (a.isRoutine && !isScheduledToday(a.routineSchedule, tzOffsetMin)) return false;
  return isWithinTimeWindow(a.timeWindowStart, a.timeWindowEnd, tzOffsetMin);
}

/** Parse the x-tz-offset header (minutes, getTimezoneOffset convention). */
export function tzOffsetFromHeader(headerValue: unknown): number | undefined {
  const n = parseInt(String(headerValue ?? ""), 10);
  // Sanity: real offsets are within ±14h
  return Number.isFinite(n) && Math.abs(n) <= 14 * 60 ? n : undefined;
}

export async function ensureRoutineAssignments(userId: number, partyId: number, tzOffsetMin?: number): Promise<void> {
  if (!partyId) return;

  // Skip issuance if the party has paused routines.
  const [party] = await db.select({ routinesPaused: partiesTable.routinesPaused })
    .from(partiesTable).where(eq(partiesTable.id, partyId)).limit(1);
  if (!party || party.routinesPaused) return;

  const routineDefs = await db.select()
    .from(questDefinitionsTable)
    .where(and(
      eq(questDefinitionsTable.partyId, partyId),
      eq(questDefinitionsTable.isRoutine, true),
      eq(questDefinitionsTable.isArchived, false),
      eq(questDefinitionsTable.isPaused, false),
    ));
  if (routineDefs.length === 0) return;

  const dueDefs = routineDefs.filter((d) => isScheduledToday(d.routineSchedule, tzOffsetMin));
  if (dueDefs.length === 0) return;

  // Compute today's start in UTC so we can detect "already issued today".
  // tzOffsetMin is the JS getTimezoneOffset() convention: minutes to add to
  // local time to obtain UTC (positive = west of UTC, e.g. 300 for EST).
  const off = Number.isFinite(tzOffsetMin) ? (tzOffsetMin as number) : 0;
  const nowUtcMs = Date.now();
  const nowLocalMs = nowUtcMs - off * 60000; // shift to local clock
  const nowLocal = new Date(nowLocalMs);
  const localMidnightMs = nowLocalMs - (
    nowLocal.getUTCHours() * 3600000 +
    nowLocal.getUTCMinutes() * 60000 +
    nowLocal.getUTCSeconds() * 1000 +
    nowLocal.getUTCMilliseconds()
  );
  const todayStartUtc = new Date(localMidnightMs + off * 60000);

  // Issue each due definition in its own transaction with a per-(user, def)
  // advisory lock so concurrent requests are serialized at the DB level.
  // pg_advisory_xact_lock(int4, int4) is held until the transaction ends.
  for (const def of dueDefs) {
    const explicitlyAssigned = Array.isArray(def.assignedToUserIds)
      ? (def.assignedToUserIds as unknown as number[]).includes(userId)
      : false;
    const defId = def.id;

    await db.transaction(async (tx) => {
      // Serialize concurrent issuance for this (user, definition) pair.
      // Two simultaneous transactions for the same pair will queue here;
      // the second will then see the first's committed row and skip the insert.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${userId}, ${defId})`);

      // Check participation: explicitly assigned, or has prior assignment history.
      if (!explicitlyAssigned) {
        const [history] = await tx
          .select({ id: questAssignmentsTable.id })
          .from(questAssignmentsTable)
          .where(and(
            eq(questAssignmentsTable.questDefinitionId, defId),
            eq(questAssignmentsTable.userId, userId),
          ))
          .limit(1);
        if (!history) return; // not a participant — skip
      }

      // Skip if there is already an open assignment or one issued today.
      const [blocker] = await tx
        .select({ id: questAssignmentsTable.id })
        .from(questAssignmentsTable)
        .where(and(
          eq(questAssignmentsTable.questDefinitionId, defId),
          eq(questAssignmentsTable.userId, userId),
          inArray(questAssignmentsTable.status, ["active", "submitted"]),
        ))
        .limit(1);
      if (blocker) return;

      const [issuedToday] = await tx
        .select({ id: questAssignmentsTable.id })
        .from(questAssignmentsTable)
        .where(and(
          eq(questAssignmentsTable.questDefinitionId, defId),
          eq(questAssignmentsTable.userId, userId),
          sql`${questAssignmentsTable.createdAt} >= ${todayStartUtc}`,
        ))
        .limit(1);
      if (issuedToday) return;

      await tx.insert(questAssignmentsTable).values({
        questDefinitionId: defId,
        userId,
        partyId,
        status: "active",
      });
    });
  }
}
