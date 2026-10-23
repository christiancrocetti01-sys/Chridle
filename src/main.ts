import './style.css';
import { MAX_TICKS_PER_FRAME, TICK_MS, stepAccumulator } from './core/loop';
import { loadGame, saveGame, type StorageLike } from './core/save';
import { newGame, step } from './core/state';
import type { InkStyle } from './render/dither';
import { createScene } from './render/scene';
import { createHud } from './ui/hud';

const AUTOSAVE_MS = 10_000;

function getStorage(): StorageLike {
  try {
    const s = window.localStorage;
    s.setItem('chridle.probe', '1');
    return s;
  } catch {
    // modalità privata o storage bloccato: si gioca senza salvare
    const mem = new Map<string, string>();
    return { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v) };
  }
}

async function main() {
  const storage = getStorage();
  const state = loadGame(storage) ?? newGame(Date.now());
  const scene = await createScene(document.getElementById('stage')!);
  const param = new URLSearchParams(location.search).get('stile');
  const style: InkStyle = param === 'mono' || param === 'colore' ? param : 'oro';
  scene.setStyle(style);
  const hud = createHud(document.getElementById('hud')!, scene.setStyle, style);

  let acc = 0;
  scene.app.ticker.add((ticker) => {
    const r = stepAccumulator(acc, ticker.deltaMS, TICK_MS, MAX_TICKS_PER_FRAME);
    acc = r.acc;
    for (let i = 0; i < r.ticks; i++) step(state);
    scene.draw(state, r.alpha);
    hud.update(state, ticker.FPS);
  });

  const save = () => saveGame(storage, state, Date.now());
  setInterval(save, AUTOSAVE_MS);
  document.addEventListener('visibilitychange', () => document.hidden && save());
  window.addEventListener('pagehide', save);
}

main();
