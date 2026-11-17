// Procedural Web Audio sound effects. No audio files, no network:
// every sound is synthesized from oscillators and filtered noise.

let audioCtx = null;
let muted = false;

export function setMuted(m) { muted = m; }
export function isMuted() { return muted; }

// Must be called from a user gesture at least once (title Start button).
export function ensureAudio() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { audioCtx = null; }
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function tone(freq, dur, type, vol, slideTo) {
  if (muted || !audioCtx) return;
  const t0 = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
  g.gain.setValueAtTime(vol || 0.15, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(g); g.connect(audioCtx.destination);
  osc.start(t0); osc.stop(t0 + dur + 0.02);
}

function noise(dur, vol, filterFreq, type) {
  if (muted || !audioCtx) return;
  const t0 = audioCtx.currentTime;
  const len = Math.max(1, Math.floor(audioCtx.sampleRate * dur));
  const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const filter = audioCtx.createBiquadFilter();
  filter.type = type || 'lowpass';
  filter.frequency.value = filterFreq || 800;
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(vol || 0.2, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(filter); filter.connect(g); g.connect(audioCtx.destination);
  src.start(t0);
}

export const sfx = {
  click() { tone(660, 0.06, 'triangle', 0.12); },
  build() { tone(220, 0.12, 'square', 0.1, 440); noise(0.08, 0.08, 2000, 'highpass'); },
  zap() { tone(1400, 0.09, 'sawtooth', 0.07, 180); noise(0.05, 0.05, 4000, 'highpass'); },
  shoot() { tone(520, 0.07, 'square', 0.08, 260); },
  boom() { noise(0.35, 0.3, 320); tone(90, 0.3, 'sine', 0.22, 45); },
  frost() { tone(1200, 0.25, 'sine', 0.08, 1900); tone(1800, 0.2, 'sine', 0.05, 2400); },
  coin() { tone(990, 0.08, 'sine', 0.1); setTimeout(() => tone(1320, 0.12, 'sine', 0.1), 60); },
  hit() { tone(180, 0.08, 'triangle', 0.1, 90); },
  shatter() { noise(0.2, 0.18, 3000, 'bandpass'); tone(2200, 0.15, 'sine', 0.08, 900); },
  leak() { tone(330, 0.25, 'sawtooth', 0.12, 165); },
  horn() { tone(196, 0.5, 'sawtooth', 0.12); tone(294, 0.5, 'sawtooth', 0.1); },
  beam() { tone(880, 0.4, 'sawtooth', 0.1, 220); noise(0.3, 0.1, 2500, 'highpass'); },
  well() { tone(220, 0.5, 'sine', 0.14, 55); },
  meteor() { noise(0.5, 0.25, 500); tone(140, 0.45, 'sine', 0.18, 50); },
  draft() { tone(523, 0.15, 'sine', 0.1); setTimeout(() => tone(659, 0.15, 'sine', 0.1), 90); setTimeout(() => tone(784, 0.25, 'sine', 0.1), 180); },
  victory() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.35, 'triangle', 0.12), i * 140)); },
  defeat() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.4, 'sawtooth', 0.09), i * 160)); },
};
