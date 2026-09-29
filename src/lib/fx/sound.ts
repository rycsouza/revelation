/**
 * Efeitos sonoros sintetizados com Web Audio: nada de arquivo para baixar nem direito autoral.
 * O navegador só libera áudio depois de um toque, por isso `unlockAudio()` roda no botão de abertura.
 */

let ctx: AudioContext | null = null;
let muted = false;

export function unlockAudio() {
  if (typeof window === "undefined") return;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
}

export function setSoundMuted(value: boolean) {
  muted = value;
}

function audio() {
  return muted || !ctx ? null : ctx;
}

function tone(freq: number, at: number, duration: number, opts: { type?: OscillatorType; gain?: number; slideTo?: number } = {}) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + at;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(freq, t);
  if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, t + duration);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(opts.gain ?? 0.2, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

function noise(at: number, duration: number, gainValue: number, filterFreq: number) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + at;
  const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * duration), ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2;
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = filterFreq;
  const gain = ac.createGain();
  gain.gain.value = gainValue;
  src.connect(filter).connect(gain).connect(ac.destination);
  src.start(t);
}

export const sfx = {
  pop() {
    noise(0, 0.12, 0.9, 1800);
    tone(520, 0, 0.12, { type: "triangle", gain: 0.15, slideTo: 90 });
  },
  thump() {
    tone(140, 0, 0.18, { type: "sine", gain: 0.35, slideTo: 60 });
    noise(0, 0.06, 0.3, 600);
  },
  tick() {
    tone(1200, 0, 0.05, { type: "square", gain: 0.05 });
  },
  chime() {
    [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.09, 0.6, { gain: 0.12 }));
  },
  fanfare() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => tone(f, i * 0.12, 0.35, { type: "triangle", gain: 0.18 }));
    [1047, 1319, 1568].forEach((f) => tone(f, 0.5, 1.4, { type: "triangle", gain: 0.12 }));
  },
};

export function vibrate(pattern: number | number[]) {
  if (muted) return;
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  // Sem um toque real na página, o Chrome bloqueia e reclama no console.
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  navigator.vibrate(pattern);
}
