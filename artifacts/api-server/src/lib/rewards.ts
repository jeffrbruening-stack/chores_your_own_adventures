// XP and gold reward tables per difficulty
export const DIFFICULTY_REWARDS = {
  easy:      { xp: 10,  gold: 10,  partyGold: 2  },
  normal:    { xp: 25,  gold: 20,  partyGold: 5  },
  hard:      { xp: 50,  gold: 40,  partyGold: 10 },
  epic:      { xp: 100, gold: 75,  partyGold: 20 },
  legendary: { xp: 250, gold: 100, partyGold: 40 },
} as const;

// XP thresholds to reach each level (index = level - 1)
const LEVEL_CURVE = [0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700, 3300, 4000, 4800, 5700, 6700];

export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return LEVEL_CURVE[level - 1] ?? (level * 600);
}

export function levelFromXp(totalXp: number): number {
  let level = 1;
  for (let i = 1; i < LEVEL_CURVE.length; i++) {
    if (totalXp >= LEVEL_CURVE[i]) level = i + 1;
    else break;
  }
  return level;
}

export function xpForNextLevel(level: number): number {
  return xpForLevel(level + 1) - xpForLevel(level);
}
