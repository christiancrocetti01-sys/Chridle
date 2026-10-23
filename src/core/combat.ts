import { BOSSES, ENEMIES } from '../data/enemies';
import { UPGRADES, type UpgradeId } from '../data/upgrades';
import { TICK_RATE } from './loop';
import { nextRandom } from './rng';
import type { GameState } from './state';
import { KILLS_PER_STAGE, heroStats, mitigate, stageEnemy, upgradeCost, xpToNext } from './stats';

export type CombatEvent =
  | { type: 'hit'; target: 'hero' | 'enemy'; amount: number; crit: boolean }
  | { type: 'kill'; gold: number; xp: number; boss: boolean }
  | { type: 'levelup'; level: number }
  | { type: 'death' }
  | { type: 'stage'; stage: number };

/** Tick di pausa tra un nemico e il successivo (per l'animazione di morte). */
export const RESPAWN_TICKS = 6;

/** Un tick di simulazione. Puro e deterministico: stessi input → stessi risultati. */
export function step(state: GameState, events: CombatEvent[] = []): CombatEvent[] {
  state.tick++;
  const hero = heroStats(state.hero.level, state.upgrades);
  state.hero.hp = Math.min(hero.maxHp, state.hero.hp + hero.regen / TICK_RATE);

  if (!state.enemy) {
    if (state.respawn > 0) state.respawn--;
    else state.enemy = spawnEnemy(state);
    return events;
  }
  const enemy = state.enemy;

  state.hero.swing += hero.attackSpeed / TICK_RATE;
  if (state.hero.swing >= 1) {
    state.hero.swing -= 1;
    const crit = nextRandom(state) < hero.critChance;
    const amount = mitigate(hero.atk * (crit ? hero.critMult : 1), enemy.def);
    enemy.hp -= amount;
    events.push({ type: 'hit', target: 'enemy', amount, crit });
    if (enemy.hp <= 0) {
      onKill(state, events);
      return events;
    }
  }

  enemy.swing += enemy.attackSpeed / TICK_RATE;
  if (enemy.swing >= 1) {
    enemy.swing -= 1;
    const amount = mitigate(enemy.atk, hero.def);
    state.hero.hp -= amount;
    events.push({ type: 'hit', target: 'hero', amount, crit: false });
    if (state.hero.hp <= 0) onDeath(state, events);
  }
  return events;
}

export function spawnEnemy(state: GameState) {
  const boss = state.stage.kills >= KILLS_PER_STAGE;
  const pool = boss ? BOSSES : ENEMIES;
  const t = pool[Math.floor(nextRandom(state) * pool.length)];
  const base = stageEnemy(state.stage.current);
  const maxHp = base.hp * t.hp;
  return {
    templateId: t.id,
    boss,
    hp: maxHp,
    maxHp,
    atk: base.atk * t.atk,
    def: base.def,
    attackSpeed: t.attackSpeed,
    swing: 0,
  };
}

function onKill(state: GameState, events: CombatEvent[]) {
  const boss = state.enemy!.boss;
  const base = stageEnemy(state.stage.current);
  const mult = boss ? 5 : 1;
  const gold = base.gold * mult;
  const xp = base.xp * mult;
  state.gold += gold;
  state.totals.gold += gold;
  state.totals.kills++;
  state.enemy = null;
  state.respawn = RESPAWN_TICKS;
  state.hero.swing = 0;
  events.push({ type: 'kill', gold, xp, boss });
  gainXp(state, xp, events);

  if (boss) {
    state.stage.kills = 0;
    state.stage.current++;
    state.stage.best = Math.max(state.stage.best, state.stage.current);
    events.push({ type: 'stage', stage: state.stage.current });
  } else if (state.stage.auto || state.stage.kills < KILLS_PER_STAGE - 1) {
    state.stage.kills++;
  }
}

function gainXp(state: GameState, xp: number, events: CombatEvent[]) {
  state.hero.xp += xp;
  while (state.hero.xp >= xpToNext(state.hero.level)) {
    state.hero.xp -= xpToNext(state.hero.level);
    state.hero.level++;
    state.hero.hp = heroStats(state.hero.level, state.upgrades).maxHp;
    state.stage.auto = true; // più forte: si riprova ad avanzare
    events.push({ type: 'levelup', level: state.hero.level });
  }
}

function onDeath(state: GameState, events: CombatEvent[]) {
  state.totals.deaths++;
  const wasBoss = state.enemy?.boss;
  state.enemy = null;
  state.respawn = RESPAWN_TICKS * 2;
  state.hero.hp = heroStats(state.hero.level, state.upgrades).maxHp;
  state.hero.swing = 0;
  state.stage.auto = false;
  if (!wasBoss && state.stage.current > 1) {
    // lo stage precedente era già completato: al prossimo livello si riaffronta subito il suo boss
    state.stage.current--;
    state.stage.kills = KILLS_PER_STAGE - 1;
    events.push({ type: 'stage', stage: state.stage.current });
  } else {
    // contro il boss si resta nello stage ma si torna a farmare i nemici normali
    state.stage.kills = Math.min(state.stage.kills, KILLS_PER_STAGE - 1);
  }
  events.push({ type: 'death' });
}

export function upgradePrice(state: GameState, id: UpgradeId): number {
  const u = UPGRADES.find((x) => x.id === id)!;
  return upgradeCost(u.baseCost, u.costGrowth, state.upgrades[id]);
}

export function buyUpgrade(state: GameState, id: UpgradeId): boolean {
  const price = upgradePrice(state, id);
  if (state.gold < price) return false;
  const before = heroStats(state.hero.level, state.upgrades).maxHp;
  state.gold -= price;
  state.upgrades[id]++;
  const after = heroStats(state.hero.level, state.upgrades).maxHp;
  state.hero.hp += after - before;
  return true;
}
