import { describe, expect, it } from 'vitest';
import { changeGear, step, type CombatEvent } from '../src/core/combat';
import {
  INVENTORY_SIZE, equip, gearMods, newGear, rollItem, rollRarity, salvage, salvageUpTo, salvageValue, unequip,
  type Item,
} from '../src/core/items';
import { deserialize, serialize } from '../src/core/save';
import { newGame } from '../src/core/state';
import { KILLS_PER_STAGE, heroStats, stageEnemy, stateStats } from '../src/core/stats';
import { AFFIXES, FLAT_STATS, ITEM_TYPES, RARITIES, affixesFor } from '../src/data/items';
import { emptyMods } from '../src/core/items';

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

describe('affissi v4', () => {
  it('ogni tipo di oggetto ha abbastanza affissi per un Divino; id unici', () => {
    expect(AFFIXES.length).toBeGreaterThanOrEqual(40);
    expect(new Set(AFFIXES.map((a) => a.id)).size).toBe(AFFIXES.length);
    for (const t of ITEM_TYPES) expect(affixesFor(t.id).length).toBeGreaterThanOrEqual(RARITIES[RARITIES.length - 1].affixes);
  });

  it('gli oggetti ricevono solo affissi ammessi per il loro tipo', () => {
    for (const t of ITEM_TYPES) {
      const allowed = new Set(affixesFor(t.id).map((a) => a.id));
      for (let seed = 0; seed < 40; seed++) {
        for (const a of rollItem(rng(seed), 1, 10, 6, t.id).affixes) expect(allowed.has(a.id)).toBe(true);
      }
    }
  });

  it('le statistiche piatte crescono con il livello oggetto, le percentuali no', () => {
    const lo = rollItem(rng(5), 1, 1, 6, 'arma');
    const hi = rollItem(rng(5), 1, 40, 6, 'arma');
    lo.affixes.forEach((a, i) => a.mods.forEach((m, j) => {
      const v = hi.affixes[i].mods[j].value;
      if (FLAT_STATS.has(m.stat)) expect(v).toBeGreaterThan(m.value * 10);
      else expect(v).toBeCloseTo(m.value);
    }));
  });

  it('gli affissi ibridi danno due statistiche', () => {
    const g = newGear();
    const it = rollItem(rng(1), 1, 1, 0, 'arma');
    it.affixes = [{ id: 'crusader', tier: 1, mods: [{ stat: 'holy', value: 3 }, { stat: 'def', value: 2 }] }];
    g.equipped.arma = it;
    const m = gearMods(g);
    expect(m.holy).toBe(3);
    expect(m.def).toBe(2);
  });

  it('il ritrovamento magico alza le rarità', () => {
    const better = (mf: number) => {
      const r = rng(77);
      let n = 0;
      for (let i = 0; i < 10000; i++) if (rollRarity(r, false, mf) > 0) n++;
      return n;
    };
    expect(better(1)).toBeGreaterThan(better(0) * 1.3);
  });
});

describe('statistiche speciali in combattimento', () => {
  const up = { forza: 0, corazza: 0, rapidita: 0 };
  const fight = (mods: Partial<ReturnType<typeof emptyMods>>, seed = 1) => {
    const s = newGame(0, seed);
    const it = rollItem(rng(1), 1, 1, 0, 'reliquia');
    it.base.value = 0;
    it.affixes = [{ id: 'test', tier: 1, mods: Object.entries(mods).map(([stat, value]) => ({ stat: stat as 'atk', value: value! })) }];
    s.gear.equipped.reliquia = it;
    while (!s.enemy) step(s);
    return s;
  };

  it('il danno elementale ignora la difesa e si somma al colpo', () => {
    expect(heroStats(1, up, { ...emptyMods(), fire: 10, firePct: 0.5, elemPct: 0.5 }).elements.fire).toBeCloseTo(20);
    const plain = fight({});
    const fire = fight({ fire: 50 });
    plain.enemy!.def = fire.enemy!.def = 1e9;
    const hit = (s: typeof plain) => {
      const ev: CombatEvent[] = [];
      while (!ev.some((e) => e.type === 'hit' && e.target === 'enemy')) step(s, ev);
      return ev.find((e) => e.type === 'hit' && e.target === 'enemy')!;
    };
    const a = hit(plain), b = hit(fire);
    if (a.type !== 'hit' || b.type !== 'hit') throw new Error();
    expect(b.amount - a.amount).toBeGreaterThanOrEqual(50);
  });

  it('il veleno uccide anche senza attaccare', () => {
    const s = fight({ poison: 1e6, atkPct: -1 });
    const ev = step(s);
    expect(ev.some((e) => e.type === 'kill')).toBe(true);
  });

  it('schivata, spine e rubavita', () => {
    const s = fight({ dodge: 1 });
    expect(stateStats(s).dodge).toBe(0.5);
    s.enemy!.hp = 1e12;
    const ev: CombatEvent[] = [];
    for (let i = 0; i < 300; i++) step(s, ev);
    expect(ev.some((e) => e.type === 'dodge')).toBe(true);
    expect(ev.some((e) => e.type === 'hit' && e.target === 'hero')).toBe(true);

    const t = fight({ thorns: 1e9 });
    t.enemy!.hp = 1e8;
    const ev1: CombatEvent[] = [];
    while (t.enemy) step(t, ev1);
    const k = ev1.findIndex((e) => e.type === 'kill');
    expect(ev1[k - 1]).toMatchObject({ type: 'hit', target: 'hero' });

    const v = fight({ lifeSteal: 1 });
    v.hero.hp = 1;
    v.enemy!.hp = 1e9;
    const ev2: CombatEvent[] = [];
    while (!ev2.some((e) => e.type === 'hit' && e.target === 'enemy')) step(v, ev2);
    expect(v.hero.hp).toBeGreaterThan(5);
  });

  it('bonus oro ed esperienza', () => {
    const s = fight({ goldPct: 1, xpPct: 1 });
    s.enemy!.hp = 0.001;
    const ev: CombatEvent[] = [];
    while (s.enemy) step(s, ev);
    const kill = ev.find((e) => e.type === 'kill');
    if (kill?.type !== 'kill') throw new Error();
    const base = stageEnemy(1);
    expect(kill.gold).toBeCloseTo(base.gold * 2);
    expect(kill.xp).toBeCloseTo(base.xp * 2);
  });
});

describe('salvataggio v4', () => {
  it('migra gli affissi v3 ({ stat, value }) in mods', () => {
    const s = newGame(0, 1);
    const old = (uid: number) => ({ ...rollItem(rng(uid), uid, 3, 0, 'anello'), affixes: [{ id: 'crit', stat: 'crit', tier: 2, value: 0.02 }] });
    const v3 = { ...s, version: 3, gear: { ...s.gear, equipped: { anello1: old(1) }, inventory: [old(2)] } };
    const m = deserialize(JSON.stringify(v3))!;
    expect(m.version).toBe(4);
    expect(m.gear.equipped.anello1!.affixes).toEqual([{ id: 'crit', tier: 2, mods: [{ stat: 'crit', value: 0.02 }] }]);
    expect(m.gear.inventory[0].affixes[0].mods[0].stat).toBe('crit');
    expect(gearMods(m.gear).crit).toBeCloseTo(0.02);
  });
});
