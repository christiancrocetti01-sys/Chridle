import { describe, expect, it } from 'vitest';
import { ascend, buyPerk, canAscend, offlineEfficiency, perkCost, startStage } from '../src/core/ascension';
import { step } from '../src/core/combat';
import { enterTower } from '../src/core/modes';
import { applyOffline } from '../src/core/offline';
import { deserialize, serialize } from '../src/core/save';
import { newGame } from '../src/core/state';
import { stateStats } from '../src/core/stats';
import { chooseVia } from '../src/core/vie';
import { ASCEND_STAGE, scintilleFor } from '../src/data/ascension';

describe('Ascensione', () => {
  it('le Scintille crescono con lo stage record, da 40 in su', () => {
    expect(scintilleFor(ASCEND_STAGE - 1)).toBe(0);
    expect(scintilleFor(40)).toBe(1);
    expect(scintilleFor(50)).toBe(4);
    expect(scintilleFor(100)).toBe(49);
  });

  it('azzera livello, oro, potenziamenti e stage; conserva oggetti, rune e Vie', () => {
    const s = newGame(0, 1);
    expect(canAscend(s)).toBe(false);
    s.hero.level = 40;
    chooseVia(s, 'lama');
    s.stage.current = s.stage.best = 60;
    s.gold = 1e6;
    s.upgrades.forza = 30;
    s.stars = ['x'];
    s.essence = 500;
    s.gear.inventory.push({ uid: 99, type: 'anello', rarity: 2, ilvl: 50, name: 'Anello', base: { stat: 'atk', value: 1 }, affixes: [] });
    expect(ascend(s)).toBe(9);
    expect(s.ascension).toMatchObject({ count: 1, scintille: 9, total: 9 });
    expect(s.hero.level).toBe(1);
    expect(s.gold).toBe(0);
    expect(s.upgrades.forza).toBe(0);
    expect(s.stage).toMatchObject({ current: 1, best: 1 });
    expect(s.stars).toEqual([]);
    expect(s.skills.slots[0]).toBe('colpoSacro');
    expect(s.essence).toBe(500);
    expect(s.gear.inventory).toHaveLength(1);
    expect(s.vie.main).toBe('lama');
  });

  it('i potenziamenti costano Scintille e funzionano', () => {
    const s = newGame(0, 1);
    s.ascension.scintille = 100;
    const atk = stateStats(s).atk;
    expect(buyPerk(s, 'fiamma')).toBe(true);
    expect(stateStats(s).atk).toBeCloseTo(atk * 1.2);
    expect(perkCost(s.ascension, 'fiamma')).toBe(2);
    expect(buyPerk(s, 'slot')).toBe(true);
    expect(s.skills.slots).toHaveLength(5);
    expect(buyPerk(s, 'secondaVia')).toBe(true);
    expect(s.vie.secondUnlocked).toBe(true);
    expect(buyPerk(s, 'secondaVia')).toBe(false); // massimo 1
    buyPerk(s, 'balzo');
    expect(startStage(s.ascension)).toBe(6);
    buyPerk(s, 'veglia');
    expect(offlineEfficiency(s.ascension)).toBeCloseTo(0.8);
    s.ascension.scintille = 0;
    expect(buyPerk(s, 'oro')).toBe(false);
  });

  it('non si ascende durante una modalità; il salvataggio conserva tutto', () => {
    const s = newGame(0, 1);
    s.stage.best = 50;
    enterTower(s);
    expect(canAscend(s)).toBe(false);
    s.ascension.perks.oro = 3;
    expect(deserialize(serialize(s))!.ascension.perks.oro).toBe(3);
  });
});

describe('progresso offline', () => {
  it('niente sotto il minuto; poi oro, esperienza, Essenza e bottino proporzionali al tempo', () => {
    const s = newGame(0, 3);
    for (let i = 0; i < 600; i++) step(s);
    expect(applyOffline(s, 30)).toBeNull();
    const a = structuredClone(s);
    const b = structuredClone(s);
    const r1 = applyOffline(a, 3600)!;
    const r8 = applyOffline(b, 8 * 3600)!;
    expect(r1.gold).toBeGreaterThan(0);
    expect(r1.xp).toBeGreaterThan(0);
    expect(r1.essence).toBeGreaterThan(0);
    expect(r1.kills).toBeGreaterThan(100);
    expect(r8.gold / r1.gold).toBeCloseTo(8, 0);
    expect(r1.levels).toBeGreaterThan(0);
    expect(a.hero.level).toBe(s.hero.level + r1.levels);
    expect(r8.items).toBeLessThanOrEqual(30);
    expect(r1.efficiency).toBe(0.75);
    // offline non si avanza di stage
    expect(b.stage.current).toBe(s.stage.current);
  });

  it('una modalità lasciata a metà si chiude', () => {
    const s = newGame(0, 3);
    enterTower(s);
    applyOffline(s, 3600);
    expect(s.mode.kind).toBe('campaign');
  });
});
