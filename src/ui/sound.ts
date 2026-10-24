/** Suoni sintetizzati con WebAudio (nessun file esterno). Spenti di default, la scelta resta nel browser. */
const KEY = 'chridle.sound';
let ctx: AudioContext | null = null;
let on = read();
let lastAt = 0;

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export const soundOn = () => on;

export function toggleSound(): boolean {
  on = !on;
  try {
    localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    // storage bloccato: vale solo per questa sessione
  }
  if (on) beep([660, 990], 0.08);
  return on;
}

/** Note in sequenza (Hz), ognuna lunga `dur` secondi. */
export function beep(notes: number[], dur = 0.06, type: OscillatorType = 'triangle', gain = 0.05) {
  if (!on) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    const t0 = ctx.currentTime;
    notes.forEach((f, i) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.type = type;
      o.frequency.value = f;
      const t = t0 + i * dur;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(gain, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.8);
      o.connect(g).connect(ctx!.destination);
      o.start(t);
      o.stop(t + dur * 2);
    });
  } catch {
    // audio non disponibile
  }
}

/** Suoni frequenti (critici) al massimo uno ogni 120 ms. */
export function throttled(fn: () => void) {
  const now = performance.now();
  if (now - lastAt < 120) return;
  lastAt = now;
  fn();
}

export const SFX = {
  crit: () => throttled(() => beep([1320], 0.04, 'square', 0.02)),
  kill: () => beep([440, 660], 0.05),
  boss: () => beep([330, 440, 660, 880], 0.08, 'triangle', 0.06),
  level: () => beep([523, 659, 784, 1047], 0.07, 'triangle', 0.06),
  death: () => beep([220, 165, 110], 0.12, 'sawtooth', 0.03),
  loot: (rarity: number) => beep(rarity >= 6 ? [784, 988, 1175, 1568, 1976] : rarity >= 5 ? [659, 880, 1175, 1568] : [587, 880, 1175], 0.09, 'sine', 0.07),
  key: () => beep([988, 1319], 0.07, 'sine', 0.05),
};
