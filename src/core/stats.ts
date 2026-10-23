import type { UpgradeId } from '../data/upgrades';

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

export function heroStats(level: number, upgrades: Record<UpgradeId, number>): Stats {
  const l = level - 1;
  const atkMul = 1 + 0.1 * upgrades.forza;
  const tankMul = 1 + 0.1 * upgrades.corazza;
  const maxHp = (100 + 18 * l) * tankMul;
  return {
    maxHp,
    atk: (10 + 2.5 * l) * atkMul,
    def: (4 + 1.2 * l) * tankMul,
    attackSpeed: 1.2 * (1 + 0.04 * upgrades.rapidita),
    critChance: 0.1,
    critMult: 2,
    regen: maxHp * 0.01,
  };
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
