import { describe, expect, it } from 'vitest';
import { equipBest, gearPower } from '../src/core/autoequip';
import { rollItem } from '../src/core/items';
import { newGame } from '../src/core/state';

const rng = (seed: number) => ({ rng: seed });

describe('equip automatico', () => {
  it('indossa gli oggetti che aumentano la potenza e non peggiora mai', () => {
    const s = newGame(0, 5);
    for (let i = 0; i < 60; i++) s.gear.inventory.push(rollItem(rng(i + 1), 100 + i, 20, i % 5));
    const before = gearPower(s);
    const n = equipBest(s);
    expect(n).toBeGreaterThan(0);
    expect(gearPower(s)).toBeGreaterThan(before);
    // nessun oggetto perso o duplicato
    const uids = [...s.gear.inventory, ...Object.values(s.gear.equipped)].map((x) => x!.uid);
    expect(new Set(uids).size).toBe(60);
    expect(uids).toHaveLength(60);
  });

  it('una seconda volta non cambia niente, e nessun oggetto singolo migliora ancora', () => {
    const s = newGame(0, 6);
    for (let i = 0; i < 40; i++) s.gear.inventory.push(rollItem(rng(i + 7), 200 + i, 15, i % 4));
    equipBest(s);
    const p = gearPower(s);
    expect(equipBest(s)).toBe(0);
    expect(gearPower(s)).toBe(p);
  });

  it('con l\'inventario vuoto non fa nulla', () => {
    const s = newGame(0, 1);
    expect(equipBest(s)).toBe(0);
  });
});
