import { describe, expect, it } from 'vitest';
import { MAX_TIER, autoCraft, upgradeAffix, upgradeCost } from '../src/core/craft';
import { rollItem, salvageValue, type Item } from '../src/core/items';
import { deserialize, serialize } from '../src/core/save';
import { STATE_VERSION, newGame } from '../src/core/state';
import { CRAFT_GROWTH, CRAFT_UPGRADE_COST } from '../src/data/craft';
import { AFFIX_TIERS, type ItemType } from '../src/data/items';

/** Primo oggetto normale (non unico, non di set) con questo seme di partenza. */
function plain(rarity: number, type: ItemType = 'arma', ilvl = 10, seed = 1): Item {
  for (let s = seed; ; s++) {
    const it = rollItem({ rng: s }, s, ilvl, rarity, type);
    if (!it.special) return it;
  }
}

/** Partita con l'oggetto indossato nell'arma. */
function game(it: Item, fragments = 1e9) {
  const state = newGame(0, 42);
  state.fragments = fragments;
  state.gear.equipped.arma = it;
  return state;
}

describe('crafting: aumento di tier', () => {
  it('il costo è valore × 2 × tier e cresce di ×1,5 a ogni modifica', () => {
    const it = plain(3);
    const state = game(it, 1e6);
    const c0 = upgradeCost(it, 0);
    expect(c0).toBe(Math.ceil(salvageValue(it) * CRAFT_UPGRADE_COST * it.affixes[0].tier));
    const t1 = it.affixes[1].tier;
    expect(upgradeAffix(state, it, 0)).toBe(true);
    expect(state.fragments).toBe(1e6 - c0);
    expect(upgradeCost(it, 1)).toBe(Math.ceil(salvageValue(it) * CRAFT_UPGRADE_COST * t1 * CRAFT_GROWTH));
  });

  it('senza Frammenti non succede nulla', () => {
    const it = plain(3);
    const state = game(it, 0);
    const copy = structuredClone(it);
    expect(upgradeAffix(state, it, 0)).toBe(false);
    expect(autoCraft(state)).toBe(0);
    expect(it).toEqual(copy);
  });

  it('alza il tier e scala i valori fino al massimo', () => {
    const it = plain(2);
    const state = game(it);
    const a = it.affixes[0];
    while (a.tier < MAX_TIER) {
      const t = a.tier;
      const v = a.mods[0].value;
      expect(upgradeAffix(state, it, 0)).toBe(true);
      const mult = (k: number) => AFFIX_TIERS.find((x) => x.tier === k)!.mult;
      expect(a.mods[0].value).toBeCloseTo((v * mult(t + 1)) / mult(t));
    }
    expect(upgradeAffix(state, it, 0)).toBe(false);
  });

  it('unici e pezzi di set non si modificano', () => {
    const it: Item = { ...plain(4), special: { kind: 'set', id: 'x', mods: [] } };
    const state = game(it);
    expect(upgradeAffix(state, it, 0)).toBe(false);
    expect(autoCraft(state)).toBe(0);
  });
});

describe('crafting automatico', () => {
  it('spende i Frammenti sempre nell’aumento più economico, finché bastano', () => {
    const it = plain(3);
    const state = game(it, 0);
    const cheapest = () => Math.min(...it.affixes.map((a, i) => (a.tier < MAX_TIER ? upgradeCost(it, i) : Infinity)));
    state.fragments = cheapest() - 1;
    expect(autoCraft(state)).toBe(0);
    state.fragments = cheapest() * 50;
    const done = autoCraft(state);
    expect(done).toBeGreaterThan(0);
    expect(it.crafts).toBe(done);
    expect(state.fragments).toBeLessThan(cheapest());
  });

  it('con Frammenti infiniti porta tutti gli affissi al tier massimo', () => {
    const it = plain(2);
    const state = game(it, 1e30);
    autoCraft(state);
    expect(it.affixes.every((a) => a.tier === MAX_TIER)).toBe(true);
  });

  it('si fa da solo durante il gioco', async () => {
    const { step } = await import('../src/core/combat');
    const it = plain(2);
    const state = game(it, 1e30);
    for (let i = 0; i < 10; i++) step(state);
    expect(it.crafts).toBeGreaterThan(0);
  });
});

describe('salvataggio v7', () => {
  it('un salvataggio v6 si carica e il contatore crafts resta opzionale', () => {
    const s = newGame(0);
    s.gear.inventory.push(plain(2));
    const v6 = serialize({ ...s, version: 6 });
    const loaded = deserialize(v6)!;
    expect(loaded.version).toBe(STATE_VERSION);
    expect(loaded.gear.equipped.arma?.crafts ?? loaded.gear.inventory[0]?.crafts).toBeUndefined();
  });
});
