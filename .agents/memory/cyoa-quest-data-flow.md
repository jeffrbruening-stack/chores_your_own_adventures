---
name: CYOA quest data flow
description: How quests flow from creation through Quest Hub and Home; key gotchas for assignments and cache invalidation
---

## Rule
Party quests (`questType === 'party'`) must create assignment records for all party members at creation time, or they will never appear in Quest Hub "My Quests" (which reads from `questAssignmentsTable` via `/assignments/mine`).

**Why:** The Quest Hub "My Quests" tab exclusively queries `/api/quests/assignments/mine` which only returns rows from `questAssignmentsTable`. Party quests that have no assignments are invisible there.

**How to apply:** In `POST /api/quests` (quests.ts), after the definition is inserted, when `questType === 'party'`, query `partyMembersTable` for all members and bulk-insert into `questAssignmentsTable` with `status: 'active'`.

## Cache invalidation
After quest creation (quest-create.tsx), must invalidate:
- `getListMyQuestAssignmentsQueryKey({ partyId })`
- `getListOpenQuestsQueryKey({ partyId })`
- `getGetHomeDataQueryKey()`
- `getListQuestsQueryKey({ partyId })`

React Query does not refetch on navigation alone if data is cached.

## Tab data sources
- "My Quests" → `useListMyQuestAssignments` → `/api/quests/assignments/mine?partyId=`
- "Open" → `useListOpenQuests` → `/api/quests/open?partyId=`
- "Verify" (leader) → `useListPendingVerification`
- "All" (leader) → `useListQuests` → `/api/quests?partyId=`

## Avatar sync
After saving character appearance in create-character.tsx, must call:
- `queryClient.invalidateQueries({ queryKey: getGetMyCharacterQueryKey() })`
- `queryClient.invalidateQueries({ queryKey: getGetHomeDataQueryKey() })`

`refreshUser()` alone only updates the auth context, not the character query cache.

## Quest detail
QuestDetailSheet component in `artifacts/cyoa/src/components/quest-detail-sheet.tsx` — bottom sheet accepting `QuestLike` (shared interface covering both QuestAssignment and QuestDefinition shapes).
