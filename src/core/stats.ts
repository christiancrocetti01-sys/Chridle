import type { UpgradeId } from '../data/upgrades';
import { emptyMods, gearMods, type GearState, type StatMods } from './items';

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
}

export const MAX_CRIT_CHANCE = 0.75;

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
  };
}

/** Statistiche dell'eroe con l'equipaggiamento indossato. */
export function stateStats(state: { hero: { level: number }; upgrades: Record<UpgradeId, number>; gear: GearState }): Stats {
  return heroStats(state.hero.level, state.upgrades, gearMods(state.gear));
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
