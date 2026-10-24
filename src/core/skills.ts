import { HEAL_BELOW, LIGHT_PER_HIT, LIGHT_PER_SECOND, MAX_LIGHT, SHIELD_BELOW, SKILLS, SKILL_SLOTS, skillDef, type SkillDef } from '../data/skills';
import { TICK_RATE } from './loop';
import type { GameState } from './state';
import { MAX_SKILL_CDR, type Stats } from './stats';
import {
  RUNE_BUFF_SECONDS, RUNE_DESPAIR_HP, RUNE_EXECUTE_HP, RUNE_HASTE_SECONDS, RUNE_OPENING_HP, RUNE_SHADOW_HP_COST, RUNE_SUPERNOVA_MULT,
  reduction, type RuneId,
} from '../data/runes';
import { resMult } from './enemies';
import { nextRandom } from './rng';
import { isDamageSkill, skillRune } from './runes';
import { MAX_BUFFS, applyEffect, heal } from './triggers';
import { activeVie } from './vie';

export interface SkillState {
  /** Skill negli slot (null = vuoto); l'ordine è la priorità di lancio. */
  slots: (string | null)[];
  /** Tick di ricarica rimasti per skill. */
  cooldowns: Record<string, number>;
}

export type SkillEvent = { type: 'skill'; id: string; name: string; amount: number };

/** Skill disponibili a questo livello: quelle delle Vie solo con la Via attiva. */
export const unlockedSkills = (level: number, vie: readonly string[] = []) =>
  SKILLS.filter((s) => s.level <= level && (!s.via || vie.includes(s.via)));

/** Skill iniziali per un eroe di questo livello: le prime sbloccate negli slot. */
export function newSkills(level = 1): SkillState {
  const s: SkillState = { slots: Array(SKILL_SLOTS).fill(null), cooldowns: {} };
  unlockSkills(s, level);
  return s;
}

