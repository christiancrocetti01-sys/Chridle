import { newGear } from './items';
import { STATE_VERSION, newGame, type GameState } from './state';

export const SAVE_KEY = 'chridle.save';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

type Migration = (data: Record<string, unknown>) => Record<string, unknown>;

/** migrations[n] porta un salvataggio dalla versione n alla n+1. */
export const migrations: Record<number, Migration> = {
  // v1 → v2: arrivano combattimento, livelli e oro; si conserva il tempo di gioco
  1: (d) => ({ ...newGame(d.createdAt as number), tick: d.tick, lastSeen: d.lastSeen }),
  // v2 → v3: arriva l'equipaggiamento
  2: (d) => ({ ...d, fragments: 0, gear: newGear() }),
  // v3 → v4: gli affissi possono avere più statistiche ({ stat, value } → mods)
  3: (d) => {
    type OldAffix = { id: string; tier: number; stat: string; value: number };
    type OldItem = { affixes: OldAffix[] };
    const item = (it: OldItem) => ({
      ...it,
      affixes: it.affixes.map(({ id, tier, stat, value }) => ({ id, tier, mods: [{ stat, value }] })),
    });
    const gear = d.gear as { equipped: Record<string, OldItem>; inventory: OldItem[] };
    return {
      ...d,
      gear: {
        ...gear,
        equipped: Object.fromEntries(Object.entries(gear.equipped).map(([slot, it]) => [slot, item(it)])),
        inventory: gear.inventory.map(item),
      },
    };
  },
};

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
  const numbers = ['tick', 'createdAt', 'lastSeen', 'rng', 'gold', 'fragments', 'respawn'].every((k) => typeof d[k] === 'number');
  const objects = ['hero', 'upgrades', 'stage', 'totals', 'gear'].every((k) => d[k] && typeof d[k] === 'object');
  return numbers && objects;
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
