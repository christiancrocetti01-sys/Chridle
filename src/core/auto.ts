import { RUNE_SOCKETS, type RuneId } from '../data/runes';
import { levelCost, unlockCost, unlockRune, levelRune } from './runes';
import { levelSkill, skillLevelCost } from './skills';
import { levelLumo, lumoCost } from './lumi';
import type { LumoId } from '../data/lumi';
import type { ViaId } from '../data/vie';
import { buyPerk, perkCost, perkLevel } from './ascension';
import { buyUpgrade, upgradePrice } from './combat';
import { autoCraft } from './craft';
import { gearPower } from './autoequip';
import { canTake, pointsLeft } from './constellations';
import { STARS, type StarNode } from '../data/constellations';
import type { RuleId } from '../data/uniques';
import { stateStats } from './stats';
import { paragonFree, spendParagon } from './endgame';
import { PERKS, type PerkId } from '../data/ascension';
import type { ParagonId } from '../data/endgame';
import { UPGRADES } from '../data/upgrades';
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

/** Lumo preferito di ogni Via. */
export const VIA_LUMO: Record<ViaId, LumoId> = { paladino: 'aureola', lama: 'ombretta', inquisitore: 'fiammella', custode: 'scintilla', eclissiarca: 'ombretta' };

/** Attiva il Lumo preferito della Via; se non c'è (o manca la Via), quello di livello più alto. */
export function autoLumo(state: GameState) {
  const lv = state.lumi.levels;
  const owned = (Object.keys(lv) as LumoId[]).sort((a, b) => lv[b]! - lv[a]!);
  if (!owned.length) return;
  const fav = state.vie.main && VIA_LUMO[state.vie.main];
  state.lumi.active = fav && lv[fav] ? fav : owned[0];
}

type Buy = { cost: number; buy: () => boolean };

/** Spende l'Essenza: compra sempre la cosa più economica tra livelli delle skill, rune nuove, livelli delle rune e del Lumo attivo. */
export function autoEssence(state: GameState): number {
  autoLumo(state);
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

/** Oro: compra sempre il Potenziamento più economico. */
export function autoGold(state: GameState): number {
  let bought = 0;
  for (let n = 0; n < 1000; n++) {
    const cheapest = UPGRADES.map((u) => u.id).sort((a, b) => upgradePrice(state, a) - upgradePrice(state, b))[0];
    if (!buyUpgrade(state, cheapest)) break;
    bought++;
  }
  return bought;
}

/** Paragon: i punti vanno a giro in quest'ordine (attacco e vita, ogni tanto danno critico e difesa). */
export const PARAGON_ORDER: ParagonId[] = ['forza', 'vigore', 'forza', 'precisione', 'vigore', 'tempra'];

export function autoParagon(state: GameState) {
  const p = state.paragon;
  while (paragonFree(p) > 0) spendParagon(state, PARAGON_ORDER[(p.level - paragonFree(p)) % PARAGON_ORDER.length]);
}

/** Ascensione: prima si mettono da parte le Scintille per questi, nell'ordine (pochi e subito utili). */
export const PERK_FIRST: PerkId[] = ['secondaVia'];
/** Poi si compra sempre il più economico; il costo di questi conta diviso per il peso (si prendono prima, senza bloccare gli altri). */
export const PERK_WEIGHT: Partial<Record<PerkId, number>> = { slot: 3 };

const maxed = (state: GameState, id: PerkId) => {
  const max = PERKS.find((d) => d.id === id)!.max;
  return max !== undefined && perkLevel(state.ascension, id) >= max;
};

export function autoPerks(state: GameState): number {
  let bought = 0;
  const weighted = (id: PerkId) => perkCost(state.ascension, id) / (PERK_WEIGHT[id] ?? 1);
  for (let n = 0; n < 1000; n++) {
    const first = PERK_FIRST.find((id) => !maxed(state, id));
    const id = first ?? PERKS.map((d) => d.id).filter((x) => !maxed(state, x)).sort((a, b) => weighted(a) - weighted(b))[0];
    if (!id || !buyPerk(state, id)) break;
    bought++;
  }
  return bought;
}

/** Regole che si annullano a vicenda (in entrambi i sensi): una stella con una di queste si prende solo per ultima. */
const CLASH_PAIRS: [RuleId, RuleId[]][] = [
  ['noCrit', ['critBleed', 'dodgeCrit', 'chainLightning']],
  ['eclipse', ['overhealShield', 'overhealHoly', 'soulHarvest']],
];
const CLASH: Partial<Record<RuleId, RuleId[]>> = {};
for (const [a, list] of CLASH_PAIRS) {
  for (const b of list) {
    (CLASH[a] ??= []).push(b);
    (CLASH[b] ??= []).push(a);
  }
}

/**
 * Peso di una stella nel confronto: le regole non entrano in `gearPower`. Le notevoli con regola hanno un piccolo
 * vantaggio; le chiavi di volta (spesso con un costo) si prendono solo se non c'è di meglio, tranne quella della propria Via.
 */
function starWeight(state: GameState, n: StarNode, rules: Set<RuleId>): number {
  if (n.rule && CLASH[n.rule]?.some((r) => rules.has(r))) return 0.5; // regola annullata da una già attiva: solo per ultima
  if (n.kind === 'keystone') return n.id === `${state.vie.main}-k` ? 1.02 : 0.98;
  return n.kind === 'notable' && n.rule ? 1.02 : 1;
}

/** Stelle: finché ci sono punti, prende tra le stelle collegate quella che alza di più la potenza. */
export function autoStars(state: GameState): number {
  let taken = 0;
  while (pointsLeft(state) > 0) {
    const rules = stateStats(state).rules;
    let best: string | null = null;
    let bestScore = -1;
    for (const n of STARS) {
      if (!canTake(state, n.id)) continue;
      state.stars.push(n.id);
      const score = gearPower(state) * starWeight(state, n, rules);
      state.stars.pop();
      if (score > bestScore) { bestScore = score; best = n.id; }
    }
    if (!best) break;
    state.stars.push(best);
    taken++;
  }
  return taken;
}

/** Tutte le spese automatiche (ogni secondo in `step` e a fine offline). */
export function autoSpend(state: GameState) {
  autoStars(state);
  autoEssence(state);
  autoGold(state);
  autoCraft(state);
  autoParagon(state);
  autoPerks(state);
}
