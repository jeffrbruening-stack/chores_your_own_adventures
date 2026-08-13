---
name: CYOA paper-doll gear system
description: Art direction + layering lessons for the modular paper-doll character system (in progress, approval-gated)
---
# Paper-doll system (replacing AI portraits for gear display)

**Approved direction:** layered transparent sprites on shared canvas; human masc+fem bodies only in V1; class comes from gear, not body; architecture must allow future species rigs with per-rig fitted item variants. Hard gate: ONE benchmark wizard approved by user before building anything else.

**Art style (user-approved target):** chunky simplified 16-bit sprite — flat cel shading, 3-5 tones per material, bold outlines, NO embroidery/ornamentation, stocky cartoon proportions (~4.5 heads), clear face at small sizes. User explicitly rejected "pixelated fantasy illustration" detail. Do not add detail just because resolution allows.

**Layering lessons (critical for renderer design):**
- Garment assets must be generated as standalone closed items (e.g., robe with CLOSED high collar, no chest opening) — an open collar shows the base body through and reads "pasted on".
- Full base body behind a garment leaks skin slivers at arms/shoulders. Fix: when a full-coverage garment (robe) is equipped, render only the base body's head+neck crop; the garment occludes everything below. Renderer needs per-garment coverage metadata (e.g., `coverage: fullBody | torso | none`) deciding how much base body to draw.
- Layer order: staff (back) → base body head → robe → hat.
- Assets live in `attached_assets/paperdoll/` (v2_* = chunky style, trim_* = fuzz-trimmed); composites tuned with magick -geometry offsets — these offsets are the prototype anchor-point data.

**Why:** user cares deeply about "dressed, not doll behind cutout" look and deliberate simplification; violations caused two rejection rounds.
