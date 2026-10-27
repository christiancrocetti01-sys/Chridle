import { RUNE_SOCKETS, type RuneId } from '../data/runes';
import { levelCost, unlockCost, unlockRune, levelRune } from './runes';
import { levelSkill, skillLevelCost } from './skills';
import { levelLumo, lumoCost } from './lumi';
import { LUMO_IDLE_SHARE, type LumoId } from '../data/lumi';
import type { ViaId } from '../data/vie';
import { buyPerk, perkCost, perkLevel } from './ascension';
import { buyUpgrade, upgradePrice } from './combat';
import { autoCraft } from './craft';
import { gearPower } from './autoequip';
import { canTake, pointsLeft } from './constellations';
import { START_ID, STARS, STAR_BY_ID, type StarNode } from '../data/constellations';
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
export const VIA_LUMO: Record<ViaId, LumoId> = { paladino: 'aureola', lama: 'ombretta', inquisitore: 'fiammella', custode: 'scintilla', eclissiarca: 'mezzaluna' };

/** Attiva il Lumo preferito della Via; se non c'è (o manca la Via), quello di livello più alto. */
export function autoLumo(state: GameState) {
  const lv = state.lumi.levels;
  const owned = (Object.keys(lv) as LumoId[]).sort((a, b) => lv[b]! - lv[a]!);
  if (!owned.length) return;
  const fav = state.vie.main && VIA_LUMO[state.vie.main];
  state.lumi.active = fav && lv[fav] ? fav : owned[0];
}

/** `weight` (se c'è) è il costo usato nel confronto al posto di `cost`. */
type Buy = { cost: number; weight?: number; buy: () => boolean };

/**
 * Spende l'Essenza: compra sempre la cosa più economica tra livelli delle skill, rune nuove, livelli delle rune e dei Lumi.
 * I Lumi non attivi danno solo `LUMO_IDLE_SHARE` del bonus: nel confronto il loro costo si divide per quella parte.
 */
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
    for (const [id, lv] of Object.entries(state.lumi.levels) as [LumoId, number][]) {
      const price = lumoCost(lv);
      options.push({ cost: price, weight: id === state.lumi.active ? price : price / LUMO_IDLE_SHARE, buy: () => levelLumo(state, id) });
    }
    const cheapest = options.sort((a, b) => (a.weight ?? a.cost) - (b.weight ?? b.cost))[0];
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

/** Paragon senza Via: i punti vanno a giro in quest'ordine (attacco e vita, ogni tanto danno critico e difesa). */
export const PARAGON_ORDER: ParagonId[] = ['forza', 'vigore', 'forza', 'precisione', 'vigore', 'tempra'];

/** Ordine del Paragon per Via: tutti e 8 i bonus, con quelli della Via più spesso. */
export const VIA_PARAGON: Record<ViaId, ParagonId[]> = {
  paladino: ['forza', 'vigore', 'tempra', 'forza', 'vigore', 'precisione', 'tempra', 'celerita', 'elementi', 'ricchezza', 'fortuna'],
  lama: ['forza', 'precisione', 'celerita', 'forza', 'vigore', 'precisione', 'tempra', 'celerita', 'elementi', 'ricchezza', 'fortuna'],
  inquisitore: ['elementi', 'forza', 'vigore', 'elementi', 'precisione', 'tempra', 'elementi', 'celerita', 'vigore', 'ricchezza', 'fortuna'],
  custode: ['elementi', 'vigore', 'forza', 'elementi', 'tempra', 'precisione', 'elementi', 'celerita', 'vigore', 'ricchezza', 'fortuna'],
  eclissiarca: ['forza', 'precisione', 'vigore', 'forza', 'elementi', 'celerita', 'precisione', 'tempra', 'forza', 'ricchezza', 'fortuna'],
};

export function autoParagon(state: GameState) {
  const p = state.paragon;
  const order = (state.vie.main && VIA_PARAGON[state.vie.main]) || PARAGON_ORDER;
  while (paragonFree(p) > 0) spendParagon(state, order[(p.level - paragonFree(p)) % order.length]);
}

