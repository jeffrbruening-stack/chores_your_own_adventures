---
name: CYOA spec-backend alignment
description: The OpenAPI spec URL paths and status enums were out of sync with the backend. This caused every generated-client call to 404.
---

## The problem
The generated API client (`@workspace/api-client-react`) is built from `lib/api-spec/openapi.yaml`. The backend routes were implemented at different paths than the spec defined. Every call from the frontend to the generated hooks was getting 404.

## Concrete mismatches that existed

| Spec (client calls) | Backend (was serving) |
|---|---|
| `GET /api/quest-assignments` | `GET /api/quests/assignments/mine` |
| `POST /api/quest-assignments/:id/complete` | `POST /api/quests/assignments/:id/complete` |
| `POST /api/quest-assignments/:id/verify` | `POST /api/quests/assignments/:id/verify` |
| `GET /api/character` | `GET /api/characters/me` |
| `PUT /api/character` | `PUT /api/characters/me` |
| `GET /api/character/users/:userId` | `GET /api/characters/:userId` |
| `GET /api/open-quests` | `GET /api/quests/open` |
| `GET /api/quick-quests` | `GET /api/quests/quick` |

Also: `QuestAssignmentStatus` enum in the spec had `available | claimed | pending_verification | completed | expired | cancelled` but the DB/backend uses `active | submitted | completed | expired | cancelled`.

## Fix applied
- Added four new backend route files matching the spec paths: `quest-assignments.ts`, `character.ts`, `open-quests.ts`, `quick-quests.ts`
- Mounted them in `routes/index.ts` alongside the existing routes
- Fixed the `QuestAssignmentStatus` enum in `openapi.yaml` to match actual DB values
- Ran `pnpm orval` in `lib/api-spec/` to regenerate the client
- Rebuilt `lib/api-client-react` with `pnpm exec tsc --build lib/api-client-react/tsconfig.json` to update the `.d.ts` files used by project references

## Rules going forward
**Why:** The spec is the contract. When spec and backend disagree, ALL frontend calls to generated hooks break silently (404).

**How to apply:**
- After adding any new backend route, check that the spec also defines it at the EXACT same path. Discrepancies cause 404s that look like logic bugs.
- After changing the spec enum values, always run `pnpm orval` in `lib/api-spec/` then rebuild `lib/api-client-react` with tsc --build.
- Use `pnpm --filter @workspace/cyoa exec tsc --noEmit` to catch type mismatches before runtime. If it fails with project-reference errors, run `pnpm exec tsc --build lib/api-client-react/tsconfig.json` first.
- The existing `/api/quests/...` and `/api/characters/...` routes still exist — they're not removed. New spec-aligned routes are additions, not replacements.
