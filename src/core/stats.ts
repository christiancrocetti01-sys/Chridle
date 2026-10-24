import { ELEMENTS, type Element } from '../data/items';
import type { UpgradeId } from '../data/upgrades';
import type { RuleId } from '../data/uniques';
import { addStarMods } from './constellations';
import { addViaMods, type ViaState } from './vie';
import { addPerkMods, type AscensionState } from './ascension';
import { familyMult, type CodexState } from './codex';
import { addCollectionMods, type CollectionState } from './collection';
import type { Family } from '../data/enemies';
import { BLOOD_PACT_MAX } from '../data/vie';
import {
  CORRUPTION_MAX, CORRUPTION_THRESHOLD, CORRUPT_DMG, CORRUPT_TANK, ECLIPSE_MULT, PURE_DMG, PURE_TANK,
} from '../data/corruption';
import { TOWER_BONUS, TOWER_MILESTONE } from '../data/modes';
import { emptyMods, gearMods, gearRules, type GearState, type StatMods } from './items';
import type { HeroState } from './state';
import { SKILL_TAGS, type SkillTag } from '../data/skills';

export interface Stats {
  maxHp: number;
  atk: number;
  def: number;
  /** Attacchi al secondo. */
  attackSpeed: number;
  critChance: number;
  critMult: number;
  /** HP rigenerati al secondo. */
  regen: number;
  /** Danno elementale aggiunto a ogni colpo (non ridotto dalla difesa). */
  elements: Record<Element, number>;
  /** Moltiplicatore dei danni di ogni elemento (anche per le esplosioni a scatto). */
  elemMult: Record<Element, number>;
  /** Danno da veleno al secondo, continuo, ignora la difesa. */
  poison: number;
  /** Frazione del danno fisico inflitta in più come sanguinamento (ignora la difesa). */
  bleed: number;
  /** Frazione del danno inflitto recuperata come vita. */
  lifeSteal: number;
  dodge: number;
  /** Danno restituito a chi colpisce l'eroe. */
  thorns: number;
  goldMult: number;
  xpMult: number;
  magicFind: number;
  /** Moltiplicatore di tutto il danno contro i boss. */
  bossMult: number;
  /** Bonus all'effetto delle skill per tag (si sommano sui tag della skill). */
  skillPower: Record<SkillTag, number>;
  /** Riduzione della ricarica delle skill per tag (si somma, al massimo MAX_SKILL_CDR). */
  skillCdr: Record<SkillTag, number>;
  /** Moltiplicatore del danno contro ogni famiglia (Codex). */
  familyMult: Record<Family, number>;
  /** Moltiplicatore di tutte le cure (rigenerazione e rubavita compresi). */
  healMult: number;
  /** Purezza/Corruzione netta, da −100 a +100. */
  corruption: number;
  /** Regole speciali attive (unici e set completi). */
  rules: Set<RuleId>;
}

export const MAX_CRIT_CHANCE = 0.75;
export const MAX_DODGE = 0.5;
export const MAX_SKILL_CDR = 0.6;

/** Statistiche dell'eroe: base da livello, poi oggetti (piatti e %), poi potenziamenti. */
export function heroStats(level: number, upgrades: Record<UpgradeId, number>, mods: StatMods = emptyMods()): Stats {
  const l = level - 1;
  const atkMul = (1 + 0.1 * upgrades.forza) * (1 + mods.atkPct);
  const tankMul = 1 + 0.1 * upgrades.corazza;
  const maxHp = (100 + 18 * l + mods.hp) * tankMul * (1 + mods.hpPct);
  return {
    maxHp,
    atk: (10 + 2.5 * l + mods.atk) * atkMul,
    def: (4 + 1.2 * l + mods.def) * tankMul * (1 + mods.defPct),
    attackSpeed: 1.2 * (1 + 0.04 * upgrades.rapidita) * (1 + mods.speedPct),
    critChance: Math.min(MAX_CRIT_CHANCE, 0.1 + mods.crit),
    critMult: 2 + mods.critDmg,
    regen: maxHp * (0.01 + mods.regenPct),
    elements: Object.fromEntries(ELEMENTS.map((e) => [e, mods[e] * (1 + mods[`${e}Pct`] + mods.elemPct)])) as Record<Element, number>,
    elemMult: Object.fromEntries(ELEMENTS.map((e) => [e, 1 + mods[`${e}Pct`] + mods.elemPct])) as Record<Element, number>,
    poison: mods.poison,
    bleed: mods.bleed,
    lifeSteal: mods.lifeSteal,
    dodge: Math.min(MAX_DODGE, mods.dodge),
    thorns: mods.thorns,
    goldMult: 1 + mods.goldPct,
    xpMult: 1 + mods.xpPct,
    magicFind: mods.magicFind,
    bossMult: 1 + mods.bossDmg,
    skillPower: Object.fromEntries(SKILL_TAGS.map((t) => [t, mods[`${t}Skill`]])) as Record<SkillTag, number>,
    skillCdr: Object.fromEntries(SKILL_TAGS.map((t) => [t, mods[`${t}Cdr`]])) as Record<SkillTag, number>,
    familyMult: familyMult(undefined),
    healMult: 1,
    corruption: 0,
    rules: new Set(),
  };
}

export const FRENZY_HP = 0.5;
/** Chiave di volta "noCrit": danno dei colpi (e di ciò che scala con l'attacco). */
export const NO_CRIT_MULT = 1.8;
export const FRENZY_SPEED = 1.5;

/** Danno elementale totale per colpo. */
export function elementalDamage(s: Stats): number {
  return ELEMENTS.reduce((sum, e) => sum + s.elements[e], 0);
}

