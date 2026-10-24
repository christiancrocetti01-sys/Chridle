import { TRIGGER_AFFIXES, type TriggerDef, type TriggerEffect, type TriggerOn } from '../data/items';
import { ECHO_RULES, SETS } from '../data/uniques';
import { TICK_RATE } from './loop';
import { setCounts, type GearState } from './items';
import type { EnemyState, GameState } from './state';
import type { Stats } from './stats';

export interface ActiveTrigger {
  /** Oggetto + affisso: identifica il buff da rinnovare. */
  key: string;
  def: TriggerDef;
  /** Valore effettivo (base × tier). */
  value: number;
}

export type ProcEvent = { type: 'proc'; id: string; name: string; amount: number };

/** Effetti a scatto dell'equipaggiamento indossato. */
export function gearTriggers(gear: GearState): ActiveTrigger[] {
  const out: ActiveTrigger[] = [];
  for (const it of Object.values(gear.equipped)) {
    if (!it) continue;
    it.affixes.forEach((a, i) => {
      const def = a.power ? TRIGGER_AFFIXES.find((t) => t.id === a.id) : undefined;
      if (def) out.push({ key: `${it.uid}:${i}`, def, value: def.effect.value * a.power! });
    });
  }
  // bonus a 4 pezzi dei set
  const counts = setCounts(Object.values(gear.equipped));
  for (const set of SETS) {
    if ((counts[set.id] ?? 0) < 4) continue;
    const def: TriggerDef = { ...set.bonus4, id: `set:${set.id}`, name: `del set ${set.name}`, tags: set.tags, types: [] };
    out.push({ key: def.id, def, value: def.effect.value });
  }
  return out;
}

export const EXECUTE_HP = 0.25;
/** Limite dei buff attivi insieme (con "hasteStacks" si accumulano). */
export const MAX_BUFFS = 20;

/** Moltiplicatore del danno inflitto al nemico: boss e regola "execute". */
export function damageMult(hero: Stats, enemy: EnemyState): number {
  const execute = hero.rules.has('execute') && enemy.hp < enemy.maxHp * EXECUTE_HP ? 2 : 1;
  return (enemy.boss ? hero.bossMult : 1) * execute;
}

/**
 * Cura l'eroe. L'eccesso: con "overhealHoly" diventa danno sacro al nemico, altrimenti con "overhealShield"
 * diventa scudo (fino alla vita massima).
 */
export function heal(state: GameState, hero: Stats, amount: number) {
  const missing = hero.maxHp - state.hero.hp;
  state.hero.hp = Math.min(hero.maxHp, state.hero.hp + amount);
  if (amount <= missing) return;
  const excess = amount - Math.max(0, missing);
  if (hero.rules.has('overhealHoly') && state.enemy) state.enemy.hp -= excess * hero.elemMult.holy * damageMult(hero, state.enemy);
  else if (hero.rules.has('overhealShield')) state.hero.shield = Math.min(hero.maxHp, state.hero.shield + excess);
}

/** Ogni quanti colpi scatta un effetto "ogni N colpi". */
export function everyN(hero: Stats, n: number): number {
  return hero.rules.has('quickTriggers') ? Math.max(2, n - 1) : n;
}

/**
 * Applica tutti gli effetti che scattano con l'evento `on`. Effetti uguali su più oggetti si sommano.
 * Il danno va al nemico corrente (se c'è): chi chiama controlla se è morto.
 */
export function fireTriggers(state: GameState, hero: Stats, triggers: ActiveTrigger[], on: TriggerOn, events: { push(e: ProcEvent): void }) {
  for (const t of triggers) {
    if (t.def.on !== on) continue;
    if (on === 'everyN' && state.hero.hits % everyN(hero, t.def.n!) !== 0) continue;
    const amount = applyEffect(state, hero, t.def.effect, t.value, t.key);
    if (amount !== null) events.push({ type: 'proc', id: t.def.id, name: t.def.name, amount });
  }
}

/**
 * Applica un effetto (di un trigger o di una skill) con il suo valore. `key` identifica il buff di velocità
 * da rinnovare. Restituisce il danno/cura/scudo/velocità, o null se non c'è un nemico da colpire.
 */
export function applyEffect(state: GameState, hero: Stats, e: TriggerEffect, value: number, key: string): number | null {
  const enemy = state.enemy;
  const mult = enemy ? damageMult(hero, enemy) : 1;
  if (e.kind === 'burst') {
    if (!enemy) return null;
    const amount = value * hero.atk * hero.elemMult[e.element] * mult * (hero.rules.has(ECHO_RULES[e.element]) ? 2 : 1);
    enemy.hp -= amount;
    return amount;
  }
  if (e.kind === 'bleed' || e.kind === 'poison') {
    if (!enemy) return null;
    const amount = value * hero.atk * mult;
    enemy[e.kind] += amount;
    return amount;
  }
  if (e.kind === 'heal') {
    heal(state, hero, value * hero.maxHp);
    return value * hero.maxHp;
  }
  if (e.kind === 'shield') {
    state.hero.shield = Math.min(hero.maxHp, state.hero.shield + value * hero.maxHp);
    return value * hero.maxHp;
  }
  if (e.kind !== 'haste') return null;
  const ticks = e.seconds * TICK_RATE;
  const b = hero.rules.has('hasteStacks') ? undefined : state.hero.buffs.find((x) => x.key === key);
  if (b) b.ticks = ticks;
  else if (state.hero.buffs.length < MAX_BUFFS) state.hero.buffs.push({ key, speedPct: value, ticks });
  return value;
}

/** Ogni tick: scadono i buff. */
export function tickBuffs(state: GameState) {
  if (!state.hero.buffs.length) return;
  for (const b of state.hero.buffs) b.ticks--;
  state.hero.buffs = state.hero.buffs.filter((b) => b.ticks > 0);
}
