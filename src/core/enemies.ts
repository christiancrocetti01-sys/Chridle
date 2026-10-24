import {
  BOSS_REGEN, BOSS_SHIELD, CHAMPIONS, ELITES, ELITE_CHANCE, ELITE_FROM_STAGE, ELITE_HP, ENEMIES, ENRAGE_EVERY_S, ENRAGE_STEP,
  FURY_AFTER_S, FURY_MAX_DOUBLINGS,
  FAMILIES, SUMMON_ATK, SUMMON_EVERY_S, ZONES, ZONE_BOSS_HP, zoneOf, type DamageType, type EliteId, type EnemyTemplate, type Family,
} from '../data/enemies';
import {
  DUNGEON_WAVES, RAID_ATK, RAID_HP, RAID_PHASES, TOWER_ATK, TOWER_BASE, TOWER_HP, TOWER_STEP,
} from '../data/modes';
import { TICK_RATE } from './loop';
import { nextRandom } from './rng';
import type { EnemyState, GameState } from './state';
import { KILLS_PER_STAGE, stageEnemy, type Stats } from './stats';
import { ELEMENTS } from '../data/items';

/** Moltiplicatore del danno di un tipo contro il nemico (resistenze e debolezze della famiglia). */
export const resMult = (enemy: { family: Family } | null | undefined, type: DamageType) =>
  enemy ? 1 - (FAMILIES[enemy.family]?.res[type] ?? 0) : 1;

/** Danno elementale di un colpo contro questo nemico. */
export const elementalVs = (hero: Stats, enemy: { family: Family } | null | undefined) =>
  ELEMENTS.reduce((sum, e) => sum + hero.elements[e] * resMult(enemy, e), 0);

function build(t: EnemyTemplate, stage: number, extra: Partial<EnemyState> = {}): EnemyState {
  const base = stageEnemy(stage);
  const maxHp = base.hp * t.hp;
  return {
    templateId: t.id,
    name: t.name,
    family: t.family,
    boss: false,
    zoneBoss: false,
    elite: null,
    mechanics: [],
    age: 0,
    shielded: false,
    phase: 1,
    hp: maxHp,
    maxHp,
    atk: base.atk * t.atk,
    def: base.def * (t.def ?? 1),
    attackSpeed: t.attackSpeed,
    swing: 0,
    bleed: 0,
    poison: 0,
    ...extra,
  };
}

const pickOf = <T>(state: GameState, list: T[]) => list[Math.floor(nextRandom(state) * list.length)];

export function makeElite(e: EnemyState, id: EliteId) {
  e.elite = id;
  e.maxHp *= ELITE_HP * (id === 'robusto' ? 2 : 1);
  e.hp = e.maxHp;
  if (id === 'veloce') e.attackSpeed *= 1.5;
  if (id === 'corazzato') e.def *= 3;
  if (id === 'furioso') e.atk *= 1.5;
  e.name = `${e.name} ${ELITES.find((x) => x.id === id)!.name}`;
}

/** Nemico normale della zona dello stage (con possibile élite). */
function zoneEnemy(state: GameState, stage: number, eliteRoll: boolean): EnemyState {
  const { zone } = zoneOf(stage);
  const e = build(pickOf(state, ENEMIES.filter((x) => x.family === zone.family)), stage);
  if (eliteRoll && stage >= ELITE_FROM_STAGE && nextRandom(state) < ELITE_CHANCE) makeElite(e, pickOf(state, ELITES).id);
  return e;
}

/** Boss dello stage: il campione della famiglia, o il boss di zona con le sue meccaniche all'ultimo stage. */
function stageBoss(stage: number, forceZoneBoss = false): EnemyState {
  const z = zoneOf(stage);
  if (z.zoneBoss || forceZoneBoss) {
    const e = build(z.zone.boss, stage, { boss: true, zoneBoss: true, mechanics: [...z.zone.mechanics] });
    e.maxHp = e.hp = e.maxHp * ZONE_BOSS_HP;
    return e;
  }
  return build(CHAMPIONS[z.zone.family], stage, { boss: true });
}

