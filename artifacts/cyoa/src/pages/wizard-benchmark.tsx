/**
 * WIZARD BENCHMARK — standalone pixel-art component.
 * Canvas: 48×72 logical pixels, displayed at multiple scales.
 * Every rect is explicitly placed for maximum artistic control.
 * This is the design gate; do NOT integrate into pixel-character.tsx
 * until the user approves this benchmark.
 */

import React from 'react';

// ─── primitive ────────────────────────────────────────────────────────────────
type Px = [number, number, number, number, string]; // x, y, w, h, color

function r(x: number, y: number, w: number, h: number, c: string): Px {
  return [x, y, w, h, c];
}

// ─── PALETTE ─────────────────────────────────────────────────────────────────
// Skin
const SK  = '#E8B878'; // base skin
const SKL = '#FFD8A0'; // light / highlight
const SKD = '#C08848'; // shadow
const SKX = '#8B5828'; // deep shadow

// Hair (benchmark: chestnut brown)
const HL  = '#B07040'; // highlight
const HM  = '#7A4820'; // mid
const HD  = '#4A2810'; // shadow
const HX  = '#2A1008'; // deep

// Robe / coat purple
const RL  = '#8858D8'; // robe highlight
const RM  = '#5830B0'; // robe mid
const RD  = '#3818A0'; // robe shadow
const RX  = '#200888'; // robe deep
const RXX = '#120460'; // robe darkest

// Gold trim
const GL  = '#FAD840'; // gold bright
const GM  = '#C89020'; // gold mid
const GD  = '#8B6010'; // gold shadow

// Hat cone (slightly different purple)
const HL2 = '#6838C8'; // hat highlight
const HM2 = '#4828B0'; // hat mid
const HD2 = '#2810A0'; // hat shadow
const HX2 = '#160880'; // hat deep

// Hat brim
const BRL = '#5030B8'; // brim top
const BRD = '#2818A0'; // brim bottom

// Cape (behind coat, darker)
const CL  = '#3820A8'; // cape edge/highlight
const CM  = '#241880'; // cape mid
const CD  = '#140C58'; // cape deep

// Boots
const BTL = '#7A5030'; // boot highlight
const BTM = '#5A3018'; // boot mid
const BTD = '#2A1008'; // boot shadow / toe

// Staff wood
const WL  = '#B07840'; // wood light
const WM  = '#8B5C28'; // wood mid
const WD  = '#4A2E10'; // wood dark

// Crystal gem (amethyst)
const CRL = '#EEC0FF'; // crystal bright highlight
const CRM = '#B880F0'; // crystal mid
const CRD = '#7840D0'; // crystal shadow
const CRX = '#4020B0'; // crystal deep

// Chest brooch (amber gem in gold mount)
const BGL = '#FFB040'; // brooch gem highlight
const BGM = '#E07820'; // brooch gem mid
const BGD = '#A04010'; // brooch gem dark

// Misc
const BLK = '#101010'; // black (outlines, pupils)
const WHT = '#F8F8F8'; // white (eye whites)
const EYE = '#3A80E0'; // iris blue (benchmark)
const EBR = '#7A4820'; // eyebrow (= hair)
const NSE = '#C07848'; // nose
const LIP = '#A05030'; // mouth

