import { HEAL_BELOW, LIGHT_PER_HIT, LIGHT_PER_SECOND, MAX_LIGHT, SHIELD_BELOW, SKILLS, SKILL_SLOTS, skillDef, type SkillDef } from '../data/skills';
import { TICK_RATE } from './loop';
import type { GameState } from './state';
import type { Stats } from './stats';
import { RUNE_EXECUTE_HP, RUNE_HASTE_SECONDS, RUNE_SHADOW_HP_COST, reduction, type RuneId } from '../data/runes';
import { nextRandom } from './rng';
import { isDamageSkill, skillRune } from './runes';
import { applyEffect, heal } from './triggers';

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

export function gainLight(state: GameState, amount = LIGHT_PER_HIT) {
  state.hero.light = Math.min(MAX_LIGHT, state.hero.light + amount);
}

/** Ogni tick: scendono le ricariche e, se c'è un nemico, sale la Luce. */
export function tickSkills(state: GameState) {
  if (state.enemy) gainLight(state, LIGHT_PER_SECOND / TICK_RATE);
  const cd = state.skills.cooldowns;
  for (const id in cd) if (cd[id] > 0) cd[id]--;
}

/** Costo in Luce e ricarica (in tick) con le rune Parsimonia e Rapidità. */
export const lightCost = (state: GameState, def: SkillDef) => def.light * (1 - reduction(skillRune(state, def.id, 'parsimonia')));
export const cooldownTicks = (state: GameState, def: SkillDef) =>
  Math.round(def.cooldown * TICK_RATE * (1 - reduction(skillRune(state, def.id, 'rapidita'))));

export const canCast = (state: GameState, id: string) => {
  const def = skillDef(id);
  return !!def && state.skills.cooldowns[id] <= 0 && state.hero.light >= lightCost(state, def) && state.hero.level >= def.level;
};

/** Soglie automatiche: niente cura a vita alta, niente scudo se c'è già, niente velocità se è ancora attiva. */
export function worthCasting(state: GameState, hero: Stats, def: SkillDef): boolean {
  const e = def.effect;
  if (e.kind === 'heal') return state.hero.hp < hero.maxHp * HEAL_BELOW;
  if (e.kind === 'shield') return state.hero.shield < hero.maxHp * SHIELD_BELOW;
  if (e.kind === 'haste') return !state.hero.buffs.some((b) => b.key === `skill:${def.id}`);
  return true;
}

/** Effetto della skill con le sue rune. Restituisce il valore principale, o null se non ha bersaglio. */
function perform(state: GameState, hero: Stats, def: SkillDef): number | null {
  const r = (id: RuneId) => skillRune(state, def.id, id);
  const enemy = state.enemy;
  const damage = isDamageSkill(def);
  let effect = def.effect;
  let value = effect.value * (1 + r('potenza'));
  if (damage && r('ombra')) {
    if (effect.kind === 'burst') effect = { ...effect, element: 'shadow' };
    value *= 1 + r('ombra');
    state.hero.hp = Math.max(1, state.hero.hp - hero.maxHp * RUNE_SHADOW_HP_COST);
  }
  if (damage && enemy && enemy.hp < enemy.maxHp * RUNE_EXECUTE_HP) value *= 1 + r('esecuzione');
  const amount = applyEffect(state, hero, effect, value, `skill:${def.id}`);
  if (amount === null) return null;
  if (damage && enemy) {
    enemy.poison += amount * r('brace');
    enemy.bleed += amount * r('lacerazione');
    if (r('sete')) heal(state, hero, amount * r('sete'));
  }
  if (r('bastione')) state.hero.shield = Math.min(hero.maxHp, state.hero.shield + hero.maxHp * r('bastione'));
  if (r('fervore')) {
    const haste = { kind: 'haste' as const, value: r('fervore'), seconds: RUNE_HASTE_SECONDS };
    applyEffect(state, hero, haste, haste.value, `rune:fervore:${def.id}`);
  }
  return amount;
}

/** Lancia una skill (senza controllare ricarica e Luce: lo fa chi chiama). `free` = non consuma Luce. */
function castSkill(state: GameState, hero: Stats, def: SkillDef, events: { push(e: SkillEvent): void }, free = false): boolean {
  if (!worthCasting(state, hero, def)) return false;
  const amount = perform(state, hero, def);
  if (amount === null) return false;
  if (!free) state.hero.light -= lightCost(state, def);
  state.skills.cooldowns[def.id] = cooldownTicks(state, def);
  events.push({ type: 'skill', id: def.id, name: def.name, amount });
  // si tira l'Eco solo se la runa c'è: senza, la sequenza dell'RNG non cambia
  const eco = skillRune(state, def.id, 'eco');
  if (eco && nextRandom(state) < Math.min(1, eco)) {
    const again = perform(state, hero, def);
    if (again !== null) events.push({ type: 'skill', id: def.id, name: def.name, amount: again });
  }
  return true;
}

/** Lancia la prima skill pronta in ordine di slot (al massimo una per tick). */
export function castSkills(state: GameState, hero: Stats, events: { push(e: SkillEvent): void }) {
  if (!state.enemy) return;
  for (const id of state.skills.slots) {
    if (id && canCast(state, id) && castSkill(state, hero, skillDef(id)!, events)) return;
  }
}

/** Runa Scintilla: al critico le skill negli slot con la ricarica finita possono lanciarsi gratis. */
export function castOnCrit(state: GameState, hero: Stats, events: { push(e: SkillEvent): void }) {
  if (!state.enemy) return;
  for (const id of state.skills.slots) {
    const chance = id ? skillRune(state, id, 'scintilla') : 0;
    if (!chance || state.skills.cooldowns[id!] > 0) continue;
    if (nextRandom(state) < Math.min(1, chance)) castSkill(state, hero, skillDef(id!)!, events, true);
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