/** Prossimo nemico secondo la modalità in corso. */
export function spawnEnemy(state: GameState): EnemyState {
  const m = state.mode;
  if (m.kind === 'dungeon') {
    const e = m.wave >= DUNGEON_WAVES ? stageBoss(m.level, true) : zoneEnemy(state, m.level, false);
    if (m.wave < DUNGEON_WAVES && m.mods.includes('elite')) makeElite(e, pickOf(state, ELITES).id);
    if (m.mods.includes('orda')) e.hp = e.maxHp *= 1.5;
    if (m.mods.includes('furia')) e.atk *= 1.4;
    if (m.mods.includes('rapidi')) e.attackSpeed *= 1.3;
    if (m.mods.includes('corazzati')) e.def *= 2;
    return e;
  }
  if (m.kind === 'tower') {
    const stage = TOWER_BASE + m.floor * TOWER_STEP;
    const zone = ZONES[(m.floor - 1) % ZONES.length];
    const e = build(CHAMPIONS[zone.family], stage, { boss: true, name: `Piano ${m.floor} · ${CHAMPIONS[zone.family].name}` });
    e.maxHp = e.hp = e.maxHp * TOWER_HP / CHAMPIONS[zone.family].hp;
    e.atk *= TOWER_ATK;
    return e;
  }
  if (m.kind === 'raid') {
    const e = build(zoneOf(m.level).zone.boss, m.level, { boss: true, zoneBoss: true, name: m.name, mechanics: ['enrage'] });
    e.maxHp = e.hp = stageEnemy(m.level).hp * RAID_HP;
    e.atk = stageEnemy(m.level).atk * RAID_ATK;
    return e;
  }
  const boss = state.stage.kills >= KILLS_PER_STAGE;
  return boss ? stageBoss(state.stage.current) : zoneEnemy(state, state.stage.current, true);
}

export type MechanicEvent = { type: 'mechanic'; text: string };

/**
 * Meccaniche del nemico a ogni tick: rigenerazione, scudo a metà vita, fasi del raid.
 * Restituisce il danno delle evocazioni da infliggere all'eroe in questo tick (0 se nessuno).
 */
export function tickEnemy(enemy: EnemyState, raid: boolean, events: { push(e: MechanicEvent): void }): number {
  enemy.age++;
  if (raid) {
    const phase = 1 + RAID_PHASES.filter((p) => enemy.hp < enemy.maxHp * p).length;
    while (phase > enemy.phase) {
      enemy.phase++;
      if (enemy.phase === 2) {
        enemy.mechanics.push('summon', 'shield');
        events.push({ type: 'mechanic', text: 'Fase 2: il boss evoca servitori' });
      } else {
        enemy.mechanics.push('regen');
        enemy.attackSpeed *= 1.5;
        events.push({ type: 'mechanic', text: 'Fase 3: il boss è furioso e si rigenera' });
      }
    }
  }
  const has = (m: string) => enemy.mechanics.includes(m as never);
  if (has('regen') && enemy.hp > 0) enemy.hp = Math.min(enemy.maxHp, enemy.hp + (enemy.maxHp * BOSS_REGEN) / TICK_RATE);
  if (has('shield') && !enemy.shielded && enemy.hp > 0 && enemy.hp < enemy.maxHp / 2) {
    enemy.shielded = true;
    enemy.hp += enemy.maxHp * BOSS_SHIELD;
    events.push({ type: 'mechanic', text: `${enemy.name} si avvolge in uno scudo` });
  }
  if (has('summon') && enemy.age % (SUMMON_EVERY_S * TICK_RATE) === 0) return enemyAtk(enemy) * SUMMON_ATK;
  return 0;
}

/** Attacco attuale del nemico: furia della meccanica e, oltre FURY_AFTER_S, furia contro gli stalli. */
export function enemyAtk(enemy: EnemyState): number {
  const every = ENRAGE_EVERY_S * TICK_RATE;
  const enrage = enemy.mechanics.includes('enrage') ? 1 + ENRAGE_STEP * Math.floor(enemy.age / every) : 1;
  // nessun combattimento dura per sempre (boss che rigenera più del danno subito, eroe che non muore)
  const late = enemy.age - FURY_AFTER_S * TICK_RATE;
  return enemy.atk * enrage * (late > 0 ? 2 ** Math.min(FURY_MAX_DOUBLINGS, Math.floor(late / every)) : 1);
}
