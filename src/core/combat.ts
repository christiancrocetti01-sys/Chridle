import { BOSSES, ENEMIES } from '../data/enemies';
import { UPGRADES, type UpgradeId } from '../data/upgrades';
import { TICK_RATE } from './loop';
import { DROP_CHANCE, INVENTORY_SIZE, rollItem, rollRarity, salvageValue, type Item } from './items';
import { nextRandom } from './rng';
import { essenceFor } from './runes';
import { castOnCrit, castSkills, gainLight, tickSkills, unlockSkills, type SkillEvent } from './skills';
import { damageMult, fireTriggers, gearTriggers, heal, tickBuffs, type ProcEvent } from './triggers';
import type { GameState } from './state';
import { KILLS_PER_STAGE, elementalDamage, mitigate, stateStats, stageEnemy, upgradeCost, xpToNext } from './stats';

export type CombatEvent =
  | { type: 'hit'; target: 'hero' | 'enemy'; amount: number; crit: boolean }
  | { type: 'dodge' }
  /** Effetto a scatto: `amount` è il danno, la cura, lo scudo o la velocità in più. */
  | ProcEvent
  | SkillEvent
  /** Skill sbloccata salendo di livello (e messa in uno slot libero, se c'era). */
  | { type: 'unlock'; id: string }
  | { type: 'kill'; gold: number; xp: number; essence: number; boss: boolean }
  | { type: 'levelup'; level: number }
  | { type: 'death' }
  | { type: 'stage'; stage: number }
  /** Oggetto caduto; se `salvaged` è stato smantellato subito (filtro o inventario pieno). */
  | { type: 'drop'; item: Item; salvaged: boolean };

/** Frazione della riserva di sanguinamento (veloce) e di veleno (lento) inflitta a ogni tick. */
export const BLEED_RATE = 0.1;
export const POISON_RATE = 0.03;

/** Tick di pausa tra un nemico e il successivo (per l'animazione di morte). */
export const RESPAWN_TICKS = 6;

/** Un tick di simulazione. Puro e deterministico: stessi input → stessi risultati. */
export function step(state: GameState, events: CombatEvent[] = []): CombatEvent[] {
  state.tick++;
  const hero = stateStats(state);
  heal(state, hero, hero.regen / TICK_RATE);
  tickBuffs(state);
  tickSkills(state);

  if (!state.enemy) {
    if (state.respawn > 0) state.respawn--;
    else state.enemy = spawnEnemy(state);
    return events;
  }
  const enemy = state.enemy;
  const dmgMult = damageMult(hero, enemy);
  const triggers = gearTriggers(state.gear);

  // danni nel tempo: veleno fisso dagli oggetti + riserve di sanguinamento e veleno sul nemico
  const bleed = enemy.bleed > 0.5 ? enemy.bleed * BLEED_RATE : enemy.bleed;
  const poison = enemy.poison > 0.5 ? enemy.poison * POISON_RATE : enemy.poison;
  enemy.bleed -= bleed;
  if (!hero.rules.has('endlessPoison')) enemy.poison -= poison;
  enemy.hp -= bleed + poison + (hero.poison * dmgMult) / TICK_RATE;
  if (enemy.hp <= 0) return kill(state, events);

  state.hero.swing += hero.attackSpeed / TICK_RATE;
  if (state.hero.swing >= 1) {
    state.hero.swing -= 1;
    const crit = (nextRandom(state) < hero.critChance || state.hero.nextCrit) && !hero.rules.has('noCrit');
    state.hero.nextCrit = false;
    const mult = crit ? hero.critMult : 1;
    const physical = mitigate(hero.atk * mult, enemy.def) * dmgMult;
    const amount = physical + elementalDamage(hero) * mult * dmgMult;
    enemy.hp -= amount;
    enemy.bleed += physical * hero.bleed + (crit && hero.rules.has('critBleed') ? amount : 0);
    if (hero.lifeSteal > 0) heal(state, hero, amount * hero.lifeSteal);
    events.push({ type: 'hit', target: 'enemy', amount, crit });
    state.hero.hits++;
    gainLight(state);
    if (crit) {
      fireTriggers(state, hero, triggers, 'crit', events);
      castOnCrit(state, hero, events);
    }
    fireTriggers(state, hero, triggers, 'everyN', events);
    if (enemy.hp <= 0) return kill(state, events);
  }

  castSkills(state, hero, events);
  if (enemy.hp <= 0) return kill(state, events);

  enemy.swing += enemy.attackSpeed / TICK_RATE;
  if (enemy.swing >= 1) {
    enemy.swing -= 1;
    // si tira la schivata solo se serve: senza schivata la sequenza dell'RNG non cambia
    if (hero.dodge > 0 && nextRandom(state) < hero.dodge) {
      events.push({ type: 'dodge' });
      if (hero.rules.has('dodgeCrit')) state.hero.nextCrit = true;
      fireTriggers(state, hero, triggers, 'dodge', events);
      if (enemy.hp <= 0) kill(state, events);
      return events;
    }
    let amount = mitigate(enemy.atk, hero.def);
    const absorbed = Math.min(state.hero.shield, amount);
    state.hero.shield -= absorbed;
    amount -= absorbed;
    state.hero.hp -= amount;
    events.push({ type: 'hit', target: 'hero', amount, crit: false });
    if (state.hero.hp <= 0) {
      onDeath(state, events);
      return events;
    }
    enemy.hp -= hero.thorns * dmgMult;
    fireTriggers(state, hero, triggers, 'struck', events);
    if (enemy.hp <= 0) kill(state, events);
  }
  return events;
}

