import { ELITE_DROP, ELITE_KEY_CHANCE, ELITE_REWARD, VAMPIRIC_SHARE, ZONE_KEY_EVERY } from '../data/enemies';
import { UPGRADES, type UpgradeId } from '../data/upgrades';
import { discover } from './collection';
import { TICK_RATE } from './loop';
import { SANCTITY_SECONDS } from '../data/corruption';
import { DROP_CHANCE, INVENTORY_SIZE, rollItem, rollRarity, salvageValue, type Item } from './items';
import { nextRandom } from './rng';
import { essenceFor } from './runes';
import { castOnCrit, castSkills, gainLight, tickSkills, unlockSkills, type SkillEvent } from './skills';
import { damageMult, fireTriggers, gearTriggers, heal, tickBuffs, type ActiveTrigger, type ProcEvent } from './triggers';
import { BURNING_SHARE, DOUBLE_STRIKE_CHANCE, REFLECT_SHARE, SPIRIT_ATK } from '../data/vie';
import type { GameState } from './state';
import { activeVie } from './vie';
import { perkValue } from './ascension';
import { elementalVs, enemyAtk, resMult, spawnEnemy, tickEnemy, type MechanicEvent } from './enemies';
import { onModeDeath, onModeKill, tickMode, type ModeEvent } from './modes';
import { TOWER_BASE, TOWER_STEP } from '../data/modes';
import { DOT_DOUBLE, KILLS_PER_STAGE, mitigate, stateStats, stageEnemy, upgradeCost, xpToNext, type Stats } from './stats';

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
  | { type: 'drop'; item: Item; salvaged: boolean; discovered?: boolean }
  | { type: 'key'; keys: number }
  | MechanicEvent
  | ModeEvent;

/** Frazione della riserva di sanguinamento (veloce) e di veleno (lento) inflitta a ogni tick. */
export const BLEED_RATE = 0.1;
export const POISON_RATE = 0.03;

/** Tick di pausa tra un nemico e il successivo (per l'animazione di morte). */
export const RESPAWN_TICKS = 6;

/** Un tick di simulazione. Puro e deterministico: stessi input → stessi risultati. */
export function step(state: GameState, events: CombatEvent[] = []): CombatEvent[] {
  state.tick++;
  const hero = stateStats(state);
  const m = state.mode;
  if (!(m.kind === 'dungeon' && m.mods.includes('tenebra'))) heal(state, hero, hero.regen / TICK_RATE);
  tickBuffs(state);
  if (state.hero.sanctity > 0) state.hero.sanctity--;
  tickSkills(state);
  tickMode(state, events);

  if (!state.enemy) {
    if (state.respawn > 0) state.respawn--;
    else state.enemy = spawnEnemy(state);
    return events;
  }
  const enemy = state.enemy;
  const dmgMult = damageMult(hero, enemy);
  const triggers = gearTriggers(state.gear);
  const summon = tickEnemy(enemy, state.mode.kind === 'raid', events);
  if (summon > 0 && hitHero(state, hero, summon, events)) return events;

  // danni nel tempo: veleno fisso dagli oggetti + riserve di sanguinamento e veleno sul nemico
  const bleed = enemy.bleed > 0.5 ? enemy.bleed * BLEED_RATE : enemy.bleed;
  const poison = enemy.poison > 0.5 ? enemy.poison * POISON_RATE : enemy.poison;
  enemy.bleed -= bleed;
  if (!hero.rules.has('endlessPoison')) enemy.poison -= poison;
  enemy.hp -= (bleed + poison + (hero.poison * dmgMult) / TICK_RATE) * (hero.rules.has('dotDouble') ? DOT_DOUBLE : 1);
  if (enemy.hp <= 0) return kill(state, events);

  // Custode Stellare (e Costellazione Vivente): gli spiriti colpiscono una volta al secondo
  const spirits = (hero.rules.has('starSpirit') ? 1 : 0) + (hero.rules.has('spiritHost') ? 2 : 0);
  if (spirits && state.tick % TICK_RATE === 0) {
    enemy.hp -= spirits * hero.atk * SPIRIT_ATK * hero.elemMult.holy * resMult(enemy, 'holy') * dmgMult;
    if (enemy.hp <= 0) return kill(state, events);
  }

  state.hero.swing += hero.attackSpeed / TICK_RATE;
  if (state.hero.swing >= 1) {
    state.hero.swing -= 1;
    strike(state, hero, dmgMult, triggers, events);
    if (enemy.hp <= 0) return kill(state, events);
    // Mille Soli: ogni attacco colpisce due volte
    if (hero.rules.has('twinStrike')) {
      strike(state, hero, dmgMult, triggers, events);
      if (enemy.hp <= 0) return kill(state, events);
    }
    // Lama dell'Alba: si tira il colpo doppio solo con la regola (la sequenza dell'RNG non cambia)
    if (hero.rules.has('doubleStrike') && nextRandom(state) < DOUBLE_STRIKE_CHANCE) {
      strike(state, hero, dmgMult, triggers, events);
      if (enemy.hp <= 0) return kill(state, events);
    }
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
    if (hitHero(state, hero, enemyAtk(enemy), events)) return events;
    enemy.hp -= hero.thorns * dmgMult;
    fireTriggers(state, hero, triggers, 'struck', events);
    if (enemy.hp <= 0) kill(state, events);
  }
  return events;
}

