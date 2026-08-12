---
name: CYOA AI portraits
description: Per-kid AI-generated pixel portraits — generation flow, storage, serving, and guards
---

- Portraits are generated server-side with `gpt-image-1` via the AI Integrations proxy (raw fetch to `${AI_BASE_URL}/images/generations`, size 1024x1536, b64 response, ~30-60s) from the character's saved appearance fields, stored as PNG in object storage private dir under `portraits/`, path saved in `characters.portrait_path`.
- **Serving:** `GET /api/characters/portrait-image/:userId` is deliberately unauthenticated — `<img>` tags cannot send Authorization headers. Portraits are non-sensitive game art. Frontend URL built by `portraitImageUrl()` helper in pixel-character.tsx, which appends the portraitPath as a `?v=` cache-buster (each regen produces a new uuid path).
- **Guards:** POST /me/portrait has an in-memory per-user in-progress lock (409) + 2-minute cooldown (429); old portrait object is deleted best-effort after a successful regen. Guards reset on server restart — fine for a family app.
- **Prompt style:** must say "highly detailed 16-bit SNES-era, fine pixel resolution, NOT chunky low-res 8-bit" or gpt-image-1 produces blocky 8-bit art that mismatches the approved sprite style. Appearance-id → prompt-word maps in portrait.ts must match the option ids exported from pixel-character.tsx (e.g. skin `light-medium`, `very-dark`, fantasy-* tones).
- **UX:** create-character shows a "SUMMONING YOUR HERO" screen after save; portrait failure is non-fatal (stock class sprite used). Character page has a SUMMON/RE-SUMMON PORTRAIT button independent of the 7-day appearance lock.
- PixelCharacter renders `appearance.portraitUrl` in place of the stock sprite when present; background/pet/effect SVG overlays still apply.