/** Statistiche dell'eroe con l'equipaggiamento indossato. */
export function stateStats(state: { hero: HeroState; upgrades: Record<UpgradeId, number>; gear: GearState; stars?: string[]; vie?: ViaState; tower?: { best: number }; ascension?: AscensionState; codex?: CodexState; collection?: CollectionState }): Stats {
  const mods = gearMods(state.gear);
  addPerkMods(state.ascension, mods);
  addCollectionMods(state.collection, mods);
  // traguardi della Torre dell'Alba: attacco e vita permanenti
  const tower = Math.floor((state.tower?.best ?? 0) / TOWER_MILESTONE) * TOWER_BONUS;
  mods.atkPct += tower;
  mods.hpPct += tower;
  const starRules = addStarMods(state.stars ?? [], mods);
  for (const r of addViaMods(state.vie, mods)) starRules.add(r);
  for (const b of state.hero.buffs) {
    mods.speedPct += b.speedPct;
    mods.dodge += b.dodge ?? 0;
    mods.defPct += b.defPct ?? 0;
  }
  const s = heroStats(state.hero.level, state.upgrades, mods);
  s.familyMult = familyMult(state.codex);
  s.rules = gearRules(Object.values(state.gear.equipped));
  for (const r of starRules) s.rules.add(r);
  applyKeystones(s);
  applyCorruption(s, mods.corruption - mods.purity);
  if (s.rules.has('noCrit')) {
    s.critChance = 0;
    s.atk *= NO_CRIT_MULT;
    for (const e of ELEMENTS) s.elements[e] *= NO_CRIT_MULT;
  }
  if (s.rules.has('bloodPact')) {
    // Eclissiarca: il danno sale con la vita mancante
    const pact = 1 + BLOOD_PACT_MAX * Math.max(0, 1 - state.hero.hp / s.maxHp);
    s.atk *= pact;
    for (const e of ELEMENTS) s.elements[e] *= pact;
  }
  if (s.rules.has('frenzy') && state.hero.hp < s.maxHp * FRENZY_HP) s.attackSpeed *= FRENZY_SPEED;
  return s;
}

/** Purezza/Corruzione: effetto per punto e regole alle soglie (±50 e ±100). */
function applyCorruption(s: Stats, raw: number) {
  const c = Math.max(-CORRUPTION_MAX, Math.min(CORRUPTION_MAX, Math.round(raw)));
  s.corruption = c;
  if (!c) return;
  const dmg = c > 0 ? 1 + CORRUPT_DMG * c : 1 + PURE_DMG * c;
  const tank = c > 0 ? 1 - CORRUPT_TANK * c : 1 - PURE_TANK * c;
  const eclipse = c >= CORRUPTION_MAX ? ECLIPSE_MULT : 1;
  s.atk *= dmg * eclipse;
  for (const e of ELEMENTS) s.elements[e] *= dmg * eclipse;
  s.def *= tank;
  s.healMult *= c >= CORRUPTION_MAX ? 0 : tank;
  if (c >= CORRUPTION_THRESHOLD) s.rules.add('corruptShadow');
  if (c >= CORRUPTION_MAX) s.rules.add('eclipse');
  if (c <= -CORRUPTION_THRESHOLD) s.rules.add('overhealShield');
  if (c <= -CORRUPTION_MAX) s.rules.add('sanctity');
}

/** Chiavi di volta delle regioni delle Vie (prima dei moltiplicatori a condizione). */
function applyKeystones(s: Stats) {
  const elem = (k: number) => { for (const e of ELEMENTS) s.elements[e] *= k; };
  if (s.rules.has('oath')) {
    s.atk += s.def * OATH_DEF_TO_ATK;
    s.attackSpeed *= OATH_SPEED;
  }
  if (s.rules.has('twinStrike')) s.atk *= TWIN_STRIKE_ATK;
  if (s.rules.has('dotDouble')) elem(0.5);
  if (s.rules.has('spiritHost')) s.maxHp *= SPIRIT_HOST_HP;
  if (s.rules.has('blackBlood')) {
    s.maxHp *= BLACK_BLOOD_HP;
    s.atk *= BLACK_BLOOD_DMG;
    elem(BLACK_BLOOD_DMG);
  }
}

export const OATH_DEF_TO_ATK = 0.5;
export const OATH_SPEED = 0.8;
export const TWIN_STRIKE_ATK = 0.6;
export const DOT_DOUBLE = 2;
export const SPIRIT_HOST_HP = 0.75;
export const BLACK_BLOOD_HP = 0.5;
export const BLACK_BLOOD_DMG = 1.5;

/** Riduzione con rendimenti decrescenti: la difesa non annulla mai del tutto il danno. */
export function mitigate(damage: number, def: number): number {
  return Math.max(1, (damage * damage) / (damage + def));
}

export const KILLS_PER_STAGE = 10;

/** Nemico base di uno stage: crescita esponenziale morbida. */
export function stageEnemy(stage: number) {
  const g = Math.pow(1.2, stage - 1);
  return { hp: 40 * g, atk: 6 * Math.pow(1.13, stage - 1), def: 2 * g, gold: 3 * Math.pow(1.14, stage - 1), xp: 5 * Math.pow(1.12, stage - 1) };
}

export function xpToNext(level: number): number {
  return Math.floor(25 * Math.pow(1.22, level - 1));
}

export function upgradeCost(baseCost: number, growth: number, owned: number): number {
  return Math.ceil(baseCost * Math.pow(growth, owned));
}
