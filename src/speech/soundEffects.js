// Tiny synthesized UI sounds (Web Audio) — no audio files needed.

let ctx = null;
function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, start, dur, { type = 'sine', gain = 0.08 } = {}) {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + start;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  /** Call from a user gesture (START button) so browsers allow audio later. */
  unlock() {
    audio();
  },
  confirm() {
    tone(880, 0, 0.12);
    tone(1318.5, 0.07, 0.18);
  },
  success() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.08, 0.22, { gain: 0.07 }));
  },
  hint() {
    tone(440, 0, 0.08, { type: 'triangle', gain: 0.04 });
  },
};
