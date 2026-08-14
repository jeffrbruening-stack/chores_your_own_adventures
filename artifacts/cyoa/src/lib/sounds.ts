// Simple Web Audio API sounds

const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

export function playSuccessSound() {
  if (!audioCtx) return;
  
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  osc.type = 'square';
  
  osc.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
  osc.frequency.setValueAtTime(554.37, audioCtx.currentTime + 0.1); // C#5
  osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.2); // E5
  osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.3); // A5

  gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.6);

  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + 0.6);
}

// Trumpet-like "MIDI brass" voice: two slightly detuned sawtooth oscillators.
function brassNote(freq: number, start: number, dur: number, vol = 0.05) {
  [0, 4].forEach((detune) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, start);
    osc.detune.setValueAtTime(detune, start);
    // Quick attack, slight decay, release
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(vol, start + 0.02);
    gain.gain.setValueAtTime(vol, start + dur - 0.04);
    gain.gain.exponentialRampToValueAtTime(0.00001, start + dur + 0.08);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(start);
    osc.stop(start + dur + 0.1);
  });
}

// Classic MIDI trumpet fanfare: "da-da-da-DAAAA!" ending on a big major chord.
export function playTadaSound() {
  if (!audioCtx) return;

  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const t = audioCtx.currentTime;
  const G4 = 392.0, C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.5;

  // Triplet pickup: da-da-da (G4, C5, E5)
  brassNote(G4, t, 0.13);
  brassNote(C5, t + 0.15, 0.13);
  brassNote(E5, t + 0.3, 0.13);

  // DAAAA! — held C major chord with octave sparkle
  const chordStart = t + 0.46;
  brassNote(C5, chordStart, 0.75, 0.045);
  brassNote(E5, chordStart, 0.75, 0.045);
  brassNote(G5, chordStart, 0.75, 0.05);
  brassNote(C6, chordStart, 0.75, 0.035);
}

export function playLevelUpSound() {
  if (!audioCtx) return;

  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  osc.type = 'square';
  
  // Arpeggio up
  osc.frequency.setValueAtTime(261.63, audioCtx.currentTime); // C4
  osc.frequency.setValueAtTime(329.63, audioCtx.currentTime + 0.1); // E4
  osc.frequency.setValueAtTime(392.00, audioCtx.currentTime + 0.2); // G4
  osc.frequency.setValueAtTime(523.25, audioCtx.currentTime + 0.3); // C5
  osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.45); // E5
  
  gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime + 0.4);
  gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 1.0);

  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + 1.0);
}
