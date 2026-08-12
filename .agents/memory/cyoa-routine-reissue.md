---
name: CYOA routine quest re-issuance
description: Recurring quests are lazily re-issued on read; ensureRoutineAssignments enforces membership, paused-party, and race-safety itself
---

**Design decision:** Routine (recurring) quests are NOT pre-generated on a schedule. They are lazily issued per-user at the top of assignment-listing endpoints via `ensureRoutineAssignments`.

**Why:** Avoids a background job; keeps all logic in the request path.

**What ensureRoutineAssignments enforces internally:**
1. Returns early if `parties.routinesPaused` is true — callers need not check.
2. Uses a transaction-scoped advisory lock `pg_advisory_xact_lock(userId, defId)` per definition to serialize concurrent requests for the same (user, definition) pair, preventing duplicate assignments.

**Caller obligation:** Confirm current party membership (`assertMember`) before calling `ensureRoutineAssignments`. The function does not re-verify membership — that is the caller's responsibility.