/** Un attacco dell'eroe: critico, danno fisico ed elementale, sanguinamento, rubavita, Luce ed effetti a scatto. */
function strike(state: GameState, hero: Stats, dmgMult: number, triggers: ActiveTrigger[], events: CombatEvent[]) {
  const enemy = state.enemy!;
  const crit = (nextRandom(state) < hero.critChance || state.hero.nextCrit) && !hero.rules.has('noCrit');
  state.hero.nextCrit = false;
  const mult = crit ? hero.critMult : 1;
  const physical = mitigate(hero.atk * mult, enemy.def) * resMult(enemy, 'physical') * dmgMult;
  const amount = physical + elementalVs(hero, enemy) * mult * dmgMult;
  enemy.hp -= amount;
  enemy.bleed += physical * hero.bleed + (crit && hero.rules.has('critBleed') ? amount : 0);
  if (hero.rules.has('burningHits')) enemy.poison += amount * BURNING_SHARE;
  if (hero.lifeSteal > 0) heal(state, hero, amount * hero.lifeSteal);
  events.push({ type: 'hit', target: 'enemy', amount, crit });
  state.hero.hits++;
  gainLight(state);
  if (crit) {
    fireTriggers(state, hero, triggers, 'crit', events);
    castOnCrit(state, hero, events);
  }
  fireTriggers(state, hero, triggers, 'everyN', events);
}

function kill(state: GameState, events: CombatEvent[]): CombatEvent[] {
  onKill(state, events);
  return events;
}

/** L'eroe subisce un colpo (difesa, riflesso, scudo, vampirismo). Restituisce true se muore. */
function hitHero(state: GameState, hero: Stats, raw: number, events: CombatEvent[]): boolean {
  const enemy = state.enemy!;
  let amount = mitigate(raw, hero.def);
  if (hero.rules.has('reflect')) enemy.hp -= amount * REFLECT_SHARE * damageMult(hero, enemy);
  for (const b of state.hero.buffs) if (b.reflect) enemy.hp -= amount * b.reflect * damageMult(hero, enemy);
  const absorbed = Math.min(state.hero.shield, amount);
  state.hero.shield -= absorbed;
  amount -= absorbed;
  // Santità: un colpo mortale lascia a 1 di vita, poi si ricarica
  if (hero.rules.has('sanctity') && state.hero.sanctity <= 0 && state.hero.hp - amount <= 0) {
    amount = Math.max(0, state.hero.hp - 1);
    state.hero.sanctity = SANCTITY_SECONDS * TICK_RATE;
  }
  state.hero.hp -= amount;
  if (enemy.elite === 'vampirico') enemy.hp = Math.min(enemy.maxHp, enemy.hp + amount * VAMPIRIC_SHARE);
  events.push({ type: 'hit', target: 'hero', amount, crit: false });
  if (state.hero.hp > 0) return false;
  onDeath(state, events);
  return true;
}

/** Stage che determina ricompense e livello oggetto: quello della modalità in corso. */
export function rewardStage(state: GameState): number {
  const m = state.mode;
  return m.kind === 'campaign' ? state.stage.current : m.kind === 'tower' ? TOWER_BASE + m.floor * TOWER_STEP : m.level;
}

