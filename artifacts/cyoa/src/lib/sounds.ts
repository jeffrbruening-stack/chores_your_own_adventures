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

// "Ta-daaa!" fanfare — two quick pickup notes then a big held chord.
export function playTadaSound() {
  if (!audioCtx) return;

  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const t = audioCtx.currentTime;

  // Pickup notes: "ta-da"
  const pickup = audioCtx.createOscillator();
  const pickupGain = audioCtx.createGain();
  pickup.type = 'square';
  pickup.frequency.setValueAtTime(392.0, t); // G4
  pickup.frequency.setValueAtTime(523.25, t + 0.12); // C5
  pickupGain.gain.setValueAtTime(0.09, t);
  pickupGain.gain.setValueAtTime(0.09, t + 0.2);
  pickupGain.gain.exponentialRampToValueAtTime(0.00001, t + 0.26);
  pickup.connect(pickupGain);
  pickupGain.connect(audioCtx.destination);
  pickup.start(t);
  pickup.stop(t + 0.26);

  // Big held chord: "-aaa!" (C major with octave)
  const chordFreqs = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  chordFreqs.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = i === 3 ? 'triangle' : 'square';
    osc.frequency.setValueAtTime(freq, t + 0.28);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.setValueAtTime(0.055, t + 0.28);
    gain.gain.setValueAtTime(0.055, t + 0.55);
    gain.gain.exponentialRampToValueAtTime(0.00001, t + 1.1);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t + 0.28);
    osc.stop(t + 1.1);
  });
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
