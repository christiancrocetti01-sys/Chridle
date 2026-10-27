import { describe, expect, it } from 'vitest';
import { skillLevel } from '../src/core/skills';
import { ascend, buyPerk, canAscend, offlineEfficiency, perkCost, startStage } from '../src/core/ascension';
import { step } from '../src/core/combat';
import { enterTower } from '../src/core/modes';
import { applyOffline, runOffline, startOffline } from '../src/core/offline';
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
    expect(skillLevel(s, 'colpoSacro')).toBe(6); // +5 livelli gratis
    expect(buyPerk(s, 'secondaVia')).toBe(true);
    expect(s.vie.secondUnlocked).toBe(true);
    expect(buyPerk(s, 'secondaVia')).toBe(false); // massimo 1
    buyPerk(s, 'balzo');
    expect(startStage(s.ascension)).toBe(6);
    expect(offlineEfficiency()).toBe(1);
    s.ascension.scintille = 0;
    expect(buyPerk(s, 'oro')).toBe(false);
  });

  it('potenziamenti del 2026-10-27: difesa, danni ai boss, elementali e chiavi a ogni Ascensione', () => {
    const s = newGame(0, 3);
    s.ascension.scintille = 1000;
    const before = stateStats(s);
    for (const id of ['tempra', 'giudizio', 'prisma', 'chiavi'] as const) expect(buyPerk(s, id)).toBe(true);
    const after = stateStats(s);
    expect(after.def).toBeGreaterThan(before.def);
    expect(after.bossMult).toBeCloseTo(before.bossMult + 0.1);
    s.stage.best = ASCEND_STAGE;
    const keys = s.keys;
    ascend(s);
    expect(s.keys).toBe(keys + 2);
  });

  it('migrazione v21 → v22: Veglia Eterna tolta, Scintille rimborsate', () => {
    const old = newGame(0, 1);
    old.ascension.scintille = 3;
    (old.ascension.perks as Record<string, number>).veglia = 3;
    old.ascension.perks.oro = 2;
    const s = deserialize(JSON.stringify({ ...old, version: 21 }))!;
    expect(s.ascension.scintille).toBe(3 + 2 + 4 + 8);
    expect(s.ascension.perks).toEqual({ oro: 2 });
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

describe('progresso offline', { timeout: 20_000 }, () => {
  it('niente sotto il minuto; poi oro, esperienza, Essenza e bottino simulati davvero', () => {
    const s = newGame(0, 3);
    for (let i = 0; i < 600; i++) step(s);
    expect(applyOffline(s, 30)).toBeNull();
    const a = structuredClone(s);
    const r1 = applyOffline(a, 900)!;
    expect(r1.gold).toBeGreaterThan(0);
    expect(r1.xp).toBeGreaterThan(0);
    expect(r1.essence).toBeGreaterThan(0);
    expect(r1.kills).toBeGreaterThan(100);
    expect(r1.levels).toBeGreaterThan(0);
    expect(a.hero.level).toBe(s.hero.level + r1.levels);
    expect(r1.efficiency).toBe(1);
    // 15 minuti di gioco: lo stesso risultato di 9000 tick a gioco aperto
    const b = structuredClone(s);
    for (let i = 0; i < 9000; i++) step(b);
    expect(a.stage.current).toBe(b.stage.current);
    expect(a.totals.kills).toBe(b.totals.kills);
  });

  it('offline si avanza di stage, e se si cade si torna indietro', () => {
    const s = newGame(0, 3);
    const r = applyOffline(s, 1200)!;
    expect(r.stageFrom).toBe(1);
    expect(r.stageTo).toBe(s.stage.current);
    expect(r.stageTo).toBeGreaterThan(3);
    // un eroe che non regge lo stage cade e scende di uno
    const w = newGame(0, 3);
    w.stage.current = w.stage.best = 60;
    const rw = applyOffline(w, 600)!;
    expect(rw.deaths).toBeGreaterThan(0);
    expect(w.stage.current).toBeLessThan(60);
  });

  it('il tempo simulato a blocchi vale come visto: un salvataggio a metà non lo ripete', () => {
    const s = newGame(0, 3);
    const run = startOffline(s, 600)!;
    expect(runOffline(s, run, run.total / 2)).toBe(false);
    expect(s.lastSeen).toBeCloseTo(300 * 1000, -1);
    expect(runOffline(s, run, run.total)).toBe(true);
    expect(s.lastSeen).toBeCloseTo(600 * 1000, -1);
  });

  it('una modalità lasciata a metà si chiude', () => {
    const s = newGame(0, 3);
    enterTower(s);
    applyOffline(s, 120);
    expect(s.mode.kind).toBe('campaign');
  });
});
