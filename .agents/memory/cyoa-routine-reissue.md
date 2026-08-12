---
name: CYOA routine quest re-issuance
description: Recurring quests are lazily re-issued on read, not by a scheduler
---
Recurring (routine) quests are metadata on quest_definitions (isRoutine + routineSchedule {days:[0-6]}); occurrences are NOT pre-generated. `ensureRoutineAssignments(userId, partyId)` in api-server `src/lib/routine.ts` lazily creates today's active assignment, called at the top of GET /api/quests/assignments/mine and GET /api/home.

**Why:** Without re-issuance, a routine quest disappeared forever after first completion because all quest lists filter to active/submitted assignments only.

**How to apply:** Any new endpoint that lists a user's assignments should call ensureRoutineAssignments first. Participation = explicit assignedToUserIds OR any assignment history. Guards: skip if an open assignment exists or one was already created today (user-local midnight). Weekday schedules AND time windows are visibility gates: active assignments outside their HH:MM window are filtered from lists via isAssignmentVisibleNow (submitted ones stay visible). All time logic is user-local: the web client's custom-fetch (lib/api-client-react) sends an `x-tz-offset` header (getTimezoneOffset convention) that endpoints parse with tzOffsetFromHeader; no header = server clock fallback.

Note: api-server `tsc --noEmit` has ~5 pre-existing type errors (stale schema typings: scheduledDate, assignedUserIds, "cancelled"/"founder" enums) — dev build (esbuild) runs fine despite them.
