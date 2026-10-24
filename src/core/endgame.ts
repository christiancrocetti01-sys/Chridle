/** Endgame: Paragon (livelli infiniti dall'Abisso) e Rinascita Solare (reset delle Ascensioni per i Soli). */
import {
  ABYSS_ASCENSIONS, PARAGON, SOLE_LOOT, SOLE_POWER, SOLE_SPARK, paragonCost, soliFor, type ParagonId,
} from '../data/endgame';
import { newAscension, restartRun } from './ascension';
import type { StatMods } from './items';
import type { GameState } from './state';

export interface ParagonState {
  level: number;
  xp: number;
  /** Punti spesi per bonus. */
  points: Partial<Record<ParagonId, number>>;
}

export interface RebirthState {
  count: number;
  /** Soli guadagnati in tutto (permanenti). */
  soli: number;
}

export const newParagon = (): ParagonState => ({ level: 0, xp: 0, points: {} });
export const newRebirth = (): RebirthState => ({ count: 0, soli: 0 });

// ---------------------------------------------------------------- Paragon

export const paragonSpent = (p: ParagonState) => Object.values(p.points).reduce((s, n) => s + (n ?? 0), 0);
export const paragonFree = (p: ParagonState) => p.level - paragonSpent(p);

/** Aggiunge esperienza Paragon. Restituisce i livelli guadagnati. */
export function gainParagon(state: GameState, xp: number): number {
  const p = state.paragon;
  p.xp += xp * lootMult(state.rebirth);
  let n = 0;
  while (p.xp >= paragonCost(p.level)) {
    p.xp -= paragonCost(p.level);
    p.level++;
    n++;
  }
  return n;
}

export function spendParagon(state: GameState, id: ParagonId): boolean {
  const p = state.paragon;
  if (paragonFree(p) <= 0 || !PARAGON.some((d) => d.id === id)) return false;
  p.points[id] = (p.points[id] ?? 0) + 1;
  return true;
}

/** Riprende tutti i punti spesi (gratis: il Paragon è un pozzo di scelte, non di valuta). */
export function resetParagon(state: GameState) {
  state.paragon.points = {};
}

export function addParagonMods(p: ParagonState | undefined, m: StatMods) {
  if (!p) return;
  for (const d of PARAGON) {
    const n = p.points[d.id] ?? 0;
    if (n) for (const [k, v] of d.mods) m[k] += v * n;
  }
}

// ---------------------------------------------------------------- Rinascita Solare

/** Moltiplicatore di attacco, vita e difesa dei Soli. */
export const powerMult = (r: RebirthState | undefined) => 1 + (r?.soli ?? 0) * SOLE_POWER;
/** Moltiplicatore di oro, XP, Essenza ed esperienza Paragon. */
export const lootMult = (r: RebirthState | undefined) => 1 + (r?.soli ?? 0) * SOLE_LOOT;
/** Moltiplicatore delle Scintille. */
export const sparkMult = (r: RebirthState | undefined) => 1 + (r?.soli ?? 0) * SOLE_SPARK;

export const abyssUnlocked = (state: GameState) => state.ascension.count >= ABYSS_ASCENSIONS || state.rebirth.count > 0;

export const rebirthGain = (state: GameState) => soliFor(state.ascension.total);
export const canRebirth = (state: GameState) => rebirthGain(state) > 0 && state.mode.kind === 'campaign';

/**
 * Rinascita Solare: si azzerano Ascensioni, Scintille e potenziamenti (tranne gli slot delle skill e la
 * Doppia Via, che restano), poi si riparte come in un'Ascensione. In cambio i Soli, per sempre.
 */
export function rebirth(state: GameState): number {
  if (!canRebirth(state)) return 0;
  const gain = rebirthGain(state);
  const kept = { slot: state.ascension.perks.slot, secondaVia: state.ascension.perks.secondaVia };
  state.ascension = newAscension();
  for (const [k, v] of Object.entries(kept)) if (v) state.ascension.perks[k as 'slot' | 'secondaVia'] = v;
  state.rebirth.count++;
  state.rebirth.soli += gain;
  restartRun(state);
  return gain;
}
