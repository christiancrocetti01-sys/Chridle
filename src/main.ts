import './style.css';
import { MAX_TICKS_PER_FRAME, TICK_MS, stepAccumulator } from './core/loop';
import { loadGame, saveGame, type StorageLike } from './core/save';
import { changeGear, step, type CombatEvent } from './core/combat';
import { chooseSecondVia, chooseVia } from './core/vie';
import { enterAbyss, enterDungeon, enterRaid, enterTower, leaveMode } from './core/modes';
import { rebirth } from './core/endgame';
import { ascend } from './core/ascension';
import { applyOffline } from './core/offline';
import { showOfflineReport } from './ui/ascension';
import { newGame } from './core/state';
import { absorbInventory } from './core/autoequip';
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

  // progresso offline: all'apertura e al ritorno sulla scheda del browser
  const catchUp = () => {
    const report = applyOffline(state, (Date.now() - state.lastSeen) / 1000);
    state.lastSeen = Date.now();
    if (report) showOfflineReport(report);
  };
  catchUp();

  let acc = 0;
  let last = performance.now();
  const frame = (now: number) => {
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

  const save = () => saveGame(storage, state, Date.now());
  setInterval(save, AUTOSAVE_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) save();
    else {
      catchUp();
      last = performance.now();
    }
  });
  window.addEventListener('pagehide', save);
}

main();
