import { RARITIES } from '../data/items';
import {
  DUNGEON_ESSENCE, DUNGEON_FRAGMENTS, DUNGEON_WAVES, DUNGEON_LEVEL_OFFSET, DUNGEON_MODS, DUNGEON_MODS_COUNT, RAID_BOSSES, RAID_DIVINE,
  RAID_KEYS, RAID_MIN_RARITY, RAID_MYTHIC, RAID_SECONDS, RAID_STAGE, TOWER_BONUS, TOWER_ESSENCE, TOWER_MILESTONE, TOWER_SECONDS,
  type DungeonModId,
} from '../data/modes';
import { INVENTORY_SIZE, rollItem, rollRarity, salvageValue, type Item } from './items';
import { TICK_RATE } from './loop';
import { nextRandom } from './rng';
import type { GameState } from './state';
import { stateStats } from './stats';

export type ModeEvent =
  /** Fine di una modalità: `ok` = completata (o, per la Torre, nuovo piano raggiunto prima di cadere). */
  | { type: 'mode'; text: string; ok: boolean }
  | { type: 'drop'; item: Item; salvaged: boolean };

type Events = { push(e: ModeEvent): void };

export const dungeonLevel = (state: GameState) => Math.max(1, state.stage.best - DUNGEON_LEVEL_OFFSET);
export const canRaid = (state: GameState) => state.stage.best >= RAID_STAGE && state.keys >= RAID_KEYS && state.mode.kind === 'campaign';
export const towerMilestones = (best: number) => Math.floor(best / TOWER_MILESTONE);
/** Bonus permanente della Torre (attacco e vita in %). */
export const towerBonus = (best: number) => towerMilestones(best) * TOWER_BONUS;

/** Cambiando modalità il nemico corrente sparisce (in Campagna si riprende dallo stesso punto dello stage). */
function switchTo(state: GameState, mode: GameState['mode']) {
  state.mode = mode;
  state.enemy = null;
  state.respawn = 0;
  state.hero.swing = 0;
  state.hero.hits = 0;
  // si entra (e si esce) in forze: la vita si ripristina
  state.hero.hp = stateStats(state).maxHp;
}

/** Entra in un Dungeon consumando una chiave: 2 modificatori casuali, 8 nemici e il boss. */
export function enterDungeon(state: GameState): boolean {
  if (state.keys < 1 || state.mode.kind !== 'campaign') return false;
  state.keys--;
  const pool = DUNGEON_MODS.map((m) => m.id);
  const mods: DungeonModId[] = [];
  while (mods.length < DUNGEON_MODS_COUNT) mods.push(pool.splice(Math.floor(nextRandom(state) * pool.length), 1)[0]);
  switchTo(state, { kind: 'dungeon', level: dungeonLevel(state), wave: 0, mods });
  return true;
}

export function enterTower(state: GameState): boolean {
  if (state.mode.kind !== 'campaign') return false;
  switchTo(state, { kind: 'tower', floor: 1, ticksLeft: TOWER_SECONDS * TICK_RATE });
  return true;
}

export function enterRaid(state: GameState): boolean {
  if (!canRaid(state)) return false;
  state.keys -= RAID_KEYS;
  const name = RAID_BOSSES[Math.floor(nextRandom(state) * RAID_BOSSES.length)];
  switchTo(state, { kind: 'raid', level: state.stage.best, ticksLeft: RAID_SECONDS * TICK_RATE, name });
  return true;
}

/** Torna alla Campagna (abbandono, sconfitta o fine). */
export function leaveMode(state: GameState, events: Events, text?: string, ok = false) {
  if (state.mode.kind === 'campaign') return;
  if (text) events.push({ type: 'mode', text, ok });
  switchTo(state, { kind: 'campaign' });
  state.respawn = 10;
}

export const dungeonReward = (mods: DungeonModId[]) => 1 + mods.reduce((s, id) => s + DUNGEON_MODS.find((m) => m.id === id)!.reward, 0);

function giveItem(state: GameState, item: Item, events: Events) {
  const salvaged = state.gear.inventory.length >= INVENTORY_SIZE;
  if (salvaged) state.fragments += salvageValue(item);
  else state.gear.inventory.push(item);
  events.push({ type: 'drop', item, salvaged });
}

/**
 * Gestisce un'uccisione fuori dalla Campagna. Restituisce true se la modalità continua.
 * Le ricompense normali (oro, XP, Essenza, bottino) le dà già chi chiama.
 */
export function onModeKill(state: GameState, events: Events): boolean {
  const m = state.mode;
  if (m.kind === 'dungeon') {
    if (m.wave++ < DUNGEON_WAVES) return true;
    const mult = dungeonReward(m.mods);
    state.fragments += Math.round(DUNGEON_FRAGMENTS * m.level * mult);
    state.essence += Math.round(DUNGEON_ESSENCE * m.level * mult);
    // un pezzo di set garantito (almeno Epico)
    const rarity = Math.max(3, rollRarity(state, true, stateStats(state).magicFind));
    giveItem(state, rollItem(state, state.gear.nextId++, m.level, rarity, undefined, true), events);
    state.totals.dungeons++;
    leaveMode(state, events, `Dungeon completato: +${Math.round(DUNGEON_FRAGMENTS * m.level * mult)} Frammenti, +${Math.round(DUNGEON_ESSENCE * m.level * mult)} Essenza e un pezzo di set`, true);
    return false;
  }
  if (m.kind === 'tower') {
    state.essence += TOWER_ESSENCE * m.floor;
    if (m.floor > state.tower.best) {
      const before = towerMilestones(state.tower.best);
      state.tower.best = m.floor;
      if (towerMilestones(m.floor) > before) events.push({ type: 'mode', text: `Traguardo della Torre: piano ${m.floor}, bonus permanente +${Math.round(towerBonus(m.floor) * 100)}%`, ok: true });
    }
    m.floor++;
    m.ticksLeft = TOWER_SECONDS * TICK_RATE;
    return true;
  }
  if (m.kind === 'raid') {
    const r = nextRandom(state);
    const rarity = r < RAID_DIVINE ? 6 : r < RAID_DIVINE + RAID_MYTHIC ? 5 : RAID_MIN_RARITY;
    giveItem(state, rollItem(state, state.gear.nextId++, m.level, rarity), events);
    state.totals.raids++;
    leaveMode(state, events, `Raid vinto! Bottino ${RARITIES[rarity].name}`, true);
    return false;
  }
  return true;
}

/** Timer di Torre e Raid (solo mentre c'è un nemico). */
export function tickMode(state: GameState, events: Events) {
  const m = state.mode;
  if ((m.kind !== 'tower' && m.kind !== 'raid') || !state.enemy) return;
  if (--m.ticksLeft > 0) return;
  if (m.kind === 'tower') leaveMode(state, events, `Tempo scaduto al piano ${m.floor} della Torre (record ${state.tower.best})`);
  else leaveMode(state, events, 'Tempo scaduto: il boss del Raid è fuggito');
}

/** Sconfitta fuori dalla Campagna: si torna alla Campagna senza perdere stage. */
export function onModeDeath(state: GameState, events: Events) {
  const m = state.mode;
  const text = m.kind === 'dungeon' ? 'Caduto nel Dungeon: la chiave è persa'
    : m.kind === 'tower' ? `Caduto al piano ${m.floor} della Torre (record ${state.tower.best})`
    : 'Caduto nel Raid';
  leaveMode(state, events, text);
}
