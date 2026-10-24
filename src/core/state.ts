import type { UpgradeId } from '../data/upgrades';
import { newGear, type GearState } from './items';
import { newRunes, type RuneState } from './runes';
import { newSkills, type SkillState } from './skills';
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
  /** Danno ancora da infliggere con sanguinamento e veleno (si consuma nel tempo). */
  bleed: number;
  poison: number;
}

export interface HeroState {
  level: number;
  xp: number;
  hp: number;
  swing: number;
  /** Assorbe il danno prima della vita. */
  shield: number;
  /** Colpi messi a segno sul nemico corrente (per gli effetti "ogni N colpi"). */
  hits: number;
  /** Effetti temporanei: uno per affisso a scatto, si rinnova quando riscatta. */
  buffs: { key: string; speedPct: number; ticks: number }[];
  /** Il prossimo colpo è un critico garantito (regola "dodgeCrit"). */
  nextCrit: boolean;
  /** Risorsa delle skill attive: si accumula colpendo. */
  light: number;
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
  hero: HeroState;
  gold: number;
  /** Valuta del crafting, dallo smantellamento. */
  fragments: number;
  gear: GearState;
  skills: SkillState;
  /** Valuta delle rune, dai nemici. */
  essence: number;
  runes: RuneState;
  /** Costellazioni: id delle stelle prese, in ordine. */
  stars: string[];
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

export const STATE_VERSION = 10;

export function newGame(now: number, seed = now >>> 0): GameState {
  const upgrades = { forza: 0, corazza: 0, rapidita: 0 };
  return {
    version: STATE_VERSION,
    tick: 0,
    createdAt: now,
    lastSeen: now,
    rng: seed,
    hero: { level: 1, xp: 0, hp: heroStats(1, upgrades).maxHp, swing: 0, shield: 0, hits: 0, buffs: [], nextCrit: false, light: 0 },
    gold: 0,
    fragments: 0,
    gear: newGear(),
    skills: newSkills(),
    essence: 0,
    runes: newRunes(),
    stars: [],
    upgrades,
    stage: { current: 1, best: 1, kills: 0, auto: true },
    enemy: null,
    respawn: 0,
    totals: { kills: 0, deaths: 0, gold: 0 },
  };
}
