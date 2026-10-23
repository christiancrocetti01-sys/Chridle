export interface GameState {
  /** Versione dello schema del salvataggio. */
  version: number;
  /** Tick di logica eseguiti dall'inizio della partita. */
  tick: number;
  createdAt: number;
  /** Ultimo istante (ms epoch) in cui il gioco era aperto: base per il progresso offline. */
  lastSeen: number;
}

export const STATE_VERSION = 1;

export function newGame(now: number): GameState {
  return { version: STATE_VERSION, tick: 0, createdAt: now, lastSeen: now };
}

/** Un tick di simulazione. Deve restare puro e deterministico. */
export function step(state: GameState): void {
  state.tick++;
}
