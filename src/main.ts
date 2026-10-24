import './style.css';
import { MAX_TICKS_PER_FRAME, TICK_MS, stepAccumulator } from './core/loop';
import { loadGame, saveGame, type StorageLike } from './core/save';
import { buyUpgrade, changeGear, step, type CombatEvent } from './core/combat';
import { moveSlot, setSlot } from './core/skills';
import { fuseItems, rerollAffix, transferAffix, upgradeAffix } from './core/craft';
import { equip, salvage, salvageUpTo, unequip } from './core/items';
import { newGame } from './core/state';
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
  const hud = createHud(document.getElementById('hud')!, {
    buy: (id) => buyUpgrade(state, id),
    equip: (uid, slot) => changeGear(state, () => equip(state.gear, uid, slot)),
    unequip: (slot) => changeGear(state, () => unequip(state.gear, slot)),
    salvage: (uid) => (state.fragments += salvage(state.gear, uid)),
    salvageUpTo: (r) => (state.fragments += salvageUpTo(state.gear, r)),
    setAutoSalvage: (r) => (state.gear.autoSalvage = r),
    reroll: (uid, i) => changeGear(state, () => rerollAffix(state, uid, i)),
    upgrade: (uid, i) => changeGear(state, () => upgradeAffix(state, uid, i)),
    transfer: (uid, i, d, j) => changeGear(state, () => transferAffix(state, uid, i, d, j)),
    fuse: (uids) => fuseItems(state, uids),
    setSkillSlot: (slot, id) => setSlot(state, slot, id),
    moveSkillSlot: (slot, dir) => moveSlot(state, slot, dir),
  });

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
  document.addEventListener('visibilitychange', () => document.hidden && save());
  window.addEventListener('pagehide', save);
}

main();
