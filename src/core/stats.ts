import { ELEMENTS, type Element } from '../data/items';
import type { UpgradeId } from '../data/upgrades';
import type { RuleId } from '../data/uniques';
import { emptyMods, gearMods, gearRules, type GearState, type StatMods } from './items';
import type { HeroState } from './state';

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
  /** Regole speciali attive (unici e set completi). */
  rules: Set<RuleId>;
}

export const MAX_CRIT_CHANCE = 0.75;
export const MAX_DODGE = 0.5;

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
    rules: new Set(),
  };
}

export const FRENZY_HP = 0.5;
export const FRENZY_SPEED = 1.5;

/** Danno elementale totale per colpo. */
export function elementalDamage(s: Stats): number {
  return ELEMENTS.reduce((sum, e) => sum + s.elements[e], 0);
}

/** Statistiche dell'eroe con l'equipaggiamento indossato. */
export function stateStats(state: { hero: HeroState; upgrades: Record<UpgradeId, number>; gear: GearState }): Stats {
  const mods = gearMods(state.gear);
  for (const b of state.hero.buffs) mods.speedPct += b.speedPct;
  const s = heroStats(state.hero.level, state.upgrades, mods);
  s.rules = gearRules(Object.values(state.gear.equipped));
  if (s.rules.has('frenzy') && state.hero.hp < s.maxHp * FRENZY_HP) s.attackSpeed *= FRENZY_SPEED;
  return s;
}

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
