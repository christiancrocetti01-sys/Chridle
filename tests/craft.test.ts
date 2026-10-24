import { describe, expect, it } from 'vitest';
import {
  MAX_TIER, canTransfer, fuseCost, fuseItems, fusePartners, rerollAffix, rerollCost, transferAffix, upgradeAffix,
  upgradeCost,
} from '../src/core/craft';
import { equip, itemGrowth, rollItem, salvageValue, type Item } from '../src/core/items';
import { deserialize, serialize } from '../src/core/save';
import { STATE_VERSION, newGame } from '../src/core/state';
import { CRAFT_GROWTH, FUSE_COUNT } from '../src/data/craft';
import { AFFIX_TIERS, type ItemType } from '../src/data/items';

/** Primo oggetto normale (non unico, non di set) con questo seme di partenza. */
function plain(rarity: number, type: ItemType = 'arma', ilvl = 10, seed = 1): Item {
  for (let s = seed; ; s++) {
    const it = rollItem({ rng: s }, s, ilvl, rarity, type);
    if (!it.special) return it;
  }
}

function game(items: Item[], fragments = 1e9) {
  const state = newGame(0, 42);
  state.fragments = fragments;
  state.gear.inventory.push(...items);
  state.gear.nextId = 10_000;
  return state;
}

describe('crafting: ritira e migliora', () => {
  it('ritirare cambia l’affisso senza doppioni e mantiene il genere (normale/a scatto)', () => {
    const it = plain(4);
    const state = game([it]);
    const before = it.affixes.map((a) => a.id);
    for (let n = 0; n < 20; n++) {
      const i = n % it.affixes.length;
      const wasTrigger = !!it.affixes[i].power;
      expect(rerollAffix(state, it.uid, i)).toBe(true);
      expect(!!it.affixes[i].power).toBe(wasTrigger);
      expect(new Set(it.affixes.map((a) => a.id)).size).toBe(it.affixes.length);
    }
    expect(it.affixes.map((a) => a.id)).not.toEqual(before);
    expect(it.crafts).toBe(20);
  });

  it('il costo cresce di ×1,5 a ogni modifica e i Frammenti vengono scalati', () => {
    const it = plain(3);
    const state = game([it], 1000);
    const c0 = rerollCost(it);
    expect(c0).toBe(salvageValue(it));
    rerollAffix(state, it.uid, 0);
    expect(state.fragments).toBe(1000 - c0);
    expect(rerollCost(it)).toBe(Math.ceil(salvageValue(it) * CRAFT_GROWTH));
  });

  it('senza Frammenti non succede nulla', () => {
    const it = plain(3);
    const state = game([it], 0);
    const copy = structuredClone(it);
    expect(rerollAffix(state, it.uid, 0)).toBe(false);
    expect(upgradeAffix(state, it.uid, 0)).toBe(false);
    expect(it).toEqual(copy);
  });

  it('migliorare alza il tier e scala i valori fino al massimo', () => {
    const it = plain(2);
    const state = game([it]);
    const a = it.affixes[0];
    while (a.tier < MAX_TIER) {
      const t = a.tier;
      const v = a.mods[0].value;
      const c = upgradeCost(it, 0);
      const f = state.fragments;
      expect(upgradeAffix(state, it.uid, 0)).toBe(true);
      expect(state.fragments).toBe(f - c);
      const mult = (k: number) => AFFIX_TIERS.find((x) => x.tier === k)!.mult;
      expect(a.mods[0].value).toBeCloseTo((v * mult(t + 1)) / mult(t));
    }
    expect(upgradeAffix(state, it.uid, 0)).toBe(false);
  });

  it('funziona anche sugli oggetti indossati', () => {
    const it = plain(2);
    const state = game([it]);
    equip(state.gear, it.uid);
    expect(rerollAffix(state, it.uid, 0)).toBe(true);
  });

  it('unici e pezzi di set non si modificano', () => {
    const it: Item = { ...plain(4), special: { kind: 'set', id: 'x', mods: [] } };
    const state = game([it]);
    expect(rerollAffix(state, it.uid, 0)).toBe(false);
    expect(upgradeAffix(state, it.uid, 0)).toBe(false);
  });
});

