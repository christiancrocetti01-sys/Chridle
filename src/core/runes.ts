import {
  ESSENCE_BOSS_MULT, ESSENCE_PER_KILL, RUNE_LEVEL_BASE, RUNE_LEVEL_BONUS, RUNE_LEVEL_GROWTH, RUNE_SOCKETS,
  RUNE_UNLOCK_BASE, RUNE_UNLOCK_GROWTH, runeDef, type RuneId,
} from '../data/runes';
import { skillDef, type SkillDef } from '../data/skills';
import type { GameState } from './state';

export interface RuneState {
  /** Livello di ogni runa sbloccata (assente = bloccata). */
  levels: Partial<Record<RuneId, number>>;
  /** Rune incastonate per skill. */
  sockets: Record<string, (RuneId | null)[]>;
}

export const newRunes = (): RuneState => ({ levels: {}, sockets: {} });

export const isDamageSkill = (def: SkillDef) => ['burst', 'bleed', 'poison'].includes(def.effect.kind);

export function essenceFor(stage: number, boss: boolean): number {
  return ESSENCE_PER_KILL * (boss ? ESSENCE_BOSS_MULT : 1) * (1 + stage / 10);
}

export function unlockCost(state: GameState): number {
  return Math.ceil(RUNE_UNLOCK_BASE * Math.pow(RUNE_UNLOCK_GROWTH, Object.keys(state.runes.levels).length));
}

export function levelCost(level: number): number {
  return Math.ceil(RUNE_LEVEL_BASE * Math.pow(RUNE_LEVEL_GROWTH, level));
}

/** Valore effettivo di una runa al suo livello. */
export function runeValue(state: GameState, id: RuneId): number {
  const level = state.runes.levels[id] ?? 1;
  return runeDef(id)!.value * (1 + RUNE_LEVEL_BONUS * (level - 1));
}

export function unlockRune(state: GameState, id: RuneId): boolean {
  if (!runeDef(id) || state.runes.levels[id] || state.essence < unlockCost(state)) return false;
  state.essence -= unlockCost(state);
  state.runes.levels[id] = 1;
  return true;
}

export function levelRune(state: GameState, id: RuneId): boolean {
  const level = state.runes.levels[id];
  if (!level || state.essence < levelCost(level)) return false;
  state.essence -= levelCost(level);
  state.runes.levels[id] = level + 1;
  return true;
}

export function socketsOf(state: GameState, skillId: string): (RuneId | null)[] {
  return state.runes.sockets[skillId] ?? Array(RUNE_SOCKETS).fill(null);
}

export function canSocket(state: GameState, skillId: string, i: number, id: RuneId): boolean {
  const def = skillDef(skillId);
  const rune = runeDef(id);
  if (!def || !rune || !state.runes.levels[id] || i < 0 || i >= RUNE_SOCKETS) return false;
  if (rune.damageOnly && !isDamageSkill(def)) return false;
  if (rune.supportOnly && isDamageSkill(def)) return false;
  return !socketsOf(state, skillId).some((r, k) => k !== i && r === id);
}

/** Incastona (o toglie, con null) una runa in una skill. */
export function socketRune(state: GameState, skillId: string, i: number, id: RuneId | null): boolean {
  if (id !== null && !canSocket(state, skillId, i, id)) return false;
  if (id === null && (!skillDef(skillId) || i < 0 || i >= RUNE_SOCKETS)) return false;
  const sockets = socketsOf(state, skillId).slice();
  sockets[i] = id;
  state.runes.sockets[skillId] = sockets;
  return true;
}

/** Valore della runa `id` se è incastonata nella skill, altrimenti 0. */
export function skillRune(state: GameState, skillId: string, id: RuneId): number {
  return socketsOf(state, skillId).includes(id) ? runeValue(state, id) : 0;
}
