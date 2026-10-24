import { newGear } from './items';
import { newRunes } from './runes';
import { newSkills } from './skills';
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
  // v4 → v5: effetti a scatto (scudo, buff, contatore colpi; sanguinamento e veleno sul nemico)
  4: (d) => ({
    ...d,
    hero: { ...(d.hero as object), shield: 0, hits: 0, buffs: [] },
    enemy: d.enemy ? { ...(d.enemy as object), bleed: 0, poison: 0 } : null,
  }),
  // v5 → v6: unici e set (campo opzionale sugli oggetti) e il critico garantito dopo una schivata
  5: (d) => ({ ...d, hero: { ...(d.hero as object), nextCrit: false } }),
  // v6 → v7: crafting (contatore `crafts` opzionale sugli oggetti, assente = 0): niente da convertire
  6: (d) => d,
  // v7 → v8: Luce e skill attive (le skill già sbloccate dal livello vanno negli slot)
  7: (d) => {
    const hero = d.hero as { level: number };
    return { ...d, hero: { ...hero, light: 0 }, skills: newSkills(hero.level) };
  },
  // v8 → v9: Essenza di Luce e rune
  8: (d) => ({ ...d, essence: 0, runes: newRunes() }),
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
  const numbers = ['tick', 'createdAt', 'lastSeen', 'rng', 'gold', 'fragments', 'essence', 'respawn'].every((k) => typeof d[k] === 'number');
  const objects = ['hero', 'upgrades', 'stage', 'totals', 'gear', 'skills', 'runes'].every((k) => d[k] && typeof d[k] === 'object');
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