function onKill(state: GameState, events: CombatEvent[]) {
  const enemy = state.enemy!;
  const { boss, elite, zoneBoss } = enemy;
  const stage = rewardStage(state);
  const base = stageEnemy(stage);
  const hero = stateStats(state);
  const raid = state.mode.kind === 'raid';
  const mult = raid ? 20 : zoneBoss ? 10 : boss ? 5 : elite ? ELITE_REWARD : 1;
  const gold = base.gold * mult * hero.goldMult;
  const xp = base.xp * mult * hero.xpMult;
  const essence = essenceFor(stage, boss) * (elite ? ELITE_REWARD : 1) * (1 + perkValue(state.ascension, 'essenza'))
    * (1 + (enemy.harvest ?? 0));
  state.gold += gold;
  state.essence += essence;
  state.totals.gold += gold;
  state.totals.kills++;
  state.codex[enemy.family]++;
  state.enemy = null;
  state.respawn = RESPAWN_TICKS;
  state.hero.swing = 0;
  state.hero.hits = 0;
  events.push({ type: 'kill', gold, xp, essence, boss });
  fireTriggers(state, hero, gearTriggers(state.gear), 'kill', events);
  gainXp(state, xp, events);
  if (!raid) dropLoot(state, stage, boss, !!elite, events);

  if (state.mode.kind !== 'campaign') {
    onModeKill(state, events);
    return;
  }
  // chiavi: dal boss di zona ogni due zone e solo al record (non ribattendolo dopo una morte), dalle élite a volte
  const newRecord = state.stage.current >= state.stage.best;
  if ((zoneBoss && newRecord && state.stage.current % ZONE_KEY_EVERY === 0) || (elite && nextRandom(state) < ELITE_KEY_CHANCE)) {
    state.keys++;
    events.push({ type: 'key', keys: state.keys });
  }
  if (boss) {
    state.stage.kills = 0;
    state.stage.current++;
    state.stage.best = Math.max(state.stage.best, state.stage.current);
    events.push({ type: 'stage', stage: state.stage.current });
  } else if (state.stage.auto || state.stage.kills < KILLS_PER_STAGE - 1) {
    state.stage.kills++;
  }
}

function dropLoot(state: GameState, stage: number, boss: boolean, elite: boolean, events: CombatEvent[]) {
  if (!boss && nextRandom(state) >= (elite ? ELITE_DROP : DROP_CHANCE)) return;
  const gear = state.gear;
  const item = rollItem(state, gear.nextId++, stage, rollRarity(state, boss, stateStats(state).magicFind));
  const salvaged = item.rarity <= gear.autoSalvage || gear.inventory.length >= INVENTORY_SIZE;
  if (salvaged) state.fragments += salvageValue(item);
  else gear.inventory.push(item);
  events.push({ type: 'drop', item, salvaged, discovered: discover(state, item) });
}

/** Cambia l'equipaggiamento mantenendo la vita persa (non si cura né si muore cambiando oggetti). */
export function changeGear(state: GameState, change: () => boolean): boolean {
  const before = stateStats(state).maxHp;
  if (!change()) return false;
  const after = stateStats(state).maxHp;
  state.hero.hp = Math.max(1, Math.min(after, state.hero.hp + after - before));
  return true;
}

export function gainXp(state: GameState, xp: number, events: CombatEvent[]) {
  state.hero.xp += xp;
  while (state.hero.xp >= xpToNext(state.hero.level)) {
    state.hero.xp -= xpToNext(state.hero.level);
    state.hero.level++;
    state.hero.hp = stateStats(state).maxHp;
    state.stage.auto = true; // più forte: si riprova ad avanzare
    for (const id of unlockSkills(state.skills, state.hero.level, activeVie(state.vie))) events.push({ type: 'unlock', id });
    events.push({ type: 'levelup', level: state.hero.level });
  }
}

function onDeath(state: GameState, events: CombatEvent[]) {
  state.totals.deaths++;
  const wasBoss = state.enemy?.boss;
  const inMode = state.mode.kind !== 'campaign';
  state.enemy = null;
  state.respawn = RESPAWN_TICKS * 2;
  state.hero.shield = 0;
  state.hero.hits = 0;
  state.hero.buffs = [];
  state.hero.nextCrit = false;
  state.hero.light = 0;
  state.hero.hp = stateStats(state).maxHp;
  state.hero.swing = 0;
  if (inMode) {
    onModeDeath(state, events);
    events.push({ type: 'death' });
    return;
  }
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