describe('crafting: trasferisci', () => {
  it('copia l’affisso del donatore, adatta le piatte al livello e distrugge il donatore', () => {
    const target = plain(2, 'arma', 20, 1);
    let donor = plain(2, 'arma', 5, 100);
    for (let s = 200; donor.affixes.some((a) => target.affixes.some((b) => b.id === a.id)); s++) donor = plain(2, 'arma', 5, s);
    const state = game([target, donor]);
    const a = donor.affixes[0];
    expect(transferAffix(state, target.uid, 1, donor.uid, 0)).toBe(true);
    expect(target.affixes[1].id).toBe(a.id);
    expect(target.affixes[1].tier).toBe(a.tier);
    const k = itemGrowth(20) / itemGrowth(5);
    target.affixes[1].mods.forEach((m, n) => {
      const flat = ['atk', 'def', 'hp', 'fire', 'cold', 'lightning', 'holy', 'shadow', 'poison', 'thorns'].includes(m.stat);
      expect(m.value).toBeCloseTo(a.mods[n].value * (flat ? k : 1));
    });
    expect(state.gear.inventory).not.toContain(donor);
    expect(target.crafts).toBe(1);
  });

  it('rifiuta tipo diverso, doppioni e un secondo effetto a scatto', () => {
    const target = plain(2, 'arma');
    const ring = plain(2, 'anello');
    const state = game([target, ring]);
    expect(canTransfer(state, target, 0, ring, 0)).toBe(false);
    const twin = { ...structuredClone(target), uid: 999 };
    state.gear.inventory.push(twin);
    expect(canTransfer(state, target, 0, twin, 1)).toBe(false); // affisso già presente in un altro posto
    expect(canTransfer(state, target, 0, twin, 0)).toBe(true); // stesso posto: ok
    const trig = (uid: number): Item => ({ ...plain(2), uid, affixes: [{ id: 'critFire', tier: 1, mods: [], power: 1 }, { id: 'atkFlat', tier: 1, mods: [] }] });
    const t2 = trig(500);
    const d2 = { ...trig(501), affixes: [{ id: 'critBleed', tier: 1, mods: [], power: 1 }] };
    state.gear.inventory.push(t2, d2);
    expect(canTransfer(state, t2, 1, d2, 0)).toBe(false);
    expect(canTransfer(state, t2, 0, d2, 0)).toBe(true);
  });
});

describe('crafting: fusione', () => {
  it('3 oggetti uguali → 1 della rarità successiva, livello medio, costo pagato', () => {
    const items = [plain(2, 'elmo', 10, 1), plain(2, 'elmo', 12, 50), plain(2, 'elmo', 14, 90)];
    const state = game(items, 1000);
    const cost = fuseCost(items);
    const out = fuseItems(state, items.map((x) => x.uid))!;
    expect(out.rarity).toBe(3);
    expect(out.type).toBe('elmo');
    expect(out.ilvl).toBe(12);
    expect(state.fragments).toBe(1000 - cost);
    expect(state.gear.inventory).toEqual([out]);
  });

  it('rifiuta rarità diverse, oltre Mitico, numero sbagliato', () => {
    const mixed = [plain(2, 'elmo'), plain(2, 'elmo', 10, 50), plain(3, 'elmo')];
    expect(fuseItems(game(mixed), mixed.map((x) => x.uid))).toBeNull();
    const mythic = [1, 50, 90].map((s) => plain(5, 'elmo', 10, s));
    expect(fuseItems(game(mythic), mythic.map((x) => x.uid))).toBeNull();
    const two = [plain(1, 'elmo'), plain(1, 'elmo', 10, 50)];
    expect(fuseItems(game(two), two.map((x) => x.uid))).toBeNull();
  });

  it('fusePartners propone gli oggetti compatibili, livello più alto prima', () => {
    const base = plain(1, 'guanti', 5);
    const others = [plain(1, 'guanti', 3, 50), plain(1, 'guanti', 9, 90), plain(2, 'guanti', 9, 7), plain(1, 'stivali', 9)];
    const state = game([base, ...others]);
    expect(fusePartners(state.gear, base).map((x) => x.ilvl)).toEqual([9, 3]);
    expect(FUSE_COUNT).toBe(3);
  });
});

describe('salvataggio v7', () => {
  it('un salvataggio v6 si carica e il contatore crafts resta opzionale', () => {
    const s = newGame(0);
    s.gear.inventory.push(plain(2));
    const v6 = serialize({ ...s, version: 6 });
    const loaded = deserialize(v6)!;
    expect(loaded.version).toBe(STATE_VERSION);
    expect(loaded.gear.inventory[0].crafts).toBeUndefined();
  });
});
