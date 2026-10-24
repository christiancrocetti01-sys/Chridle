import { LIGHT_PER_HIT, MAX_LIGHT, SKILLS, SKILL_SLOTS, skillDef } from '../data/skills';
import { TICK_RATE } from './loop';
import type { GameState } from './state';
import type { Stats } from './stats';
import { applyEffect } from './triggers';

export interface SkillState {
  /** Skill negli slot (null = vuoto); l'ordine è la priorità di lancio. */
  slots: (string | null)[];
  /** Tick di ricarica rimasti per skill. */
  cooldowns: Record<string, number>;
}

export type SkillEvent = { type: 'skill'; id: string; name: string; amount: number };

export const unlockedSkills = (level: number) => SKILLS.filter((s) => s.level <= level);

/** Skill iniziali per un eroe di questo livello: le prime sbloccate negli slot. */
export function newSkills(level = 1): SkillState {
  const s: SkillState = { slots: Array(SKILL_SLOTS).fill(null), cooldowns: {} };
  unlockSkills(s, level);
  return s;
}

/** Mette le skill appena sbloccate nei primi slot liberi. Restituisce quelle nuove. */
export function unlockSkills(s: SkillState, level: number): string[] {
  const added: string[] = [];
  for (const def of unlockedSkills(level)) {
    if (s.slots.includes(def.id) || def.id in s.cooldowns) continue;
    const free = s.slots.indexOf(null);
    s.cooldowns[def.id] = 0; // segna la skill come già vista: toglierla da uno slot non la rimette da sola
    if (free < 0) continue;
    s.slots[free] = def.id;
    added.push(def.id);
  }
  return added;
}

export function gainLight(state: GameState) {
  state.hero.light = Math.min(MAX_LIGHT, state.hero.light + LIGHT_PER_HIT);
}

/** Ogni tick: scendono le ricariche. */
export function tickCooldowns(state: GameState) {
  const cd = state.skills.cooldowns;
  for (const id in cd) if (cd[id] > 0) cd[id]--;
}

export const canCast = (state: GameState, id: string) => {
  const def = skillDef(id);
  return !!def && state.skills.cooldowns[id] <= 0 && state.hero.light >= def.light && state.hero.level >= def.level;
};

/** Lancia la prima skill pronta in ordine di slot (al massimo una per tick). */
export function castSkills(state: GameState, hero: Stats, events: { push(e: SkillEvent): void }) {
  if (!state.enemy) return;
  for (const id of state.skills.slots) {
    if (!id || !canCast(state, id)) continue;
    const def = skillDef(id)!;
    const amount = applyEffect(state, hero, def.effect, def.effect.value, `skill:${id}`);
    if (amount === null) continue;
    state.hero.light -= def.light;
    state.skills.cooldowns[id] = Math.round(def.cooldown * TICK_RATE);
    events.push({ type: 'skill', id, name: def.name, amount });
    return;
  }
}

/** Mette una skill sbloccata in uno slot (se era già in un altro, i due si scambiano). */
export function setSlot(state: GameState, slot: number, id: string | null): boolean {
  const s = state.skills;
  if (slot < 0 || slot >= s.slots.length) return false;
  if (id !== null && !unlockedSkills(state.hero.level).some((d) => d.id === id)) return false;
  const from = id === null ? -1 : s.slots.indexOf(id);
  if (from >= 0) s.slots[from] = s.slots[slot];
  s.slots[slot] = id;
  if (id !== null) s.cooldowns[id] ??= 0;
  return true;
}

/** Sposta la skill dello slot `slot` di una posizione (−1 su, +1 giù) nella priorità. */
export function moveSlot(state: GameState, slot: number, dir: -1 | 1): boolean {
  const s = state.skills.slots;
  const to = slot + dir;
  if (to < 0 || to >= s.length) return false;
  [s[slot], s[to]] = [s[to], s[slot]];
  return true;
}