function kill(state: GameState, events: CombatEvent[]): CombatEvent[] {
  onKill(state, events);
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
    bleed: 0,
    poison: 0,
  };
}

function onKill(state: GameState, events: CombatEvent[]) {
  const boss = state.enemy!.boss;
  const base = stageEnemy(state.stage.current);
  const hero = stateStats(state);
  const mult = boss ? 5 : 1;
  const gold = base.gold * mult * hero.goldMult;
  const xp = base.xp * mult * hero.xpMult;
  const essence = essenceFor(state.stage.current, boss);
  state.gold += gold;
  state.essence += essence;
  state.totals.gold += gold;
  state.totals.kills++;
  state.enemy = null;
  state.respawn = RESPAWN_TICKS;
  state.hero.swing = 0;
  state.hero.hits = 0;
  events.push({ type: 'kill', gold, xp, essence, boss });
  fireTriggers(state, hero, gearTriggers(state.gear), 'kill', events);
  gainXp(state, xp, events);
  dropLoot(state, boss, events);

  if (boss) {
    state.stage.kills = 0;
    state.stage.current++;
    state.stage.best = Math.max(state.stage.best, state.stage.current);
    events.push({ type: 'stage', stage: state.stage.current });
  } else if (state.stage.auto || state.stage.kills < KILLS_PER_STAGE - 1) {
    state.stage.kills++;
  }
}

function dropLoot(state: GameState, boss: boolean, events: CombatEvent[]) {
  if (!boss && nextRandom(state) >= DROP_CHANCE) return;
  const gear = state.gear;
  const item = rollItem(state, gear.nextId++, state.stage.current, rollRarity(state, boss, stateStats(state).magicFind));
  const salvaged = item.rarity <= gear.autoSalvage || gear.inventory.length >= INVENTORY_SIZE;
  if (salvaged) state.fragments += salvageValue(item);
  else gear.inventory.push(item);
  events.push({ type: 'drop', item, salvaged });
}

/** Cambia l'equipaggiamento mantenendo la vita persa (non si cura né si muore cambiando oggetti). */
export function changeGear(state: GameState, change: () => boolean): boolean {
  const before = stateStats(state).maxHp;
  if (!change()) return false;
  const after = stateStats(state).maxHp;
  state.hero.hp = Math.max(1, Math.min(after, state.hero.hp + after - before));
  return true;
}

function gainXp(state: GameState, xp: number, events: CombatEvent[]) {
  state.hero.xp += xp;
  while (state.hero.xp >= xpToNext(state.hero.level)) {
    state.hero.xp -= xpToNext(state.hero.level);
    state.hero.level++;
    state.hero.hp = stateStats(state).maxHp;
    state.stage.auto = true; // più forte: si riprova ad avanzare
    for (const id of unlockSkills(state.skills, state.hero.level)) events.push({ type: 'unlock', id });
    events.push({ type: 'levelup', level: state.hero.level });
  }
}

function onDeath(state: GameState, events: CombatEvent[]) {
  state.totals.deaths++;
  const wasBoss = state.enemy?.boss;
  state.enemy = null;
  state.respawn = RESPAWN_TICKS * 2;
  state.hero.shield = 0;
  state.hero.hits = 0;
  state.hero.buffs = [];
  state.hero.nextCrit = false;
  state.hero.light = 0;
  state.hero.hp = stateStats(state).maxHp;
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
  const before = stateStats(state).maxHp;
  state.gold -= price;
  state.upgrades[id]++;
  const after = stateStats(state).maxHp;
  state.hero.hp += after - before;
  return true;
}
