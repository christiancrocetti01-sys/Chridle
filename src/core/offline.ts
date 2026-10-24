import { ELITE_CHANCE, ELITE_FROM_STAGE, ELITE_KEY_CHANCE } from '../data/enemies';
import { offlineEfficiency } from './ascension';
import { gainXp, step, type CombatEvent } from './combat';
import { INVENTORY_SIZE, rollItem, rollRarity, salvageValue } from './items';
import { TICK_RATE } from './loop';
import { leaveMode } from './modes';
import type { GameState } from './state';
import { KILLS_PER_STAGE, stateStats } from './stats';

/** Sotto questa assenza non si calcola niente (ci pensa il ciclo normale). */
export const OFFLINE_MIN_S = 60;
/** Tick simulati per stimare il ritmo (5 minuti di gioco). */
export const SAMPLE_TICKS = 3000;
/** Oggetti veri generati al massimo: il resto del bottino diventa Frammenti. */
export const OFFLINE_MAX_ITEMS = 30;

export interface OfflineReport {
  seconds: number;
  efficiency: number;
  kills: number;
  gold: number;
  xp: number;
  essence: number;
  fragments: number;
  keys: number;
  levels: number;
  items: number;
}

/**
 * Progresso offline senza limite di tempo, analitico: si simulano 5 minuti sullo stage attuale senza
 * avanzare (lo stage "sicuro"), si misura il ritmo e lo si moltiplica per il tempo passato × efficienza.
 */
export function applyOffline(state: GameState, seconds: number): OfflineReport | null {
  if (seconds < OFFLINE_MIN_S) return null;
  // una modalità lasciata a metà si chiude: offline si farma la Campagna
  leaveMode(state, []);
  const eff = offlineEfficiency(state.ascension);
  const sim: GameState = structuredClone(state);
  sim.stage.auto = false;
  sim.stage.kills = Math.min(sim.stage.kills, KILLS_PER_STAGE - 1);
  const ev: CombatEvent[] = [];
  const before = { gold: sim.gold, essence: sim.essence, kills: sim.totals.kills };
  let xp = 0;
  let drops = 0;
  for (let i = 0; i < SAMPLE_TICKS; i++) {
    const n = ev.length;
    step(sim, ev);
    // il campione non deve salire di livello o di stage: si conta l'esperienza e si annulla il resto
    for (let j = n; j < ev.length; j++) {
      const e = ev[j];
      if (e.type === 'kill') xp += e.xp;
      if (e.type === 'drop') drops++;
    }
    sim.stage.auto = false;
  }
  const factor = (seconds * TICK_RATE * eff) / SAMPLE_TICKS;
  const kills = Math.floor((sim.totals.kills - before.kills) * factor);
  const report: OfflineReport = {
    seconds, efficiency: eff, kills,
    gold: (sim.gold - before.gold) * factor,
    xp: xp * factor,
    essence: (sim.essence - before.essence) * factor,
    fragments: 0,
    keys: state.stage.current >= ELITE_FROM_STAGE ? Math.floor(kills * ELITE_CHANCE * ELITE_KEY_CHANCE) : 0,
    levels: 0,
    items: 0,
  };
  state.rng = sim.rng;
  state.gold += report.gold;
  state.totals.gold += report.gold;
  state.essence += report.essence;
  state.keys += report.keys;
  state.totals.kills += kills;

  // bottino: i primi oggetti veri (filtro e inventario come al solito), il resto in Frammenti alla loro media
  const totalDrops = Math.round(drops * factor);
  const real = Math.min(totalDrops, OFFLINE_MAX_ITEMS);
  const frag0 = state.fragments;
  const inv0 = state.gear.inventory.length;
  const mf = stateStats(state).magicFind;
  let value = 0;
  for (let i = 0; i < real; i++) {
    const item = rollItem(state, state.gear.nextId++, state.stage.current, rollRarity(state, false, mf));
    value += salvageValue(item);
    if (item.rarity <= state.gear.autoSalvage || state.gear.inventory.length >= INVENTORY_SIZE) state.fragments += salvageValue(item);
    else state.gear.inventory.push(item);
  }
  if (real) state.fragments += (value / real) * (totalDrops - real);
  report.fragments = state.fragments - frag0;
  report.items = state.gear.inventory.length - inv0;

  const lv = state.hero.level;
  gainXp(state, report.xp, []);
  report.levels = state.hero.level - lv;
  return report;
}

