import { TRIGGER_AFFIXES, type TriggerDef, type TriggerOn } from '../data/items';
import { TICK_RATE } from './loop';
import type { GearState } from './items';
import type { GameState } from './state';
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
  return out;
}

/**
 * Applica tutti gli effetti che scattano con l'evento `on`. Effetti uguali su più oggetti si sommano.
 * Il danno va al nemico corrente (se c'è): chi chiama controlla se è morto.
 */
export function fireTriggers(state: GameState, hero: Stats, triggers: ActiveTrigger[], on: TriggerOn, events: { push(e: ProcEvent): void }) {
  const enemy = state.enemy;
  const bossMult = enemy?.boss ? hero.bossMult : 1;
  for (const t of triggers) {
    if (t.def.on !== on) continue;
    if (on === 'everyN' && state.hero.hits % t.def.n! !== 0) continue;
    const e = t.def.effect;
    let amount = 0;
    if (e.kind === 'burst' && enemy) {
      amount = t.value * hero.atk * hero.elemMult[e.element] * bossMult;
      enemy.hp -= amount;
    } else if ((e.kind === 'bleed' || e.kind === 'poison') && enemy) {
      amount = t.value * hero.atk * bossMult;
      enemy[e.kind] += amount;
    } else if (e.kind === 'heal') {
      amount = t.value * hero.maxHp;
      state.hero.hp = Math.min(hero.maxHp, state.hero.hp + amount);
    } else if (e.kind === 'shield') {
      amount = t.value * hero.maxHp;
      state.hero.shield = Math.min(hero.maxHp, state.hero.shield + amount);
    } else if (e.kind === 'haste') {
      const ticks = e.seconds * TICK_RATE;
      const b = state.hero.buffs.find((x) => x.key === t.key);
      if (b) b.ticks = ticks;
      else state.hero.buffs.push({ key: t.key, speedPct: t.value, ticks });
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