/** Mette le skill appena sbloccate nei primi slot liberi. Restituisce quelle nuove. */
export function unlockSkills(s: SkillState, level: number, vie: readonly string[] = []): string[] {
  const added: string[] = [];
  for (const def of unlockedSkills(level, vie)) {
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

/** Sinergie per tag: i bonus degli oggetti per ogni tag della skill si sommano. */
export const tagPower = (hero: Stats, def: SkillDef) => def.tags.reduce((sum, t) => sum + hero.skillPower[t], 0);
export const tagCdr = (hero: Stats, def: SkillDef) => Math.min(MAX_SKILL_CDR, def.tags.reduce((sum, t) => sum + hero.skillCdr[t], 0));

/** Valore dell'effetto con la runa Potenza e le sinergie per tag (senza i bonus a condizione: Ombra, Esecuzione). */
export const skillValue = (state: GameState, hero: Stats, def: SkillDef) =>
  def.effect.value * (1 + skillRune(state, def.id, 'potenza')) * (1 + tagPower(hero, def));

/** Costo in Luce e ricarica (in tick) con le rune Parsimonia e Rapidità, la riduzione ricarica per tag e "freeSkills". */
export const lightCost = (state: GameState, hero: Stats, def: SkillDef) =>
  hero.rules.has('freeSkills') ? 0 : def.light * (1 - reduction(skillRune(state, def.id, 'parsimonia')));
export const cooldownTicks = (state: GameState, hero: Stats, def: SkillDef) =>
  Math.round(def.cooldown * TICK_RATE * (1 - reduction(skillRune(state, def.id, 'rapidita'))) * (1 - tagCdr(hero, def))
    * (hero.rules.has('freeSkills') ? FREE_SKILLS_CD : 1));

/** Chiave di volta "freeSkills": moltiplicatore della ricarica. */
export const FREE_SKILLS_CD = 2;

export const canCast = (state: GameState, hero: Stats, id: string) => {
  const def = skillDef(id);
  return !!def && (state.skills.cooldowns[id] ?? 0) <= 0 && state.hero.light >= lightCost(state, hero, def) && state.hero.level >= def.level
    && (!def.via || activeVie(state.vie).includes(def.via));
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
  if (damage && r('ombra')) {
    if (effect.kind === 'burst') effect = { ...effect, element: 'shadow' };
    value *= 1 + r('ombra');
    state.hero.hp = Math.max(1, state.hero.hp - hero.maxHp * RUNE_SHADOW_HP_COST);
  }
  // conversioni elementali (l'ultima incastonata vince): +danno e, per le esplosioni, cambio di elemento
  for (const [id, element] of [['incendio', 'fire'], ['brina', 'cold'], ['tempesta', 'lightning'], ['crepuscolo', 'shadow']] as const) {
    if (!damage || !r(id)) continue;
    if (effect.kind === 'burst') effect = { ...effect, element };
    value *= 1 + r(id);
  }
  if (damage && enemy && enemy.hp < enemy.maxHp * RUNE_EXECUTE_HP) value *= 1 + r('esecuzione');
  if (damage && enemy && enemy.hp >= enemy.maxHp * RUNE_OPENING_HP) value *= 1 + r('apertura');
  if (damage && enemy?.boss) value *= 1 + r('condanna');
  if (damage && state.hero.light >= MAX_LIGHT) value *= 1 + r('fulgore');
  if (!damage) value *= 1 + r('custodia');
  if (damage && enemy) {
    if (enemy.elite) value *= 1 + r('massacro');
    if (enemy.bleed > 0 || enemy.poison > 0) value *= 1 + r('feritaAperta');
    if (r('penetrazione') && effect.kind === 'burst') {
      const res = resMult(enemy, effect.element);
      if (res > 0 && res < 1) value *= (1 - (1 - res) * (1 - Math.min(1, r('penetrazione')))) / res;
    }
  }
  if (damage && state.hero.hp < hero.maxHp * RUNE_DESPAIR_HP) value *= 1 + r('disperazione');
  if (damage) value *= 1 + r('pazienza') * def.cooldown;
  if (damage && r('risonanza')) value *= 1 + r('risonanza') * resonance(state, def);
  if (enemy && r('alba') && !enemy.dawn?.includes(def.id)) {
    value *= 1 + r('alba');
    (enemy.dawn ??= []).push(def.id);
  }
  // si tira la Supernova solo se la runa c'è
  if (damage && r('supernova') && nextRandom(state) < Math.min(1, r('supernova'))) value *= RUNE_SUPERNOVA_MULT;
  const lasting = 1 + r('persistenza');
  if (effect.kind === 'haste') effect = { ...effect, seconds: effect.seconds * lasting };
  const amount = applyEffect(state, hero, effect, value, `skill:${def.id}`);
  if (amount === null) return null;
  if (r('purificazione')) heal(state, hero, (hero.maxHp - state.hero.hp) * r('purificazione'));
  if (r('rinnovamento')) heal(state, hero, hero.maxHp * r('rinnovamento'));
  if (damage && enemy) {
    if (r('consacrazione')) enemy.hp -= amount * r('consacrazione') * hero.elemMult.holy * resMult(enemy, 'holy');
    // si tira il Marchio solo se la runa c'è
    if (r('marchio') && nextRandom(state) < Math.min(1, r('marchio'))) state.hero.nextCrit = true;
    enemy.poison += amount * r('brace');
    enemy.bleed += amount * r('lacerazione');
    if (r('sete')) heal(state, hero, amount * r('sete'));
    if (r('raccolto') && enemy.hp <= 0) enemy.harvest = r('raccolto');
  }
  if (r('bastione')) state.hero.shield = Math.min(hero.maxHp, state.hero.shield + hero.maxHp * r('bastione'));
  if (r('fervore')) {
    const haste = { kind: 'haste' as const, value: r('fervore'), seconds: RUNE_HASTE_SECONDS * lasting };
    applyEffect(state, hero, haste, haste.value, `rune:fervore:${def.id}`);
  }
  const seconds = RUNE_BUFF_SECONDS * lasting;
  if (r('grazia')) runeBuff(state, `rune:grazia:${def.id}`, seconds, { dodge: r('grazia') });
  if (r('fortezza')) runeBuff(state, `rune:fortezza:${def.id}`, seconds, { defPct: r('fortezza') });
  if (r('riflesso')) runeBuff(state, `rune:riflesso:${def.id}`, seconds, { reflect: r('riflesso') });
  return amount;
}

/** Runa Risonanza: altre skill negli slot che hanno almeno un tag in comune con questa. */
function resonance(state: GameState, def: SkillDef): number {
  return state.skills.slots.filter((id) => id && id !== def.id && skillDef(id)?.tags.some((t) => def.tags.includes(t))).length;
}

/** Buff a tempo delle rune (schivata, difesa, riflesso): si rinnova se c'è già. */
function runeBuff(state: GameState, key: string, seconds: number, b: { dodge?: number; defPct?: number; reflect?: number }) {
  const ticks = Math.round(seconds * TICK_RATE);
  const old = state.hero.buffs.find((x) => x.key === key);
  if (old) old.ticks = ticks;
  else if (state.hero.buffs.length < MAX_BUFFS) state.hero.buffs.push({ key, speedPct: 0, ticks, ...b });
}

/** Lancia una skill (senza controllare ricarica e Luce: lo fa chi chiama). `free` = non consuma Luce. */
function castSkill(state: GameState, hero: Stats, def: SkillDef, events: { push(e: SkillEvent): void }, free = false): boolean {
  if (!worthCasting(state, hero, def)) return false;
  const amount = perform(state, hero, def);
  if (amount === null) return false;
  if (!free) {
    const cost = lightCost(state, hero, def);
    state.hero.light -= cost * (1 - Math.min(1, skillRune(state, def.id, 'luminescenza')));
  }
  state.skills.cooldowns[def.id] = cooldownTicks(state, hero, def);
  const reap = skillRune(state, def.id, 'mietitura');
  if (reap && state.enemy && state.enemy.hp <= 0) state.skills.cooldowns[def.id] = Math.round(state.skills.cooldowns[def.id] * (1 - Math.min(1, reap)));
  const chain = skillRune(state, def.id, 'catena');
  if (chain) for (const id of state.skills.slots) if (id && id !== def.id && state.skills.cooldowns[id] > 0) {
    state.skills.cooldowns[id] = Math.max(0, state.skills.cooldowns[id] - Math.round(chain * TICK_RATE));
  }
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
    if (id && canCast(state, hero, id) && castSkill(state, hero, skillDef(id)!, events)) return;
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
  if (id !== null && !unlockedSkills(state.hero.level, activeVie(state.vie)).some((d) => d.id === id)) return false;
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
