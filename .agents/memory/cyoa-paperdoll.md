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

**PIVOT (Aug 2026): AI-generated art abandoned — user supplies sprite packs.** All AI-generated benchmark attempts rejected (patch-edits degrade pixel art; garments read "pasted on"). User now provides the GandalfHardcore Character Asset Pack (license: commercial game use OK; no resale/redistribution/AI-training). Assets in `artifacts/cyoa/public/paperdoll/gandalf/` (kebab-case renames + LICENSE.txt).
- Sheet format: 800×448 PNG, 80×64 px cell grid, all layer sheets pixel-aligned — compositing = stacking sheets and cropping the same cell. Idle frame = cell (0,0).
- Renderer proof: `/paperdoll-preview` route (unprotected) in cyoa; CSS background-position crop, backgroundSize = sheet×scale, image-rendering: pixelated. Layer order: skin → boots → pants/skirt → shirt/corset → hair → hand item.
- Process gate: user wants incremental integration — base pack proven first, expansion packs added only after explicit approval. Do NOT generate or redraw any art.
