import { SECOND_VIA_SHARE, VIA_LEVEL, viaDef, type ViaId } from '../data/vie';
import type { RuleId } from '../data/uniques';
import type { StatMods } from './items';
import type { GameState } from './state';
import { unlockSkills } from './skills';

export interface ViaState {
  main: ViaId | null;
  second: ViaId | null;
  /** La seconda Via (ibrido) si sblocca con l'endgame. */
  secondUnlocked: boolean;
}

export const newVie = (): ViaState => ({ main: null, second: null, secondUnlocked: false });

/** Vie attive, la principale per prima. */
export const activeVie = (v: ViaState | undefined): ViaId[] =>
  v ? [v.main, v.second].filter((x): x is ViaId => !!x) : [];

/** Aggiunge le statistiche delle Vie e restituisce le loro regole. */
export function addViaMods(v: ViaState | undefined, m: StatMods): Set<RuleId> {
  const rules = new Set<RuleId>();
  if (!v) return rules;
  for (const [id, share] of [[v.main, 1], [v.second, SECOND_VIA_SHARE]] as const) {
    const d = viaDef(id);
    if (!d) continue;
    for (const [stat, value] of d.mods) m[stat] += value * share;
    rules.add(d.rule);
  }
  return rules;
}

/** Le Vie non hanno più skill proprie: si riallineano solo gli slot. */
function refreshSkills(state: GameState) {
  unlockSkills(state.skills, state.hero.level);
}

/** Sceglie (o cambia, gratis) la Via principale. Le Stelle si restituiscono e si riassegnano da sole. */
export function chooseVia(state: GameState, id: ViaId): boolean {
  if (state.hero.level < VIA_LEVEL || !viaDef(id) || state.vie.main === id) return false;
  if (state.vie.second === id) state.vie.second = state.vie.main;
  state.vie.main = id;
  state.stars = []; // l'albero si rifà da solo per la nuova Via
  refreshSkills(state);
  return true;
}

/** Sceglie la seconda Via (null = nessuna). Serve la prima e lo sblocco dell'endgame. */
export function chooseSecondVia(state: GameState, id: ViaId | null): boolean {
  const v = state.vie;
  if (!v.secondUnlocked || !v.main || id === v.main || (id && !viaDef(id))) return false;
  v.second = id;
  state.stars = [];
  refreshSkills(state);
  return true;
}
