import './style.css';
import { MAX_TICKS_PER_FRAME, TICK_MS, stepAccumulator } from './core/loop';
import { loadGame, saveGame, type StorageLike } from './core/save';
import { changeGear, step, type CombatEvent } from './core/combat';
import { chooseSecondVia, chooseVia } from './core/vie';
import { enterAbyss, enterDungeon, enterRaid, enterTower, leaveMode } from './core/modes';
import { rebirth } from './core/endgame';
import { ascend } from './core/ascension';
import { runOffline, startOffline } from './core/offline';
import { showOfflineProgress, showOfflineReport } from './ui/ascension';
import { newGame } from './core/state';
import { absorbInventory } from './core/autoequip';
import { createHud } from './ui/hud';

const AUTOSAVE_MS = 10_000;
/** Millisecondi di calcolo offline per blocco, prima di ridare la mano al browser. */
const OFFLINE_SLICE_MS = 40;

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

function main() {
  const storage = getStorage();
  const state = loadGame(storage) ?? newGame(Date.now());
  absorbInventory(state);
  const hud = createHud(document.getElementById('hud')!, {
    enterDungeon: () => enterDungeon(state),
    enterTower: () => enterTower(state),
    enterRaid: () => enterRaid(state),
    enterAbyss: () => enterAbyss(state),
    rebirth: () => rebirth(state),
    leaveMode: () => leaveMode(state, []),
    ascend: () => ascend(state),
    chooseVia: (id) => changeGear(state, () => chooseVia(state, id)),
    chooseSecondVia: (id) => changeGear(state, () => chooseSecondVia(state, id)),
  });

  // progresso offline: all'apertura e al ritorno sulla scheda del browser. Si simula a blocchi
  // lasciando respirare la pagina; intanto il ciclo normale è fermo.
  let catching = false;
  const catchUp = async () => {
    if (catching) return;
    const run = startOffline(state, (Date.now() - state.lastSeen) / 1000);
    if (!run) {
      state.lastSeen = Date.now();
      return;
    }
    catching = true;
    const progress = showOfflineProgress();
    for (;;) {
      const t = performance.now();
      let done = false;
      while (!done && performance.now() - t < OFFLINE_SLICE_MS) done = runOffline(state, run, 500);
      progress(run.done / run.total, run.report);
      hud.update(state);
      if (done) break;
      await new Promise((r) => setTimeout(r, 0));
    }
    progress(null, run.report);
    state.lastSeen = Date.now();
    last = performance.now();
    catching = false;
    hud.update(state);
    showOfflineReport(run.report);
  };

  let acc = 0;
  let last = performance.now();
  void catchUp();
  const frame = (now: number) => {
    if (catching) {
      requestAnimationFrame(frame);
      return;
    }
    const r = stepAccumulator(acc, now - last, TICK_MS, MAX_TICKS_PER_FRAME);
    last = now;
    acc = r.acc;
    const events: CombatEvent[] = [];
    for (let i = 0; i < r.ticks; i++) step(state, events);
    hud.onEvents(events);
    hud.update(state);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  // durante il calcolo offline si salva fin dove si è simulato: alla riapertura si riprende da lì
  const save = () => saveGame(storage, state, catching ? state.lastSeen : Date.now());
  setInterval(save, AUTOSAVE_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) save();
    else {
      last = performance.now();
      void catchUp();
    }
  });
  window.addEventListener('pagehide', save);
}

main();

// gioco installabile come app (PWA): solo nella build pubblicata, non in sviluppo
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
