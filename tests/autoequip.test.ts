import { describe, expect, it } from 'vitest';
import { RULE_WEIGHT, absorbInventory, equipBest, equipPower, gearPower, takeItem } from '../src/core/autoequip';
import { rollItem, salvageValue } from '../src/core/items';
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

describe('regole degli unici nel confronto', () => {
  it('ogni regola nuova vale +20%, ma non se una Via la dà già', () => {
    const s = newGame(0, 3);
    s.gear.equipped.secondaria = rollItem(rng(3), 950, 20, 4, undefined, false, 'albaGemella');
    expect(equipPower(s)).toBeCloseTo(gearPower(s) * (1 + RULE_WEIGHT));
    s.vie.main = 'lama'; // la Lama dell'Alba ha già «doubleStrike»
    expect(equipPower(s)).toBeCloseTo(gearPower(s));
  });

  it('un unico un po\' più debole si indossa lo stesso per la sua regola', () => {
    const s = newGame(0, 3);
    const plain = rollItem(rng(4), 960, 20, 4, 'secondaria');
    s.gear.equipped.secondaria = plain;
    const unique = rollItem(rng(5), 961, 20, 4, undefined, false, 'albaGemella');
    const pPlain = gearPower(s);
    s.gear.equipped.secondaria = unique;
    const pUnique = gearPower(s);
    s.gear.equipped.secondaria = plain;
    if (pUnique * (1 + RULE_WEIGHT) > pPlain) expect(takeItem(s, unique)).toBe('secondaria');
    else expect(takeItem(s, unique)).toBeUndefined();
  });
});

describe('bottino automatico', () => {
  it('indossa un oggetto che migliora, smantella il vecchio e non tiene inventario', () => {
    const s = newGame(0, 3);
    const first = rollItem(rng(5), 900, 10, 1, 'arma');
    expect(takeItem(s, first)).toBe('arma');
    expect(s.gear.equipped.arma).toBe(first);
    const better = rollItem(rng(6), 901, 60, 4, 'arma');
    const f0 = s.fragments;
    expect(takeItem(s, better)).toBe('arma');
    expect(s.gear.equipped.arma).toBe(better);
    expect(s.fragments).toBe(f0 + salvageValue(first));
    expect(s.gear.inventory).toHaveLength(0);
  });

  it('un oggetto peggiore diventa Frammenti', () => {
    const s = newGame(0, 4);
    takeItem(s, rollItem(rng(8), 910, 60, 4, 'arma'));
    const worse = rollItem(rng(9), 911, 1, 0, 'arma');
    const f0 = s.fragments;
    expect(takeItem(s, worse)).toBeUndefined();
    expect(s.fragments).toBe(f0 + salvageValue(worse));
    expect(s.gear.inventory).toHaveLength(0);
  });

  it('svuota l\'inventario dei vecchi salvataggi', () => {
    const s = newGame(0, 2);
    for (let i = 0; i < 20; i++) s.gear.inventory.push(rollItem(rng(i + 30), 300 + i, 10, i % 4));
    const p = gearPower(s);
    absorbInventory(s);
    expect(s.gear.inventory).toHaveLength(0);
    expect(gearPower(s)).toBeGreaterThan(p);
    expect(s.fragments).toBeGreaterThan(0);
  });
});
