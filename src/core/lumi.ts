import { LUMI, LUMO_COST_BASE, LUMO_COST_GROWTH, LUMO_IDLE_SHARE, type LumoId } from '../data/lumi';
import { trackValue } from './achievements';
import type { StatMods } from './items';
import type { GameState } from './state';

export interface LumiState {
  /** Livello dei Lumi sbloccati (assente = bloccato). Restano all'Ascensione. */
  levels: Partial<Record<LumoId, number>>;
  active: LumoId | null;
}

export const newLumi = (): LumiState => ({ levels: {}, active: null });
export const lumoDef = (id: LumoId) => LUMI.find((l) => l.id === id)!;

/** Essenza per passare dal livello `level` al successivo. */
export const lumoCost = (level: number) => Math.ceil(LUMO_COST_BASE * Math.pow(LUMO_COST_GROWTH, level - 1));

/** Sblocca i Lumi raggiunti (livello 1; il primo diventa attivo). Restituisce gli id nuovi. */
export function checkLumi(state: GameState): LumoId[] {
  const l = state.lumi;
  const gained = LUMI.filter((d) => !l.levels[d.id] && trackValue(state, d.unlock.track) >= d.unlock.n).map((d) => d.id);
  for (const id of gained) l.levels[id] = 1;
  if (!l.active && gained.length) l.active = gained[0];
  return gained;
}

export function levelLumo(state: GameState, id: LumoId): boolean {
  const lv = state.lumi.levels[id];
  if (!lv || state.essence < lumoCost(lv)) return false;
  state.essence -= lumoCost(lv);
  state.lumi.levels[id] = lv + 1;
  return true;
}

/** Somma i bonus dei Lumi: pieno + effetto per l'attivo, una parte per gli altri. */
export function addLumiMods(lumi: LumiState | undefined, mods: StatMods) {
  if (!lumi) return;
  for (const d of LUMI) {
    const lv = lumi.levels[d.id];
    if (!lv) continue;
    const share = lumi.active === d.id ? 1 : LUMO_IDLE_SHARE;
    for (const [k, v] of d.perLevel) mods[k] += v * lv * share;
    if (lumi.active === d.id) for (const [k, v] of d.special) mods[k] += v;
  }
}
