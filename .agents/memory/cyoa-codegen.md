---
name: CYOA Orval/Zod codegen fix
description: Orval 8.x generates Zod v4 APIs incompatible with Zod v3 catalog entry; fix required in openapi.yaml
---

# Orval 8.x + Zod v3 Compatibility

## The problem
Orval 8.x generates Zod v4 code (`zod.int()`, `zod.looseObject()`, `zod.email()`) but the workspace catalog uses `zod: ^3.25.76`.

## Fix applied to openapi.yaml
1. Replace ALL `type: integer` → `type: number` (sed -i)
2. Replace ALL `type: ["integer", "null"]` → `type: ["number", "null"]` (sed -i)
3. Remove all `format: email` lines (generates `zod.email()` which is v4-only)
4. Add `additionalProperties: true` to any bare `type: object` fields (generates `zod.looseObject({})` otherwise)

**Why:** Orval 8.23.0 targets Zod v4 by default. The catalog has v3. Until the catalog bumps to v4, every openapi.yaml edit must avoid these patterns.

## To check after spec changes
Run: `pnpm --filter @workspace/api-spec run codegen`
Watch for: `zod.int()`, `zod.looseObject()`, `zod.email()` in generated output.
