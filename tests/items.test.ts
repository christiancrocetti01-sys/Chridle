import { describe, expect, it } from 'vitest';
import { changeGear, step, type CombatEvent } from '../src/core/combat';
import {
  INVENTORY_SIZE, equip, gearMods, newGear, rollItem, rollRarity, salvage, salvageUpTo, salvageValue, unequip,
  type Item,
} from '../src/core/items';
import { deserialize, serialize } from '../src/core/save';
import { newGame } from '../src/core/state';
import { KILLS_PER_STAGE, heroStats, stateStats } from '../src/core/stats';
import { RARITIES } from '../src/data/items';

const rng = (seed: number) => ({ rng: seed });

describe('generatore di oggetti', () => {
  it('è deterministico a parità di seme', () => {
    expect(rollItem(rng(9), 1, 10, 4)).toEqual(rollItem(rng(9), 1, 10, 4));
  });

  it('il numero di affissi dipende dalla rarità, senza doppioni', () => {
    RARITIES.forEach((r, rarity) => {
      for (let seed = 0; seed < 30; seed++) {
        const it = rollItem(rng(seed), 1, 5, rarity);
        expect(it.affixes).toHaveLength(r.affixes);
        expect(new Set(it.affixes.map((a) => a.id)).size).toBe(r.affixes);
      }
    });
  });

  it('livello oggetto e rarità alzano la statistica di base', () => {
    const low = rollItem(rng(1), 1, 1, 0, 'arma');
    const high = rollItem(rng(1), 1, 30, 0, 'arma');
    const epic = rollItem(rng(1), 1, 30, 3, 'arma');
    expect(high.base.value).toBeGreaterThan(low.base.value * 10);
    expect(epic.base.value).toBeGreaterThan(high.base.value);
  });

  it('le rarità alte sono rare; i boss danno almeno Magico', () => {
    const counts = RARITIES.map(() => 0);
    const r = rng(123);
    for (let i = 0; i < 20000; i++) counts[rollRarity(r)]++;
    expect(counts[0]).toBeGreaterThan(counts[1]);
    expect(counts[1]).toBeGreaterThan(counts[2]);
    expect(counts[4]).toBeLessThan(counts[3]);
    for (let i = 0; i < 1000; i++) expect(rollRarity(r, true)).toBeGreaterThanOrEqual(1);
  });
});

describe('equipaggiamento', () => {
  const ring = (uid: number): Item => rollItem(rng(uid), uid, 5, 1, 'anello');

  it('indossare scambia con lo slot e aggiorna le statistiche', () => {
    const g = newGear();
    const a = rollItem(rng(1), 1, 10, 2, 'arma');
    const b = rollItem(rng(2), 2, 10, 2, 'arma');
    g.inventory.push(a, b);
    expect(equip(g, 1)).toBe(true);
    expect(g.equipped.arma).toBe(a);
    expect(equip(g, 2)).toBe(true);
    expect(g.equipped.arma).toBe(b);
    expect(g.inventory).toEqual([a]);
    expect(gearMods(g).atk).toBeGreaterThanOrEqual(b.base.value);
    expect(heroStats(1, { forza: 0, corazza: 0, rapidita: 0 }, gearMods(g)).atk).toBeGreaterThan(10);
  });

  it('due anelli: riempie prima lo slot libero, non va in slot sbagliati', () => {
    const g = newGear();
    g.inventory.push(ring(1), ring(2), ring(3));
    equip(g, 1);
    equip(g, 2);
    expect(g.equipped.anello1?.uid).toBe(1);
    expect(g.equipped.anello2?.uid).toBe(2);
    expect(equip(g, 3, 'arma')).toBe(false);
    expect(equip(g, 3, 'anello2')).toBe(true);
    expect(g.inventory.map((i) => i.uid)).toEqual([2]);
  });

  it('togliere riporta in inventario, ma non se è pieno', () => {
    const g = newGear();
    g.inventory.push(ring(1));
    equip(g, 1);
    expect(unequip(g, 'anello1')).toBe(true);
    equip(g, 1);
    for (let i = 0; i < INVENTORY_SIZE; i++) g.inventory.push(ring(100 + i));
    expect(unequip(g, 'anello1')).toBe(false);
  });

  it('smantellare dà Frammenti in base a rarità e livello', () => {
    const g = newGear();
    const it = rollItem(rng(1), 1, 12, 3);
    g.inventory.push(it, rollItem(rng(2), 2, 12, 0), rollItem(rng(3), 3, 12, 5));
    expect(salvageValue(it)).toBe(RARITIES[3].fragments * 3);
    expect(salvage(g, 1)).toBe(salvageValue(it));
    expect(salvage(g, 1)).toBe(0);
    expect(salvageUpTo(g, 2)).toBe(RARITIES[0].fragments * 3);
    expect(g.inventory.map((i) => i.rarity)).toEqual([5]);
  });

  it("cambiare oggetti non cura e non uccide l'eroe", () => {
    const s = newGame(0, 1);
    s.gear.inventory.push(rollItem(rng(1), 1, 20, 4, 'elmo'));
    s.hero.hp = 50;
    changeGear(s, () => equip(s.gear, 1));
    const gained = stateStats(s).maxHp - heroStats(1, s.upgrades).maxHp;
    expect(s.hero.hp).toBeCloseTo(50 + gained);
    s.hero.hp = 5;
    changeGear(s, () => unequip(s.gear, 'elmo'));
    expect(s.hero.hp).toBe(1);
  });
});

