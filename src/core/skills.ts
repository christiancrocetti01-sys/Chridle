import {
  HEAL_BELOW, LIGHT_PER_HIT, LIGHT_PER_SECOND, MAX_LIGHT, SHIELD_BELOW, SKILLS, SKILL_LEVEL_BASE, SKILL_LEVEL_BONUS, SKILL_LEVEL_GROWTH,
  skillDef, type SkillDef,
} from '../data/skills';
import { ELEMENTS, type Element } from '../data/items';
import { TICK_RATE } from './loop';
import type { GameState } from './state';
import { MAX_SKILL_CDR, type Stats } from './stats';
import { RUNE_EXECUTE_HP, type RuneId } from '../data/runes';
import { resMult } from './enemies';
import { isDamageSkill, skillRune } from './runes';
import { applyEffect, heal } from './triggers';
import { CORRUPT_HP_PER_LIGHT } from '../data/corruption';
import { perkValue } from './ascension';

export interface SkillState {
  /** Skill sbloccate, nell'ordine di priorità di lancio (sempre quello di SKILLS). */
  slots: (string | null)[];
  /** Livello comprato di ogni skill (assente = 1). */
  levels: Record<string, number>;
  /** Tick di ricarica rimasti per skill. */
  cooldowns: Record<string, number>;
}

export type SkillEvent = { type: 'skill'; id: string; name: string; amount: number };

/** Skill disponibili a questo livello dell'eroe. */
export const unlockedSkills = (level: number) => SKILLS.filter((s) => s.level <= level);

export function newSkills(level = 1): SkillState {
  const s: SkillState = { slots: [], cooldowns: {}, levels: {} };
  unlockSkills(s, level);
  return s;
}

/** Tiene negli slot tutte le skill sbloccate, in ordine di priorità. Restituisce quelle nuove. */
export function unlockSkills(s: SkillState, level: number): string[] {
  const ids = unlockedSkills(level).map((d) => d.id);
  const added = ids.filter((id) => !s.slots.includes(id));
  s.slots = ids;
  for (const id of ids) s.cooldowns[id] ??= 0;
  return added;
}

/** Livello effettivo: quello comprato più i livelli gratuiti dell'Ascensione. */
export const skillLevel = (state: GameState, id: string) =>
  (state.skills.levels[id] ?? 1) + (state.ascension ? perkValue(state.ascension, 'slot') : 0);
/** Essenza per passare dal livello comprato `level` al successivo. */
export const skillLevelCost = (level: number) => Math.ceil(SKILL_LEVEL_BASE * Math.pow(SKILL_LEVEL_GROWTH, level - 1));

export function levelSkill(state: GameState, id: string): boolean {
  const level = state.skills.levels[id] ?? 1;
  if (!state.skills.slots.includes(id) || state.essence < skillLevelCost(level)) return false;
  state.essence -= skillLevelCost(level);
  state.skills.levels[id] = level + 1;
  return true;
}

/** Elemento a cui il nemico è più debole, tenendo conto dei bonus elementali dell'eroe. */
export function bestElement(state: GameState, hero: Stats): Element {
  let best: Element = 'holy';
  let value = 0;
  for (const e of ELEMENTS) {
    const v = hero.elemMult[e] * resMult(state.enemy, e);
    if (v > value + 1e-9) { value = v; best = e; }
  }
  return best;
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

/** Sinergie per tag: i bonus degli oggetti per ogni tag della skill si sommano. */
export const tagPower = (hero: Stats, def: SkillDef) => def.tags.reduce((sum, t) => sum + hero.skillPower[t], 0);
export const tagCdr = (hero: Stats, def: SkillDef) => Math.min(MAX_SKILL_CDR, def.tags.reduce((sum, t) => sum + hero.skillCdr[t], 0));

/** Valore dell'effetto con la runa Potenza e le sinergie per tag (senza i bonus a condizione: Ombra, Esecuzione). */
export const skillValue = (state: GameState, hero: Stats, def: SkillDef) =>
  def.effect.value * (1 + SKILL_LEVEL_BONUS * (skillLevel(state, def.id) - 1)) * (1 + skillRune(state, def.id, 'potenza')) * (1 + tagPower(hero, def));

/** Costo in Luce e ricarica (in tick) con la riduzione ricarica per tag e "freeSkills". */
export const lightCost = (hero: Stats, def: SkillDef) => (hero.rules.has('freeSkills') || paidInBlood(hero, def) ? 0 : def.light);
/** Corrotto: le skill di danno si pagano con la vita invece che con la Luce. */
const paidInBlood = (hero: Stats, def: SkillDef) => hero.rules.has('corruptShadow') && isDamageSkill(def);
export const cooldownTicks = (hero: Stats, def: SkillDef) =>
  Math.round(def.cooldown * TICK_RATE * (1 - tagCdr(hero, def))
    * (hero.rules.has('freeSkills') ? FREE_SKILLS_CD : 1));

/** Chiave di volta "freeSkills": moltiplicatore della ricarica. */
export const FREE_SKILLS_CD = 2;

export const canCast = (state: GameState, hero: Stats, id: string) => {
  const def = skillDef(id);
  return !!def && (state.skills.cooldowns[id] ?? 0) <= 0 && state.hero.light >= lightCost(hero, def) && state.hero.level >= def.level;
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
  let value = skillValue(state, hero, def);
  if (effect.kind === 'burst' && enemy) effect = { ...effect, element: bestElement(state, hero) };
  if (damage && enemy && enemy.hp < enemy.maxHp * RUNE_EXECUTE_HP) value *= 1 + r('esecuzione');
  if (!damage) value *= 1 + r('custodia');
  if (damage && enemy && (enemy.bleed > 0 || enemy.poison > 0)) value *= 1 + r('feritaAperta');
  if (damage) value *= 1 + r('pazienza') * def.cooldown;
  const lasting = 1 + r('persistenza');
  if (effect.kind === 'haste') effect = { ...effect, seconds: effect.seconds * lasting };
  const amount = applyEffect(state, hero, effect, value, `skill:${def.id}`);
  if (amount === null) return null;
  if (r('purificazione')) heal(state, hero, (hero.maxHp - state.hero.hp) * r('purificazione'));
  if (r('bastione')) state.hero.shield = Math.min(hero.maxHp, state.hero.shield + hero.maxHp * r('bastione'));
  return amount;
}

/** Lancia una skill (senza controllare ricarica e Luce: lo fa chi chiama). */
function castSkill(state: GameState, hero: Stats, def: SkillDef, events: { push(e: SkillEvent): void }): boolean {
  if (!worthCasting(state, hero, def)) return false;
  const amount = perform(state, hero, def);
  if (amount === null) return false;
  if (paidInBlood(hero, def) && !hero.rules.has('freeSkills')) {
    state.hero.hp = Math.max(1, state.hero.hp - def.light * CORRUPT_HP_PER_LIGHT * hero.maxHp);
  }
  state.hero.light -= lightCost(hero, def);
  state.skills.cooldowns[def.id] = cooldownTicks(hero, def);
  events.push({ type: 'skill', id: def.id, name: def.name, amount });
  return true;
}

/** Lancia la prima skill pronta in ordine di slot (al massimo una per tick). */
export function castSkills(state: GameState, hero: Stats, events: { push(e: SkillEvent): void }) {
  if (!state.enemy) return;
  for (const id of state.skills.slots) {
    if (id && canCast(state, hero, id) && castSkill(state, hero, skillDef(id)!, events)) return;
  }
}

