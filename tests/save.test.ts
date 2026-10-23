import { describe, expect, it } from 'vitest';
import { SAVE_KEY, deserialize, loadGame, saveGame, serialize } from '../src/core/save';
import { newGame, step } from '../src/core/state';

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
    const v1 = JSON.stringify({ version: 1, ticks: 7, createdAt: 1, lastSeen: 2 });
    const migs = { 1: ({ ticks, ...rest }: Record<string, unknown>) => ({ ...rest, tick: ticks }) };
    expect(deserialize(v1, migs, 2)).toEqual({ version: 2, tick: 7, createdAt: 1, lastSeen: 2 });
  });

  it('versione sconosciuta o futura → null', () => {
    expect(deserialize(serialize({ ...newGame(0), version: 99 }))).toBeNull();
  });
});
