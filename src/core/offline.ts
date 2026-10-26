import { offlineEfficiency } from './ascension';
import { step, type CombatEvent } from './combat';
import { TICK_RATE } from './loop';
import { leaveMode } from './modes';
import type { GameState } from './state';

/** Sotto questa assenza non si calcola niente (ci pensa il ciclo normale). */
export const OFFLINE_MIN_S = 60;

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
  deaths: number;
  stageFrom: number;
  stageTo: number;
}

/** Una simulazione offline in corso: si porta avanti a blocchi con `runOffline`. */
export interface OfflineRun {
  report: OfflineReport;
  /** Tick di gioco da simulare (tempo passato × efficienza) e già simulati. */
  total: number;
  done: number;
  lastSeen0: number;
  level0: number;
}

/**
 * Progresso offline senza limite di tempo, simulato tick per tick come a gioco aperto: si avanza di stage,
 * si muore e si torna indietro, si sale di livello e si riprova. Il tempo simulato è quello passato × efficienza.
 */
export function startOffline(state: GameState, seconds: number): OfflineRun | null {
  if (seconds < OFFLINE_MIN_S) return null;
  // una modalità lasciata a metà si chiude: offline si gioca la Campagna
  leaveMode(state, []);
  const efficiency = offlineEfficiency(state.ascension);
  return {
    report: {
      seconds, efficiency, kills: 0, gold: 0, xp: 0, essence: 0, fragments: 0, keys: 0, levels: 0, items: 0,
      deaths: 0, stageFrom: state.stage.current, stageTo: state.stage.current,
    },
    total: Math.floor(seconds * TICK_RATE * efficiency),
    done: 0,
    lastSeen0: state.lastSeen,
    level0: state.hero.level,
  };
}

/** Simula fino a `ticks` tick; true quando la simulazione è finita. */
export function runOffline(state: GameState, run: OfflineRun, ticks: number): boolean {
  const r = run.report;
  const end = Math.min(run.total, run.done + ticks);
  const ev: CombatEvent[] = [];
  for (; run.done < end; run.done++) {
    ev.length = 0;
    const frag = state.fragments;
    step(state, ev);
    // i Frammenti si spendono da soli nel craft: si contano solo i guadagni
    if (state.fragments > frag) r.fragments += state.fragments - frag;
    for (const e of ev) {
      if (e.type === 'kill') { r.kills++; r.gold += e.gold; r.xp += e.xp; r.essence += e.essence; }
      else if (e.type === 'drop' && e.slot) r.items++;
      else if (e.type === 'death') r.deaths++;
      else if (e.type === 'key') r.keys++;
    }
  }
  // il tempo già simulato si considera "visto": un salvataggio a metà non lo farebbe contare due volte
  state.lastSeen = run.lastSeen0 + (run.done / (TICK_RATE * r.efficiency)) * 1000;
  r.stageTo = state.stage.current;
  r.levels = state.hero.level - run.level0;
  return run.done >= run.total;
}

/** Tutto in una volta (test e collaudo); il gioco usa `startOffline`/`runOffline` a blocchi. */
export function applyOffline(state: GameState, seconds: number): OfflineReport | null {
  const run = startOffline(state, seconds);
  if (!run) return null;
  runOffline(state, run, run.total);
  return run.report;
}
