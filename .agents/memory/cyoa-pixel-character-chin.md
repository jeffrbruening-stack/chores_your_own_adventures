---
name: CYOA pixel character chin and neck rendering
description: How to render the head/chin/neck cleanly without dangling pixels
---

## Rule
The head must be a **flat rectangle** with no chin taper. Any narrowing of the bottom rows creates visible stepped/dangling skin-colored pixels below the face.

**Why:** A chin taper (e.g. last row 4px narrower than main head) looks like a protruding pixel block hanging below the chin, especially noticeable against dark backgrounds. The rectangular head corners are less visually jarring than a chin projection.

**How to apply:** In `renderBody` (pixel-character.tsx):
```typescript
// Neck — shifted 1px up so head covers its top row; neck emerges cleanly below chin
out.push(R(b.nx, b.ny - 1, b.nw, b.nh + 1, skinCol));
// Head — clean flat rectangle drawn after neck
out.push(R(b.hx, b.hy, b.hw, b.hh, skinCol));
```

The neck is drawn **before** the head in renderBody's output array. Shifting it 1px up (to `b.ny - 1`) means the head covers the neck's top row, so the neck only shows as a short strip below the chin and flows naturally into the shirt. No dangling pixels.

## Beard jaw-side clamping
The Full Beard jaw-side pixels must be clamped so they don't extend below `b.hy + b.hh`:
```typescript
const jawMaxH = Math.max(0, b.hy + b.hh - (msy + 1) - 1);
out.push(R(mouthX - 2, msy + 1, 2, Math.min(5, jawMaxH), hairCol));
out.push(R(mouthX + mouthW, msy + 1, 2, Math.min(5, jawMaxH), hairCol));
```
