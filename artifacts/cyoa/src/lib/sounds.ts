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