describe('drop', () => {
  it('i boss lasciano sempre un oggetto', () => {
    const s = newGame(0, 3);
    s.stage.kills = KILLS_PER_STAGE;
    const ev: CombatEvent[] = [];
    while (!s.enemy) step(s, ev);
    s.enemy.hp = 1;
    while (s.enemy) step(s, ev);
    const drop = ev.find((e) => e.type === 'drop');
    expect(drop && drop.type === 'drop' && drop.item.rarity).toBeGreaterThanOrEqual(1);
    expect(s.gear.inventory).toHaveLength(1);
  });

  it('i nemici normali lasciano oggetti ogni tanto; il filtro smantella in automatico', () => {
    const s = newGame(0, 11);
    s.gear.autoSalvage = 0;
    const ev: CombatEvent[] = [];
    for (let i = 0; i < 6000; i++) step(s, ev);
    const drops = ev.filter((e) => e.type === 'drop');
    const kills = ev.filter((e) => e.type === 'kill').length;
    expect(drops.length).toBeGreaterThan(kills / 16);
    expect(drops.length).toBeLessThan(kills / 3);
    expect(s.gear.inventory.every((i) => i.rarity > 0)).toBe(true);
    expect(s.fragments).toBeGreaterThan(0);
  });

  it('con inventario pieno i drop vengono smantellati', () => {
    const s = newGame(0, 3);
    for (let i = 0; i < INVENTORY_SIZE; i++) s.gear.inventory.push(rollItem(rng(i), 1000 + i, 1, 0));
    s.stage.kills = KILLS_PER_STAGE;
    while (!s.enemy) step(s);
    s.enemy.hp = 1;
    while (s.enemy) step(s);
    expect(s.gear.inventory).toHaveLength(INVENTORY_SIZE);
    expect(s.fragments).toBeGreaterThan(0);
  });
});

describe('salvataggio v3', () => {
  it('migra un salvataggio v2 aggiungendo equipaggiamento e Frammenti', () => {
    const { gear, fragments, ...v2 } = newGame(0, 1);
    const s = deserialize(JSON.stringify({ ...v2, version: 2, gold: 77 }))!;
    expect(s.gold).toBe(77);
    expect(s.fragments).toBe(0);
    expect(s.gear).toEqual(newGear());
    expect(gear).toEqual(newGear());
    expect(fragments).toBe(0);
  });

  it("l'equipaggiamento sopravvive a salva/carica", () => {
    const s = newGame(0, 1);
    s.gear.inventory.push(rollItem(rng(1), 1, 3, 2), rollItem(rng(2), 2, 3, 6, 'arma'));
    equip(s.gear, 2);
    expect(deserialize(serialize(s))).toEqual(s);
  });
});
