import { describe, expect, it } from 'vitest';
import { SAVE_KEY, deserialize, loadGame, saveGame, serialize } from '../src/core/save';
import { step } from '../src/core/combat';
import { STATE_VERSION, newGame } from '../src/core/state';

function memoryStorage() {
  const m = new Map<string, string>();
  return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

describe('salvataggio', () => {
  it('salva e ricarica lo stesso stato', () => {
    const storage = memoryStorage();
    const state = newGame(1000);
    step(state);
    step(state);
    saveGame(storage, state, 5000);
    expect(loadGame(storage)).toEqual({ ...state, lastSeen: 5000 });
  });

  it('nessun salvataggio → null', () => {
    expect(loadGame(memoryStorage())).toBeNull();
  });

  it('salvataggio corrotto → null e copia di backup', () => {
    const storage = memoryStorage();
    storage.setItem(SAVE_KEY, '{non json');
    expect(loadGame(storage)).toBeNull();
    expect(storage.m.get(`${SAVE_KEY}.corrotto`)).toBe('{non json');
  });

  it('applica le migrazioni in ordine fino alla versione corrente', () => {
    const { tick, ...rest } = newGame(0);
    const v1 = JSON.stringify({ ...rest, version: 1, ticks: 7 });
    const migs = {
      1: ({ ticks, ...r }: Record<string, unknown>) => ({ ...r, tick: ticks }),
      2: (r: Record<string, unknown>) => ({ ...r, gold: 99 }),
    };
    expect(deserialize(v1, migs, 3)).toEqual({ ...rest, version: 3, tick: 7, gold: 99 });
    expect(tick).toBe(0);
  });

  it('migra un vero salvataggio v1 mantenendo il tempo di gioco', () => {
    const v1 = JSON.stringify({ version: 1, tick: 500, createdAt: 10, lastSeen: 20 });
    const s = deserialize(v1)!;
    expect(s.version).toBe(STATE_VERSION);
    expect(s.tick).toBe(500);
    expect(s.hero.level).toBe(1);
  });

  it('versione sconosciuta o futura → null', () => {
    expect(deserialize(serialize({ ...newGame(0), version: 99 }))).toBeNull();
  });
});
