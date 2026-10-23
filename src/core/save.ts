import { STATE_VERSION, type GameState } from './state';

export const SAVE_KEY = 'chridle.save';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

type Migration = (data: Record<string, unknown>) => Record<string, unknown>;

/** migrations[n] porta un salvataggio dalla versione n alla n+1. */
export const migrations: Record<number, Migration> = {};

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

export function deserialize(raw: string, migs = migrations, target = STATE_VERSION): GameState | null {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object' || typeof data.version !== 'number') return null;
  while ((data.version as number) < target) {
    const migrate = migs[data.version as number];
    if (!migrate) return null;
    data = { ...migrate(data), version: (data.version as number) + 1 };
  }
  if (data.version !== target) return null;
  return isGameState(data) ? data : null;
}

function isGameState(d: Record<string, unknown>): d is Record<string, unknown> & GameState {
  return ['tick', 'createdAt', 'lastSeen'].every((k) => typeof d[k] === 'number');
}

export function saveGame(storage: StorageLike, state: GameState, now: number): void {
  state.lastSeen = now;
  storage.setItem(SAVE_KEY, serialize(state));
}

/** Se il salvataggio è illeggibile lo mette da parte invece di sovrascriverlo. */
export function loadGame(storage: StorageLike): GameState | null {
  const raw = storage.getItem(SAVE_KEY);
  if (!raw) return null;
  const state = deserialize(raw);
  if (!state) storage.setItem(`${SAVE_KEY}.corrotto`, raw);
  return state;
}
