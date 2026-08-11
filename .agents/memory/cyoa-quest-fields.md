---
name: CYOA quest field alignment
description: The frontend/OpenAPI types use assignedUserIds; the backend quests route must match.
---

## Rule
The quest creation payload field for assigning specific users is `assignedUserIds` (camelCase, no "To").

## Why
The OpenAPI spec and Orval-generated `QuestDefinitionInput` type use `assignedUserIds`. The backend quests route was originally named `assignedToUserIds` causing a mismatch. Both sides are now aligned to `assignedUserIds`.

## How to apply
- Frontend quest-create.tsx: `assignedUserIds: questType === 'individual' ? assignedUserIds : undefined`
- Backend routes/quests.ts destructure: `const { ..., assignedUserIds, ... } = req.body`
- If you add a new field to the quest payload, update openapi.yaml first, run codegen, then implement the backend to match.
