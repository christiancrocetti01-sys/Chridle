import type { UpgradeId } from '../data/upgrades';
import type { EliteId, Family, Mechanic } from '../data/enemies';
import type { DungeonModId } from '../data/modes';
import { newGear, type GearState } from './items';
import { newRunes, type RuneState } from './runes';
import { newSkills, type SkillState } from './skills';
import { heroStats } from './stats';
import { newVie, type ViaState } from './vie';
import { newAscension, type AscensionState } from './ascension';
import { newCodex, type CodexState } from './codex';
import type { CollectionState } from './collection';
import type { AchievementState } from './achievements';
import { newLumi, type LumiState } from './lumi';
import { newParagon, newRebirth, type ParagonState, type RebirthState } from './endgame';

export interface EnemyState {
  templateId: string;
  name: string;
  family: Family;
  boss: boolean;
  /** Boss di fine zona, di dungeon o di raid: ha meccaniche. */
  zoneBoss: boolean;
  elite: EliteId | null;
  mechanics: Mechanic[];
  /** Tick passati in combattimento (per furia ed evocazioni). */
  age: number;
  /** Lo scudo a metà vita è già stato usato. */
  shielded: boolean;
  /** Fase del raid (1-3). */
  phase: number;
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
  /** Tick prima che la Santità possa salvare di nuovo da un colpo mortale. */
  sanctity: number;
}

/** Modalità in corso: la Campagna resta in pausa mentre si gioca un Dungeon, la Torre o un Raid. */
export type Mode =
  | { kind: 'campaign' }
  | { kind: 'dungeon'; level: number; wave: number; mods: DungeonModId[] }
  | { kind: 'tower'; floor: number; ticksLeft: number }
  | { kind: 'raid'; level: number; ticksLeft: number; name: string }
  /** Abisso: `wave` = nemici uccisi nella profondità (all'ultimo arriva il Guardiano). */
  | { kind: 'abyss'; depth: number; wave: number };

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
  /** Vie (sottoclassi) scelte. */
  vie: ViaState;
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
  totals: { kills: number; deaths: number; gold: number; dungeons: number; raids: number };
  /** Chiavi dei Dungeon (anche per i Raid). */
  keys: number;
  mode: Mode;
  /** Torre dell'Alba: piano record. */
  tower: { best: number };
  ascension: AscensionState;
  /** Codex/Bestiario: uccisioni per famiglia (permanenti). */
  codex: CodexState;
  /** Collezione leggendari: id degli unici trovati (permanenti). */
  collection: CollectionState;
  /** Imprese completate (permanenti). */
  achievements: AchievementState;
  /** Lumi: spiriti compagni (permanenti). */
  lumi: LumiState;
  /** Abisso: profondità record (completata). */
  abyss: { best: number };
  /** Paragon: livelli infiniti dall'Abisso (permanenti). */
  paragon: ParagonState;
  /** Rinascita Solare (permanente). */
  rebirth: RebirthState;
}

export const STATE_VERSION = 21;

export function newGame(now: number, seed = now >>> 0): GameState {
  const upgrades = { forza: 0, corazza: 0, rapidita: 0 };
  return {
    version: STATE_VERSION,
    tick: 0,
    createdAt: now,
    lastSeen: now,
    rng: seed,
    hero: { level: 1, xp: 0, hp: heroStats(1, upgrades).maxHp, swing: 0, shield: 0, hits: 0, buffs: [], nextCrit: false, light: 0, sanctity: 0 },
    gold: 0,
    fragments: 0,
    gear: newGear(),
    skills: newSkills(),
    essence: 0,
    runes: newRunes(),
    stars: [],
    vie: newVie(),
    upgrades,
    stage: { current: 1, best: 1, kills: 0, auto: true },
    enemy: null,
    respawn: 0,
    totals: { kills: 0, deaths: 0, gold: 0, dungeons: 0, raids: 0 },
    keys: 0,
    mode: { kind: 'campaign' },
    tower: { best: 0 },
    ascension: newAscension(),
    codex: newCodex(),
    collection: [],
    achievements: [],
    lumi: newLumi(),
    abyss: { best: 0 },
    paragon: newParagon(),
    rebirth: newRebirth(),
  };
}