// ─── WIZARD PIXEL ART ─────────────────────────────────────────────────────────
function buildWizard(): Px[] {
  const px: Px[] = [];
  const p = (x: number, y: number, w: number, h: number, c: string) => px.push(r(x, y, w, h, c));

  // ── BACKGROUND ──────────────────────────────────────────────────────────────
  p(0,  0, 48, 72, '#0E0A1A'); // dark void
  p(0, 54, 48, 18, '#090614'); // darker floor band
  // faint ground line
  p(0, 62, 48,  1, '#161028');

  // ── STAFF CRYSTAL (rows 0-10, right side cols 37-45) ─────────────────────
  // This large amethyst gem sits atop the staff to the wizard's right.
  // Elongated diamond / teardrop shape, brightest at top-left.
  p(41,  0,  2,  1, CRL);                          // tip highlight
  p(40,  1,  1,  1, CRM); p(41,  1,  2,  1, CRL); p(43,  1,  1,  1, CRD);
  p(39,  2,  1,  1, CRD); p(40,  2,  2,  1, CRL); p(42,  2,  2,  1, CRM); p(44,  2,  1,  1, CRX);
  p(38,  3,  1,  1, CRX); p(39,  3,  1,  1, CRM); p(40,  3,  1,  1, CRL); p(41,  3,  3,  1, CRM); p(44,  3,  1,  1, CRD); p(45,  3,  1,  1, CRX);
  p(38,  4,  1,  1, CRX); p(39,  4,  2,  1, CRM); p(41,  4,  1,  1, CRL); p(42,  4,  2,  1, CRM); p(44,  4,  1,  1, CRD); p(45,  4,  1,  1, CRX);
  p(38,  5,  1,  1, CRX); p(39,  5,  5,  1, CRD); p(44,  5,  2,  1, CRX);
  p(39,  6,  1,  1, CRX); p(40,  6,  4,  1, CRD); p(44,  6,  1,  1, CRX);
  p(40,  7,  1,  1, CRX); p(41,  7,  2,  1, CRD); p(43,  7,  1,  1, CRX);
  p(41,  8,  2,  1, CRX);
  // Metal collar ring between crystal and shaft
  p(39,  9,  4,  1, '#C8C8D0'); p(39, 10,  4,  1, '#909098');
  // Staff shaft (two columns: left=lighter, right=darker for round feel)
  for (let y = 11; y < 72; y++) { p(40, y, 1, 1, WM); p(41, y, 1, 1, WD); }
  // Wood grain knots at intervals
  for (const ky of [24, 38, 52, 64]) { p(40, ky, 2, 1, WD); }
  // Shaft highlight stripe on left edge
  for (let y = 11; y < 72; y += 5) p(40, y, 1, 1, WL);

  // ── CAPE (behind coat; visible at shoulders and sides) ────────────────────
  // Left cape drape (cols 4-13, rows 42-67)
  p( 4, 42, 11,  2, CL);   // shoulder highlight
  p( 4, 44,  9,  1, CM);
  for (let y = 45; y <= 62; y++) {
    const w = Math.max(2, 10 - Math.floor((y - 44) / 5));
    p(4,  y, 1, 1, CL);
    p(5,  y, w - 2, 1, CM);
    p(4 + w - 1, y, 1, 1, CD);
  }
  p(4,  63,  8, 1, CD); p(4, 64, 7, 1, CD);
  // Gold cape hem
  p(4,  65, 10,  1, GM); p(4, 65, 2, 1, GL);

  // Right cape drape (cols 34-45, rows 42-67)
  p(33, 42, 11,  2, CL);
  p(35, 44,  8,  1, CM);
  for (let y = 45; y <= 62; y++) {
    const w = Math.max(2, 10 - Math.floor((y - 44) / 5));
    p(44 - w, y, 1, 1, CD);
    p(44 - w + 1, y, w - 2, 1, CM);
    p(43, y, 1, 1, CL);
  }
  p(38, 63,  8, 1, CD); p(39, 64, 7, 1, CD);
  p(34, 65, 10, 1, GM); p(42, 65, 2, 1, GL);

  // ── BOOTS (visible below coat hem, rows 64-71) ────────────────────────────
  // LEFT boot — cols 10-19
  p(10, 64,  9,  1, BTL);                          // boot top highlight
  p( 9, 65, 10,  1, BTM); p( 9, 65, 3, 1, BTL);   // upper shaft
  p( 9, 66, 10,  1, BTM);
  p( 9, 67,  3,  1, BTL); p(12, 67,  7, 1, BTM);  // mid
  p( 9, 68, 11,  1, BTD);                           // lower
  p( 8, 69, 13,  1, BTD); p( 9, 69, 4, 1, BTM);   // toe extends left
  p( 8, 70, 12,  1, BTD);
  p( 9, 71, 10,  1, BTD);

  // RIGHT boot — cols 29-38
  p(29, 64,  9,  1, BTL);
  p(29, 65, 10,  1, BTM); p(29, 65, 3, 1, BTL);
  p(29, 66, 10,  1, BTM);
  p(29, 67,  3,  1, BTL); p(32, 67,  7, 1, BTM);
  p(28, 68, 11,  1, BTD);
  p(27, 69, 13,  1, BTD); p(28, 69, 4, 1, BTM);
  p(27, 70, 12,  1, BTD);
  p(28, 71, 10,  1, BTD);

  // ── SKIN — head, neck, hands ─────────────────────────────────────────────
  // Head silhouette: rows 23-40, cols 13-35 (22px wide, 17px tall)
  // Top rounds off (brim covers much of this)
  p(17, 23,  2, 1, SKL); p(19, 23, 11, 1, SK); p(30, 23, 2, 1, SKD); // row 23 (mostly hidden)
  p(15, 24,  2, 1, SKL); p(17, 24, 15, 1, SK); p(32, 24, 2, 1, SKD); // row 24
  p(14, 25,  2, 1, SKL); p(16, 25, 17, 1, SK); p(33, 25, 2, 1, SKD); // row 25
  for (let y = 26; y <= 35; y++) {
    p(13, y, 2, 1, SKL);
    p(15, y, 18, 1, SK);
    p(33, y, 2, 1, SKD);
    p(35, y, 1, 1, SKX);
  }
  p(13, 36,  2, 1, SKL); p(15, 36, 17, 1, SK); p(32, 36, 2, 1, SKD);
  p(14, 37,  2, 1, SKL); p(16, 37, 14, 1, SK); p(30, 37, 3, 1, SKD);
  p(16, 38,  2, 1, SKL); p(18, 38, 10, 1, SK); p(28, 38, 3, 1, SKD);
  p(18, 39,  2, 1, SKL); p(20, 39,  6, 1, SK); p(26, 39, 2, 1, SKD);

  // Neck (rows 40-43, cols 19-29)
  for (let y = 40; y <= 42; y++) {
    p(19, y, 2, 1, SKL);
    p(21, y, 7, 1, SK);
    p(28, y, 2, 1, SKD);
  }
  p(20, 43,  2, 1, SKL); p(22, 43, 5, 1, SK); p(27, 43, 2, 1, SKD);

  // Left hand / wrist (cols 5-11, rows 57-63) — holding nothing
  p(5, 57, 6, 1, SK); p(5, 57, 1, 1, SKL); p(11, 57, 1, 1, SKD);
  p(5, 58, 6, 1, SK); p(5, 58, 1, 1, SKL); p(11, 58, 1, 1, SKD);
  p(5, 59, 5, 1, SK); p(5, 59, 1, 1, SKL); p(10, 59, 1, 1, SKD);
  p(6, 60, 4, 1, SK); p(6, 60, 1, 1, SKL); p(10, 60, 1, 1, SKD);
  p(6, 61, 4, 1, SKD);
  // Finger tips
  p(5, 57, 1, 1, SKL); p(7, 57, 1, 1, SKL); p(9, 57, 1, 1, SKL);

  // Right hand / wrist (cols 37-43, rows 57-63) — gripping staff
  p(37, 57, 1, 1, SKD); p(38, 57, 5, 1, SK); p(37, 57, 1, 1, SKD);
  p(37, 58, 1, 1, SKD); p(38, 58, 5, 1, SK);
  p(37, 59, 1, 1, SKD); p(38, 59, 4, 1, SK);
  p(37, 60, 1, 1, SKD); p(38, 60, 4, 1, SK);
  p(38, 61, 4, 1, SKD);

  // ── COAT / ROBE (open-front, gold-trimmed) ───────────────────────────────
  // Wide shoulders (rows 42-44, across cols 12-36, open at center col 22-26)
  p(12, 42, 10, 1, RL); p(12, 42, 2, 1, RL);    // left shoulder highlight
  p(12, 43,  9, 1, RM); p(20, 43, 1, 1, RD); p(21, 43, 1, 1, GL); // gold lapel begins
  p(12, 44,  8, 1, RM); p(20, 44, 1, 1, RD); p(21, 44, 1, 1, GL);
  p(26, 42, 10, 1, RL);                            // right shoulder highlight
  p(27, 43,  9, 1, RM); p(26, 43, 1, 1, RD); p(25, 43, 1, 1, GL); // gold lapel
  p(27, 44,  9, 1, RM); p(26, 44, 1, 1, RD); p(25, 44, 1, 1, GL);

  // Gold collar band (rows 42-44, inner sides of collar)
  p(12, 42, 1, 1, GL); p(35, 42, 1, 1, GL); // outer collar edge trim

  // LEFT sleeve (cols 4-14, rows 43-58; tapers shoulder→cuff)
  for (let y = 43; y <= 46; y++) { p(4,y,1,1,RL); p(5,y,8,1,RM); p(13,y,1,1,RD); p(14,y,1,1,RX); }
  for (let y = 47; y <= 51; y++) { p(4,y,1,1,RL); p(5,y,7,1,RM); p(12,y,1,1,RD); p(13,y,1,1,RX); }
  for (let y = 52; y <= 55; y++) { p(4,y,1,1,RL); p(5,y,6,1,RM); p(11,y,1,1,RD); p(12,y,1,1,RX); }
  for (let y = 56; y <= 59; y++) { p(4,y,1,1,RL); p(5,y,5,1,RM); p(10,y,1,1,RD); p(11,y,1,1,RX); }
  // Gold cuff — LEFT (rows 60-62)
  p(3, 60, 9, 1, GL); p(3, 60, 2, 1, GL);
  p(3, 61, 9, 1, GM); p(3, 61, 1, 1, GL);
  p(4, 62, 8, 1, GD);

  // RIGHT sleeve (cols 33-44, rows 43-58)
  for (let y = 43; y <= 46; y++) { p(34,y,1,1,RX); p(35,y,1,1,RD); p(36,y,7,1,RM); p(43,y,1,1,RL); }
  for (let y = 47; y <= 51; y++) { p(35,y,1,1,RX); p(36,y,1,1,RD); p(37,y,6,1,RM); p(43,y,1,1,RL); }
  for (let y = 52; y <= 55; y++) { p(36,y,1,1,RX); p(37,y,1,1,RD); p(38,y,5,1,RM); p(43,y,1,1,RL); }
  for (let y = 56; y <= 59; y++) { p(37,y,1,1,RX); p(38,y,1,1,RD); p(39,y,4,1,RM); p(43,y,1,1,RL); }
  // Gold cuff — RIGHT (rows 60-62)
  p(36, 60, 9, 1, GL); p(44, 60, 1, 1, GL);
  p(36, 61, 9, 1, GM); p(44, 61, 1, 1, GL);
  p(36, 62, 8, 1, GD);

  // LEFT coat panel (cols 12-22, rows 44-63; gold trim on col 21 right edge)
  for (let y = 44; y <= 48; y++) {
    p(12,y,1,1,RL); p(13,y,7,1,RM); p(20,y,1,1,RD); p(21,y,1,1,GL);
  }
  for (let y = 49; y <= 63; y++) {
    p(12,y,1,1,RL); p(13,y,7,1,RM); p(20,y,1,1,RD); p(21,y,1,1,GL);
    // Vertical fold shading
    if (y % 5 === 0) p(16, y, 1, 1, RD);
  }

  // RIGHT coat panel (cols 25-35, rows 44-63; gold trim on col 26 left edge)
  for (let y = 44; y <= 48; y++) {
    p(26,y,1,1,GL); p(27,y,1,1,RL); p(28,y,6,1,RM); p(34,y,1,1,RD); p(35,y,1,1,RX);
  }
  for (let y = 49; y <= 63; y++) {
    p(26,y,1,1,GL); p(27,y,1,1,RL); p(28,y,6,1,RM); p(34,y,1,1,RD); p(35,y,1,1,RX);
    if (y % 5 === 0) p(31, y, 1, 1, RD);
  }

  // ── CHEST BROOCH (amber gem in gold setting, rows 44-48 center) ──────────
  // Gold mount (diamond / lozenge shape)
  p(23, 44, 2, 1, GL);                             // top gold
  p(22, 45, 1, 1, GL); p(23, 45, 1, 1, BGL); p(24, 45, 1, 1, BGL); p(25, 45, 1, 1, GL);
  p(22, 46, 1, 1, GL); p(23, 46, 1, 1, BGL); p(24, 46, 1, 1, BGM); p(25, 46, 1, 1, GL);
  p(22, 47, 1, 1, GL); p(23, 47, 1, 1, BGM); p(24, 47, 1, 1, BGD); p(25, 47, 1, 1, GM);
  p(23, 48, 2, 1, GM);                             // bottom gold

  // ── BELT (leather + gold square buckle, rows 50-55, full width) ──────────
  // Belt leather spans full coat width (col 12-35)
  for (let y = 50; y <= 55; y++) {
    p(12, y, 9, 1, '#6A4028'); p(12, y, 2, 1, BTL); // left belt (lighter = highlight)
    p(29, y, 7, 1, '#5A3018'); p(35, y, 1, 1, BTD); // right belt
  }
  // Belt top edge highlight
  p(12, 50, 23, 1, BTL);
  // Belt bottom shadow
  p(12, 55, 23, 1, BTD);

  // Gold buckle FRAME (rows 50-55, cols 21-28 — centered in the coat opening)
  p(21, 50, 7, 1, GL);                             // top bar
  p(21, 51, 1, 1, GL); p(22, 51, 5, 1, RX);  p(27, 51, 1, 1, GL);   // sides + dark hollow
  p(21, 52, 1, 1, GL); p(22, 52, 2, 1, RX);  p(24, 52, 1, 1, GM); p(25, 52, 2, 1, RX); p(27, 52, 1, 1, GL); // center prong
  p(21, 53, 1, 1, GL); p(22, 53, 5, 1, RX);  p(27, 53, 1, 1, GL);
  p(21, 54, 1, 1, GL); p(22, 54, 5, 1, RX);  p(27, 54, 1, 1, GL);
  p(21, 55, 7, 1, GM);                             // bottom bar

  // Inner shirt visible in opening above belt (rows 44-50, cols 22-25)
  for (let y = 44; y <= 49; y++) {
    p(22, y, 4, 1, '#30189A'); // dark shirt/inner robe
  }

  // ── COAT SKIRT (rows 56-64, panels separate and flare out) ───────────────
  // Left skirt panel
  const leftSkirt = [
    [56, 11, 10], [57, 10, 11], [58, 9, 12], [59, 8, 12],
    [60, 7, 13], [61, 6, 13], [62, 5, 14], [63, 5, 14], [64, 5, 14],
  ];
  for (const [y, x, w] of leftSkirt) {
    p(x,     y, 1, 1, RL);
    p(x + 1, y, w - 3, 1, RM);
    p(x + w - 2, y, 1, 1, RD);
    p(x + w - 1, y, 1, 1, GL); // gold lapel edge (inner edge of coat)
    // Vertical fold lines
    if ((y - 56) % 3 === 0) p(x + 4, y, 1, 1, RD);
  }
  // Right skirt panel
  const rightSkirt = [
    [56, 26, 10], [57, 26, 11], [58, 26, 12], [59, 26, 12],
    [60, 26, 13], [61, 26, 14], [62, 26, 15], [63, 26, 15], [64, 26, 15],
  ];
  for (const [y, x, w] of rightSkirt) {
    p(x,     y, 1, 1, GL); // gold lapel edge (inner edge of coat)
    p(x + 1, y, 1, 1, RL);
    p(x + 2, y, w - 3, 1, RM);
    p(x + w - 1, y, 1, 1, RX);
    if ((y - 56) % 3 === 0) p(x + 6, y, 1, 1, RD);
  }

  // Gold coat hem (rows 63-65)
  p(5,  63, 15, 1, GL); p(5,  63, 3, 1, GL);  // bottom of left skirt gold edge
  p(5,  64, 15, 1, GM); p(18, 64, 1, 1, GD);
  p(6,  65, 14, 1, GD);
  p(25, 63, 17, 1, GL); p(40, 63, 2, 1, GM);
  p(25, 64, 17, 1, GM);
  p(26, 65, 15, 1, GD);

  // ── HAIR (visible below hat brim at sides of face) ────────────────────────
  // Left sideburn (cols 12-14, rows 27-33)
  p(11, 27, 3, 1, HL); p(11, 28, 3, 1, HM); p(11, 29, 3, 1, HM); p(11, 30, 3, 1, HD);
  p(10, 31, 4, 1, HM); p(10, 32, 4, 1, HD); p(10, 33, 4, 1, HD);
  // Right sideburn (cols 33-36, rows 27-33)
  p(33, 27, 3, 1, HL); p(33, 28, 3, 1, HM); p(33, 29, 3, 1, HM); p(33, 30, 3, 1, HD);
  p(33, 31, 4, 1, HM); p(33, 32, 4, 1, HD); p(33, 33, 4, 1, HD);
  // Beard (rows 35-43, center-bottom of face)
  p(14, 35, 20, 1, HM); p(14, 35, 3, 1, HL); p(31, 35, 3, 1, HD);
  p(13, 36, 21, 1, HM); p(13, 36, 2, 1, HL); p(31, 36, 3, 1, HD);
  p(13, 37, 21, 1, HM); p(13, 37, 2, 1, HL);
  p(14, 38, 20, 1, HM); p(14, 38, 2, 1, HL); p(30, 38, 4, 1, HD);
  p(15, 39, 18, 1, HM); p(15, 39, 2, 1, HL); p(29, 39, 4, 1, HD);
  p(16, 40,  8, 1, HM); p(27, 40,  8, 1, HM); // beard lower (gap for neck)
  p(16, 41,  7, 1, HD); p(28, 41,  6, 1, HD);
  p(17, 42,  5, 1, HX); p(29, 42,  4, 1, HX);
  // Mustache above mouth
  p(19, 33, 2, 1, HM); p(21, 33, 4, 1, HM); p(25, 33, 2, 1, HM);
  p(18, 34, 1, 1, HM); p(19, 34, 2, 1, HD); p(25, 34, 2, 1, HD); p(27, 34, 1, 1, HM);

  // ── FACE (eyes, nose, mouth, eyebrows — neutral expression) ──────────────
  // Eyebrows
  p(16, 27, 5, 1, EBR); p(15, 26, 1, 1, EBR); // left brow (arched)
  p(27, 27, 5, 1, EBR); p(31, 26, 1, 1, EBR); // right brow

  // Left eye (cols 16-21, rows 28-32)
  p(16, 28, 5, 1, BLK);                           // top lash
  p(15, 29, 1, 1, BLK); p(16, 29, 1, 1, EYE); p(17, 29, 2, 1, WHT); p(19, 29, 1, 1, EYE); p(20, 29, 1, 1, BLK);
  p(15, 30, 1, 1, BLK); p(16, 30, 1, 1, EYE); p(17, 30, 1, 1, WHT); p(18, 30, 2, 1, EYE); p(20, 30, 1, 1, BLK);
  p(15, 31, 1, 1, BLK); p(16, 31, 4, 1, EYE); p(20, 31, 1, 1, BLK);
  p(16, 32, 4, 1, BLK);                           // bottom lash

  // Right eye (cols 27-32, rows 28-32)
  p(27, 28, 5, 1, BLK);
  p(27, 29, 1, 1, BLK); p(28, 29, 1, 1, EYE); p(29, 29, 2, 1, WHT); p(31, 29, 1, 1, EYE); p(32, 29, 1, 1, BLK);
  p(27, 30, 1, 1, BLK); p(28, 30, 1, 1, EYE); p(29, 30, 1, 1, WHT); p(30, 30, 2, 1, EYE); p(32, 30, 1, 1, BLK);
  p(27, 31, 1, 1, BLK); p(28, 31, 4, 1, EYE); p(32, 31, 1, 1, BLK);
  p(27, 32, 5, 1, BLK);

  // Nose (rows 33-35)
  p(21, 33, 1, 1, NSE); p(26, 33, 1, 1, NSE);
  p(20, 34, 1, 1, NSE); p(27, 34, 1, 1, NSE);
  p(21, 35, 6, 1, NSE); p(22, 35, 4, 1, SKD);

  // Mouth / lips (rows 36-37)
  p(19, 36, 10, 1, LIP); p(20, 36, 8, 1, '#8B3820');
  p(20, 37,  8, 1, SKD);                           // lower lip shadow

  // ── HAT (rows 0-26) — very tall dramatic wizard hat ──────────────────────
  // The cone leans slightly right and is tall (22 rows).
  // Using 3 shades for depth: HL2 (lit left), HM2 (mid), HD2 (shadow right), HX2 (darkest crease).

  // Cone rows 0-21
  //  row 0:  2px  cols 22-23
  p(22,  0,  2,  1, HM2);
  //  row 1:  4px  cols 21-24
  p(21,  1,  2,  1, HL2); p(23,  1,  1,  1, HM2); p(24,  1,  1,  1, HD2);
  //  row 2:  5px  cols 20-24
  p(20,  2,  2,  1, HL2); p(22,  2,  1,  1, HM2); p(23,  2,  1,  1, HM2); p(24,  2,  1,  1, HD2);
  //  row 3:  7px  cols 19-25
  p(19,  3,  2,  1, HL2); p(21,  3,  2,  1, HM2); p(23,  3,  1,  1, HM2); p(24,  3,  1,  1, HD2); p(25,  3,  1,  1, HX2);
  //  row 4:  8px  cols 18-25
  p(18,  4,  2,  1, HL2); p(20,  4,  3,  1, HM2); p(23,  4,  1,  1, HM2); p(24,  4,  1,  1, HD2); p(25,  4,  1,  1, HX2);
  //  row 5:  9px  cols 17-25
  p(17,  5,  2,  1, HL2); p(19,  5,  4,  1, HM2); p(23,  5,  1,  1, HM2); p(24,  5,  1,  1, HD2); p(25,  5,  2,  1, HX2);
  //  row 6: 10px  cols 16-25
  p(16,  6,  2,  1, HL2); p(18,  6,  5,  1, HM2); p(23,  6,  1,  1, HM2); p(24,  6,  2,  1, HD2); p(26,  6,  1,  1, HX2);
  //  row 7: 12px  cols 15-26
  p(15,  7,  2,  1, HL2); p(17,  7,  6,  1, HM2); p(23,  7,  1,  1, HM2); p(24,  7,  2,  1, HD2); p(26,  7,  2,  1, HX2);
  //  row 8: 13px  cols 14-26
  p(14,  8,  2,  1, HL2); p(16,  8,  7,  1, HM2); p(23,  8,  1,  1, HM2); p(24,  8,  2,  1, HD2); p(26,  8,  2,  1, HX2);
  //  row 9: 14px  cols 13-26
  p(13,  9,  2,  1, HL2); p(15,  9,  8,  1, HM2); p(23,  9,  1,  1, HM2); p(24,  9,  2,  1, HD2); p(26,  9,  2,  1, HX2);
  // row 10: 15px  cols 12-26
  p(12, 10,  2,  1, HL2); p(14, 10,  9,  1, HM2); p(23, 10,  1,  1, HM2); p(24, 10,  2,  1, HD2); p(26, 10,  2,  1, HX2);
  // row 11: 16px  cols 11-26
  p(11, 11,  2,  1, HL2); p(13, 11, 10,  1, HM2); p(23, 11,  1,  1, HM2); p(24, 11,  2,  1, HD2); p(26, 11,  2,  1, HX2);
  // row 12: 17px  cols 10-26
  p(10, 12,  2,  1, HL2); p(12, 12, 11,  1, HM2); p(23, 12,  1,  1, HM2); p(24, 12,  2,  1, HD2); p(26, 12,  2,  1, HX2);
  // row 13: 18px  cols  9-26
  p( 9, 13,  2,  1, HL2); p(11, 13, 12,  1, HM2); p(23, 13,  1,  1, HM2); p(24, 13,  2,  1, HD2); p(26, 13,  2,  1, HX2);
  // row 14: 20px  cols  8-27
  p( 8, 14,  2,  1, HL2); p(10, 14, 13,  1, HM2); p(23, 14,  1,  1, HM2); p(24, 14,  3,  1, HD2); p(27, 14,  1,  1, HX2);
  // row 15: 21px  cols  8-28
  p( 8, 15,  2,  1, HL2); p(10, 15, 13,  1, HM2); p(23, 15,  1,  1, HM2); p(24, 15,  3,  1, HD2); p(27, 15,  2,  1, HX2);
  // row 16: 22px  cols  7-28
  p( 7, 16,  2,  1, HL2); p( 9, 16, 14,  1, HM2); p(23, 16,  1,  1, HM2); p(24, 16,  3,  1, HD2); p(27, 16,  2,  1, HX2);
  // row 17: 23px  cols  7-29
  p( 7, 17,  2,  1, HL2); p( 9, 17, 14,  1, HM2); p(23, 17,  1,  1, HM2); p(24, 17,  4,  1, HD2); p(28, 17,  2,  1, HX2);
  // row 18: 24px  cols  6-29
  p( 6, 18,  2,  1, HL2); p( 8, 18, 15,  1, HM2); p(23, 18,  1,  1, HM2); p(24, 18,  4,  1, HD2); p(28, 18,  2,  1, HX2);
  // row 19: 25px  cols  6-30
  p( 6, 19,  2,  1, HL2); p( 8, 19, 15,  1, HM2); p(23, 19,  1,  1, HM2); p(24, 19,  4,  1, HD2); p(28, 19,  3,  1, HX2);
  // row 20: 26px  cols  5-30
  p( 5, 20,  2,  1, HL2); p( 7, 20, 16,  1, HM2); p(23, 20,  1,  1, HM2); p(24, 20,  5,  1, HD2); p(29, 20,  2,  1, HX2);
  // row 21: hat band — darker solid band
  p( 5, 21, 26,  1, HD2); p( 5, 21,  2,  1, HM2); p(29, 21,  3,  1, HX2);

  // Gold star emblem on hat band (center of the band)
  p(22, 20, 3, 1, GL);                            // top of star
  p(21, 21, 1, 1, GL); p(22, 21, 1, 1, GL); p(23, 21, 1, 1, GL); p(24, 21, 1, 1, GL); // cross
  p(22, 22, 3, 1, GL);                            // bottom of star (overlaps brim top)

  // Small purple gem on band (just below star)
  p(23, 21, 1, 1, CRM); p(22, 21, 1, 1, CRL);   // gem highlight on star center

  // Hat BRIM (rows 22-26, very wide, 4 rows thick)
  // Top of brim
  p( 5, 22, 30,  1, BRL); p( 5, 22,  4,  1, HL2); p(32, 22,  4,  1, HD2);  // highlight left, shadow right
  p( 5, 23, 30,  1, BRL); p( 5, 23,  3,  1, HL2); p(32, 23,  4,  1, HD2);
  // Mid brim
  p( 4, 24, 32,  1, BRD); p( 4, 24,  3,  1, BRL); p(33, 24,  3,  1, HX2);
  // Underside of brim (darker, shadow from hat cone)
  p( 4, 25, 32,  1, HD2); p( 4, 25,  2,  1, BRD); p(34, 25,  2,  1, HX2);
  p( 5, 26, 30,  1, HX2);
  // Gold edge on brim underside
  p( 5, 26,  3,  1, GD); p(32, 26,  3,  1, GD);

  return px;
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────
const PIXELS = buildWizard();

function WizardSVG({ size }: { size: number }) {
  const h = Math.round(size * 1.5);
  return (
    <svg
      width={size} height={h}
      viewBox="0 0 48 72"
      xmlns="http://www.w3.org/2000/svg"
      style={{ imageRendering: 'pixelated' } as React.CSSProperties}
      shapeRendering="crispEdges"
    >
      {PIXELS.map(([x, y, w, h, c], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={c} />
      ))}
    </svg>
  );
}

import wizardAiSprite from '../assets/sprites/wizard-ai-benchmark-trimmed.png';

export default function WizardBenchmark() {
  const sizes: { label: string; px: number }[] = [
    { label: '48px — native 1×', px: 48 },
    { label: '60px — party list', px: 60 },
    { label: '80px — detail panel', px: 80 },
    { label: '192px — home/character', px: 192 },
    { label: '240px — editor preview', px: 240 },
  ];

  return (
    <div style={{ background: '#0A0614', minHeight: '100vh', padding: '24px', fontFamily: 'monospace', color: '#D0B8FF' }}>
      <h1 style={{ fontSize: 14, letterSpacing: 2, marginBottom: 4, color: '#F8D840' }}>
        WIZARD BENCHMARK — v1
      </h1>
      <p style={{ fontSize: 11, color: '#8870C0', marginBottom: 32 }}>
        open-front coat · gold trim · tall hat · crystal staff · approval gate
      </p>

      <h2 style={{ fontSize: 12, letterSpacing: 2, marginBottom: 16, color: '#F8D840' }}>
        A — AI-GENERATED SPRITE (new direction)
      </h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 48, alignItems: 'flex-end', marginBottom: 48 }}>
        {sizes.map(({ label, px }) => (
          <div key={`ai-${px}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <img
              src={wizardAiSprite}
              alt="AI-generated wizard sprite"
              style={{ height: px * 1.5, width: 'auto', imageRendering: 'pixelated' }}
            />
            <span style={{ fontSize: 10, color: '#6850A8' }}>{label}</span>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 12, letterSpacing: 2, marginBottom: 16, color: '#F8D840' }}>
        B — CODE-DRAWN SPRITE (previous benchmark)
      </h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 48, alignItems: 'flex-end' }}>
        {sizes.map(({ label, px }) => (
          <div key={px} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <WizardSVG size={px} />
            <span style={{ fontSize: 10, color: '#6850A8' }}>{label}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 48, fontSize: 11, color: '#6850A8', lineHeight: 1.8 }}>
        <div>Canvas: 48×72 logical pixels</div>
        <div>Rendering: SVG shapeRendering="crispEdges" imageRendering="pixelated"</div>
        <div>Layers: background → staff → cape → boots → skin → coat → belt → face → hair → hat</div>
        <div>Skin: benchmark tone (tan) · Hair: chestnut · Eyes: blue · Robe: arcane purple</div>
      </div>
    </div>
  );
}
