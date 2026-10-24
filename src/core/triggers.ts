import { TRIGGER_AFFIXES, type TriggerDef, type TriggerOn } from '../data/items';
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

/** Cura l'eroe; con la regola "overhealShield" l'eccesso diventa scudo (fino alla vita massima). */
export function heal(state: GameState, hero: Stats, amount: number) {
  const missing = hero.maxHp - state.hero.hp;
  state.hero.hp = Math.min(hero.maxHp, state.hero.hp + amount);
  if (hero.rules.has('overhealShield') && amount > missing) {
    state.hero.shield = Math.min(hero.maxHp, state.hero.shield + amount - Math.max(0, missing));
  }
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
  const enemy = state.enemy;
  const mult = enemy ? damageMult(hero, enemy) : 1;
  for (const t of triggers) {
    if (t.def.on !== on) continue;
    if (on === 'everyN' && state.hero.hits % everyN(hero, t.def.n!) !== 0) continue;
    const e = t.def.effect;
    let amount = 0;
    if (e.kind === 'burst' && enemy) {
      amount = t.value * hero.atk * hero.elemMult[e.element] * mult * (hero.rules.has(ECHO_RULES[e.element]) ? 2 : 1);
      enemy.hp -= amount;
    } else if ((e.kind === 'bleed' || e.kind === 'poison') && enemy) {
      amount = t.value * hero.atk * mult;
      enemy[e.kind] += amount;
    } else if (e.kind === 'heal') {
      amount = t.value * hero.maxHp;
      heal(state, hero, amount);
    } else if (e.kind === 'shield') {
      amount = t.value * hero.maxHp;
      state.hero.shield = Math.min(hero.maxHp, state.hero.shield + amount);
    } else if (e.kind === 'haste') {
      const ticks = e.seconds * TICK_RATE;
      const b = hero.rules.has('hasteStacks') ? undefined : state.hero.buffs.find((x) => x.key === t.key);
      if (b) b.ticks = ticks;
      else if (state.hero.buffs.length < MAX_BUFFS) state.hero.buffs.push({ key: t.key, speedPct: t.value, ticks });
      amount = t.value;
    } else continue;
    events.push({ type: 'proc', id: t.def.id, name: t.def.name, amount });
  }
}

/** Ogni tick: scadono i buff. */
export function tickBuffs(state: GameState) {
  if (!state.hero.buffs.length) return;
  for (const b of state.hero.buffs) b.ticks--;
  state.hero.buffs = state.hero.buffs.filter((b) => b.ticks > 0);
}
