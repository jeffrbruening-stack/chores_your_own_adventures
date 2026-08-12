---
name: CYOA wizard AI sprite
description: Wizard class now renders an AI-generated PNG composite instead of code-drawn SVG; layered assets pending
---
The wizard branch of `PixelCharacter` renders an AI-generated pixel-art PNG (`src/assets/sprites/wizard-ai-benchmark-trimmed.png`, trimmed via ImageMagick) instead of the old code-drawn 48×72 SVG grid (now dead code, kept until layered assets exist).

**Why:** User approved the AI-generated benchmark after concluding code-drawn rects could never match their reference quality. Hard gate: no other classes/species until each style is approved.

**How to apply:**
- Equipped background renders behind the img, pet/effect in front, via absolutely-positioned 32×48 SVG overlays; wearable equipment (headgear/weapons) is baked into the composite until modular layers exist.
- Approved target architecture: modular transparent PNG layers (body, outfit, hat, staff, …) sharing one canvas/pose/anchors, composited at runtime; NO pre-generated full combinations; colors via palette swaps on flat pixel regions.
- Reliable layer-alignment technique: generate base body once, then generate base+item images and extract diffs as transparent layers.
- Benchmark comparison page lives at `/wizard-benchmark` (route in App.tsx).
