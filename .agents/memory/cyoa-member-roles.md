---
name: CYOA member roles
description: Valid values for the member_role DB enum and how they map to permissions
---

The `member_role` PostgreSQL enum has exactly three values: `leader`, `adult`, `kid`.

"founder" is NOT a valid value — do not reference it in SQL or Drizzle comparisons.

**Permission mapping:**
- `leader` — party creator/owner; bypasses 7-day character appearance cooldown; can verify quests, create quests, manage members
- `adult` — trusted adult member; also bypasses character cooldown; similar leader-level access
- `kid` — regular child member; subject to all restrictions (cooldown, PIN-only login, etc.)

**Why:** Early code used "founder" as an alias for leader but it was never in the enum. Bug surfaced when clearing character cooldowns via SQL.

**How to apply:** Anywhere you check `membership?.role === "leader"`, also include `=== "adult"` for permission checks. Never include `"founder"`.
