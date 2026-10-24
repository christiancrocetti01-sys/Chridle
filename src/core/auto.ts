import { RUNE_SOCKETS, type RuneId } from '../data/runes';
import { levelCost, unlockCost, unlockRune, levelRune } from './runes';
import { levelSkill, skillLevelCost } from './skills';
import { levelLumo, lumoCost } from './lumi';
import type { GameState } from './state';

/** Le 2 rune di ogni skill, in ordine di preferenza. */
export const RUNE_PLAN: Record<string, RuneId[]> = {
  colpoSacro: ['potenza', 'esecuzione'],
  preghiera: ['custodia', 'purificazione'],
  squarcio: ['potenza', 'feritaAperta'],
  egida: ['custodia', 'bastione'],
  lamaRapida: ['custodia', 'persistenza'],
  giudizio: ['potenza', 'pazienza'],
};

/** Ordine di sblocco: prima le rune che servono a più skill e quelle di danno. */
const RUNE_ORDER: RuneId[] = ['potenza', 'custodia', 'esecuzione', 'feritaAperta', 'purificazione', 'bastione', 'pazienza', 'persistenza'];

/** Rune che servono alle skill sbloccate, nell'ordine in cui si sbloccano. */
export function wantedRunes(state: GameState): RuneId[] {
  return RUNE_ORDER.filter((r) => state.skills.slots.some((id) => id && RUNE_PLAN[id]?.includes(r)));
}

/** Incastona in ogni skill le sue rune già sbloccate; toglie le rune dalle skill che non ci sono più. */
export function autoSocket(state: GameState) {
  const sockets: Record<string, (RuneId | null)[]> = {};
  for (const id of state.skills.slots) {
    if (!id) continue;
    const owned = (RUNE_PLAN[id] ?? []).filter((r) => state.runes.levels[r]).slice(0, RUNE_SOCKETS);
    sockets[id] = [...owned, ...Array(RUNE_SOCKETS - owned.length).fill(null)];
  }
  state.runes.sockets = sockets;
}

type Buy = { cost: number; buy: () => boolean };

/** Spende l'Essenza: compra sempre la cosa più economica tra livelli delle skill, rune nuove, livelli delle rune e del Lumo attivo. */
export function autoEssence(state: GameState): number {
  let bought = 0;
  for (let n = 0; n < 1000; n++) {
    const options: Buy[] = [];
    for (const id of state.skills.slots) {
      if (id) options.push({ cost: skillLevelCost(state.skills.levels[id] ?? 1), buy: () => levelSkill(state, id) });
    }
    const wanted = wantedRunes(state);
    const next = wanted.find((r) => !state.runes.levels[r]);
    if (next) options.push({ cost: unlockCost(state), buy: () => unlockRune(state, next) });
    for (const r of wanted) {
      const level = state.runes.levels[r];
      if (level) options.push({ cost: levelCost(level), buy: () => levelRune(state, r) });
    }
    const lumo = state.lumi.active;
    const lumoLv = lumo && state.lumi.levels[lumo];
    if (lumo && lumoLv) options.push({ cost: lumoCost(lumoLv), buy: () => levelLumo(state, lumo) });
    const cheapest = options.sort((a, b) => a.cost - b.cost)[0];
    if (!cheapest || cheapest.cost > state.essence || !cheapest.buy()) break;
    bought++;
  }
  autoSocket(state);
  return bought;
}
