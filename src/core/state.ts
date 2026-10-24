import type { UpgradeId } from '../data/upgrades';
import { newGear, type GearState } from './items';
import { heroStats } from './stats';

export interface EnemyState {
  templateId: string;
  boss: boolean;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  attackSpeed: number;
  /** Avanzamento verso il prossimo attacco, 0..1. */
  swing: number;
}

export interface GameState {
  /** Versione dello schema del salvataggio. */
  version: number;
  /** Tick di logica eseguiti dall'inizio della partita. */
  tick: number;
  createdAt: number;
  /** Ultimo istante (ms epoch) in cui il gioco era aperto: base per il progresso offline. */
  lastSeen: number;
  /** Stato dell'RNG deterministico. */
  rng: number;
  hero: { level: number; xp: number; hp: number; swing: number };
  gold: number;
  /** Valuta del crafting, dallo smantellamento. */
  fragments: number;
  gear: GearState;
  upgrades: Record<UpgradeId, number>;
  stage: {
    current: number;
    best: number;
    kills: number;
    /** Falso dopo una morte: si resta a farmare finché non si sale di livello. */
    auto: boolean;
  };
  enemy: EnemyState | null;
  /** Tick mancanti prima che compaia il prossimo nemico. */
  respawn: number;
  totals: { kills: number; deaths: number; gold: number };
}

export const STATE_VERSION = 4;

export function newGame(now: number, seed = now >>> 0): GameState {
  const upgrades = { forza: 0, corazza: 0, rapidita: 0 };
  return {
    version: STATE_VERSION,
    tick: 0,
    createdAt: now,
    lastSeen: now,
    rng: seed,
    hero: { level: 1, xp: 0, hp: heroStats(1, upgrades).maxHp, swing: 0 },
    gold: 0,
    fragments: 0,
    gear: newGear(),
    upgrades,
    stage: { current: 1, best: 1, kills: 0, auto: true },
    enemy: null,
    respawn: 0,
    totals: { kills: 0, deaths: 0, gold: 0 },
  };
}
