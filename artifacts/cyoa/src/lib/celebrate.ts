import confetti from 'canvas-confetti';

// Quest-complete celebration: a couple of confetti pops from both sides.
export function celebrateQuestComplete() {
  const defaults = { ticks: 200, gravity: 1.1, scalar: 1, zIndex: 9999 };
  confetti({ ...defaults, particleCount: 80, spread: 70, origin: { x: 0.5, y: 0.7 } });
  setTimeout(() => {
    confetti({ ...defaults, particleCount: 40, angle: 60, spread: 55, origin: { x: 0, y: 0.8 } });
    confetti({ ...defaults, particleCount: 40, angle: 120, spread: 55, origin: { x: 1, y: 0.8 } });
  }, 150);
}

// Bigger burst for level-ups: gold star shower.
export function celebrateLevelUp() {
  const defaults = { ticks: 260, gravity: 0.9, zIndex: 9999, colors: ['#FFD700', '#FFA500', '#FFF8DC', '#FF6347'] };
  confetti({ ...defaults, particleCount: 120, spread: 100, scalar: 1.2, origin: { x: 0.5, y: 0.6 } });
  setTimeout(() => {
    confetti({ ...defaults, particleCount: 60, spread: 120, scalar: 0.9, shapes: ['star'], origin: { x: 0.5, y: 0.4 } });
  }, 250);
  setTimeout(() => {
    confetti({ ...defaults, particleCount: 40, angle: 60, spread: 55, origin: { x: 0, y: 0.8 } });
    confetti({ ...defaults, particleCount: 40, angle: 120, spread: 55, origin: { x: 1, y: 0.8 } });
  }, 450);
}
