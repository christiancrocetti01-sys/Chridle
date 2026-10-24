import { ASCEND_STAGE, OFFLINE_BASE, PERKS, perkDef, scintilleFor, type PerkId } from '../data/ascension';
import type { StatMods } from './items';
import { unlockSkills } from './skills';
import type { GameState } from './state';
import { stateStats } from './stats';
import { activeVie } from './vie';
import { sparkMult } from './endgame';

export interface AscensionState {
  count: number;
  /** Scintille da spendere. */
  scintille: number;
  /** Scintille guadagnate in tutto. */
  total: number;
  perks: Partial<Record<PerkId, number>>;
}

export const newAscension = (): AscensionState => ({ count: 0, scintille: 0, total: 0, perks: {} });

export const perkLevel = (a: AscensionState | undefined, id: PerkId) => a?.perks[id] ?? 0;
/** Valore totale di un potenziamento (livello × valore per livello). */
export const perkValue = (a: AscensionState | undefined, id: PerkId) => perkLevel(a, id) * perkDef(id)!.value;
export const perkCost = (a: AscensionState, id: PerkId) => {
  const d = perkDef(id)!;
  return Math.ceil(d.cost * Math.pow(d.growth, perkLevel(a, id)));
};
export const offlineEfficiency = (a: AscensionState | undefined) => Math.min(1, OFFLINE_BASE + perkValue(a, 'veglia'));
export const startStage = (a: AscensionState | undefined) => 1 + perkValue(a, 'balzo');

/** Statistiche dei potenziamenti dell'Ascensione. */
export function addPerkMods(a: AscensionState | undefined, m: StatMods) {
  if (!a) return;
  const f = perkValue(a, 'fiamma');
  m.atkPct += f;
  m.hpPct += f;
  m.goldPct += perkValue(a, 'oro');
  m.xpPct += perkValue(a, 'sapienza');
  m.magicFind += perkValue(a, 'fortuna');
}

export const canAscend = (state: GameState) => state.stage.best >= ASCEND_STAGE && state.mode.kind === 'campaign';

export function buyPerk(state: GameState, id: PerkId): boolean {
  const a = state.ascension;
  const d = perkDef(id);
  if (!d || (d.max !== undefined && perkLevel(a, id) >= d.max)) return false;
  const cost = perkCost(a, id);
  if (a.scintille < cost) return false;
  a.scintille -= cost;
  a.perks[id] = perkLevel(a, id) + 1;
  if (id === 'slot') state.skills.slots.push(null);
  if (id === 'secondaVia') state.vie.secondUnlocked = true;
  return true;
}

/**
 * Ascende: Scintille in base allo stage record, poi si riparte da livello 1 e dallo stage iniziale.
 * Restano oggetti, Frammenti, Essenza, rune, chiavi, Torre, Vie e potenziamenti dell'Ascensione.
 */
export function ascend(state: GameState): number {
  if (!canAscend(state)) return 0;
  const gain = scintilleGain(state);
  const a = state.ascension;
  a.count++;
  a.scintille += gain;
  a.total += gain;
  restartRun(state);
  return gain;
}

/** Scintille ottenute ascendendo ora (i Soli della Rinascita le moltiplicano). */
export const scintilleGain = (state: GameState) => Math.floor(scintilleFor(state.stage.best) * sparkMult(state.rebirth));

/** Riparte da livello 1 e dallo stage iniziale (Ascensione e Rinascita). */
export function restartRun(state: GameState) {
  const start = startStage(state.ascension);
  state.hero = { level: 1, xp: 0, hp: 0, swing: 0, shield: 0, hits: 0, buffs: [], nextCrit: false, light: 0, sanctity: 0 };
  state.gold = 0;
  state.upgrades = { forza: 0, corazza: 0, rapidita: 0 };
  state.stage = { current: start, best: start, kills: 0, auto: true };
  state.enemy = null;
  state.respawn = 0;
  state.stars = []; // i punti vengono dal livello: si riassegnano salendo
  state.skills.slots = state.skills.slots.map(() => null);
  state.skills.cooldowns = {};
  unlockSkills(state.skills, 1, activeVie(state.vie));
  state.hero.hp = stateStats(state).maxHp;
}

export { PERKS };