/** Ascensione: come per l'oro, si compra sempre il potenziamento più economico. */
const maxed = (state: GameState, id: PerkId) => {
  const max = PERKS.find((d) => d.id === id)!.max;
  return max !== undefined && perkLevel(state.ascension, id) >= max;
};

export function autoPerks(state: GameState): number {
  let bought = 0;
  for (let n = 0; n < 1000; n++) {
    const id = PERKS.map((d) => d.id).filter((x) => !maxed(state, x))
      .sort((a, b) => perkCost(state.ascension, a) - perkCost(state.ascension, b))[0];
    if (!id || !buyPerk(state, id)) break;
    bought++;
  }
  return bought;
}

/** Regole che si annullano a vicenda (in entrambi i sensi): una stella con una di queste si prende solo per ultima. */
const CLASH_PAIRS: [RuleId, RuleId[]][] = [
  ['noCrit', ['critBleed', 'dodgeCrit', 'chainLightning', 'armorBreak']],
  ['eclipse', ['overhealShield', 'overhealHoly', 'soulHarvest', 'lightVampire', 'lastPrayer']],
  ['livingFortress', ['dodgeCrit', 'riposte']],
];
const CLASH: Partial<Record<RuleId, RuleId[]>> = {};
for (const [a, list] of CLASH_PAIRS) {
  for (const b of list) {
    (CLASH[a] ??= []).push(b);
    (CLASH[b] ??= []).push(a);
  }
}

/**
 * Peso di una stella nel confronto: le regole non entrano in `gearPower`. Le notevoli con regola valgono come +6% di
 * potenza (si va a cercarle); le chiavi di volta (spesso con un costo) si prendono solo se non c'è di meglio, tranne quella della propria Via.
 */
function starWeight(state: GameState, n: StarNode, rules: Set<RuleId>): number {
  if (n.rule && CLASH[n.rule]?.some((r) => rules.has(r))) return 0.5; // regola annullata da una già attiva: solo per ultima
  if (n.kind === 'keystone') return n.id === `${state.vie.main}-k` ? 1.06 : 0.98;
  return n.kind === 'notable' && n.rule ? 1.06 : 1;
}

/** Fin dove si guarda avanti per raggiungere una notevole o una chiave di volta. */
export const STAR_LOOKAHEAD = 6; // dalla spina alla notevole di un ammasso: 4 stelle dell'anello + la notevole

/**
 * Stelle: finché ci sono punti, sceglie il percorso (una stella collegata, o la strada fino a una notevole o chiave di
 * volta entro `STAR_LOOKAHEAD` passi) che alza di più la potenza per punto speso, e ne prende la prima stella.
 */
export function autoStars(state: GameState): number {
  let taken = 0;
  while (pointsLeft(state) > 0) {
    const rules = stateStats(state).rules;
    const base = gearPower(state);
    const tree = new Set(state.stars);
    // ricerca in ampiezza tra le stelle libere a partire da quelle collegate all'albero
    const parent = new Map<string, string | null>();
    let ring = STARS.filter((n) => canTake(state, n.id)).map((n) => n.id);
    for (const id of ring) parent.set(id, null);
    for (let d = 1; d < STAR_LOOKAHEAD; d++) {
      const next: string[] = [];
      for (const id of ring) {
        for (const l of STAR_BY_ID.get(id)!.links) {
          if (l === START_ID || tree.has(l) || parent.has(l)) continue;
          parent.set(l, id);
          next.push(l);
        }
      }
      ring = next;
    }
    let best: string | null = null;
    let bestScore = -Infinity;
    for (const [id, from] of parent) {
      const n = STAR_BY_ID.get(id)!;
      if (from !== null && n.kind === 'small') continue;
      const path = [id];
      for (let p = from; p !== null; p = parent.get(p)!) path.unshift(p);
      state.stars.push(...path);
      const score = (gearPower(state) * starWeight(state, n, rules) / base - 1) / path.length;
      state.stars.length -= path.length;
      if (score > bestScore) { bestScore = score; best = path[0]; }
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
