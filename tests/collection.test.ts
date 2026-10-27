import { describe, expect, it } from 'vitest';
import { step, type CombatEvent } from '../src/core/combat';
import { addCollectionMods, ascendItem, discover, reachedMilestones } from '../src/core/collection';
import { ascend } from '../src/core/ascension';
import { onModeKill } from '../src/core/modes';
import { emptyMods, rollItem, type Item } from '../src/core/items';
import { deserialize, serialize } from '../src/core/save';
import { STATE_VERSION, newGame, type GameState } from '../src/core/state';
import { stateStats } from '../src/core/stats';
import {
  ASCENDED_BONUS_MULT, ASCENDED_DEPTH, ASCENDED_MILESTONES, ASCENDED_MULT, COLLECTION_BONUS, COLLECTION_MILESTONES,
} from '../src/data/collection';
import { ABYSS_WAVES } from '../src/data/endgame';
import { UNIQUES } from '../src/data/uniques';

/** Un unico qualunque: si tira finché non esce. */
function uniqueItem(seed = 1): Item {
  const rng = { rng: seed };
  for (let i = 0; ; i++) {
    const it = rollItem(rng, i, 10, 4);
    if (it.special?.kind === 'unique') return it;
  }
}

describe('Collezione leggendari', () => {
  it('ogni unico ha un bonus di collezione', () => {
    for (const u of UNIQUES) expect(COLLECTION_BONUS[u.id], u.id).toBeTruthy();
  });

  it('un unico entra una volta sola, gli altri oggetti no', () => {
    const s = newGame(0, 1);
    const u = uniqueItem();
    expect(discover(s, u)).toBe(true);
    expect(discover(s, u)).toBe(false);
    expect(discover(s, rollItem({ rng: 5 }, 99, 10, 0))).toBe(false);
    expect(s.collection).toEqual([u.special!.id]);
  });

  it('il bonus entra nelle statistiche', () => {
    const s = newGame(0, 1);
    const before = stateStats(s).critMult;
    s.collection = ['crepuscolo'];
    expect(stateStats(s).critMult).toBeCloseTo(before + COLLECTION_BONUS.crepuscolo[0][1]);
  });

  it('premi di completamento alle soglie', () => {
    const ids = UNIQUES.map((u) => u.id);
    expect(reachedMilestones(ids.slice(0, Math.ceil(0.25 * ids.length) - 1))).toHaveLength(0);
    expect(reachedMilestones(ids.slice(0, Math.ceil(0.25 * ids.length)))).toHaveLength(1);
    expect(reachedMilestones(ids)).toHaveLength(COLLECTION_MILESTONES.length);
    const m = emptyMods();
    addCollectionMods(ids, m);
    const atkOf = (mods: [string, number][]) => mods.find(([k]) => k === 'atkPct')?.[1] ?? 0;
    const atk = COLLECTION_MILESTONES.reduce((sum, x) => sum + atkOf(x.mods), 0) + ids.reduce((sum, id) => sum + atkOf(COLLECTION_BONUS[id]), 0);
    expect(m.atkPct).toBeCloseTo(atk);
  });

  it('i drop della Campagna riempiono la collezione', () => {
    const s = newGame(0, 4);
    s.stage = { current: 10, best: 10, kills: 0, auto: false };
    s.hero.level = 300; // uccide in fretta: tanti drop
    s.gear.autoSalvage = 99; // anche gli oggetti smantellati contano
    const ev: CombatEvent[] = [];
    // anche un leggendario smantellato subito (non migliora l'equip) entra nella collezione
    const salvagedNew = () => ev.some((e) => e.type === 'drop' && e.discovered && e.salvaged);
    for (let i = 0; i < 200_000 && !salvagedNew(); i++) step(s, ev);
    expect(s.collection.length).toBeGreaterThan(0);
    expect(salvagedNew()).toBe(true);
  }, 20000);

  it("resta dopo l'Ascensione", () => {
    const s = newGame(0, 1);
    s.collection = ['boia'];
    s.stage.best = 40;
    ascend(s);
    expect(s.collection).toEqual(['boia']);
  });

  it('migra da v16 contando gli unici già posseduti', () => {
    const s = newGame(0, 2);
    const u = uniqueItem(3);
    s.gear.inventory.push(u);
    const { collection: _, ...old } = s;
    const back = deserialize(serialize({ ...old, version: 16 } as GameState))!;
    expect(back.version).toBe(STATE_VERSION);
    expect(back.collection).toEqual([u.special!.id]);
  });
});

describe('Collezione Ascesa', () => {
  it('un unico Asceso ha le statistiche fisse ×2,5 ed entra in entrambe le collezioni', () => {
    const s = newGame(0, 1);
    const plain = rollItem({ rng: 3 }, 1, 50, 5, undefined, false, 'boia');
    const asc = ascendItem(rollItem({ rng: 3 }, 2, 50, 5, undefined, false, 'boia'));
    expect(asc.special!.ascended).toBe(true);
    expect(asc.special!.mods[0].value).toBeCloseTo(plain.special!.mods[0].value * ASCENDED_MULT);
    expect(discover(s, asc)).toBe(true);
    expect(s.collection).toEqual(['boia']);
    expect(s.ascended).toEqual(['boia']);
    expect(discover(s, asc)).toBe(false);
  });

  it('dà di nuovo il bonus di collezione, moltiplicato, e i suoi premi', () => {
    const m = emptyMods();
    addCollectionMods(['boia'], m, ['boia']);
    expect(m.bossDmg).toBeCloseTo(COLLECTION_BONUS.boia[0][1] * (1 + ASCENDED_BONUS_MULT));
    const all = UNIQUES.map((u) => u.id);
    expect(reachedMilestones(all, ASCENDED_MILESTONES)).toHaveLength(ASCENDED_MILESTONES.length);
  });

  it('i Guardiani profondi dell’Abisso lasciano a volte un unico Asceso tra quelli già trovati', () => {
    let found = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const s = newGame(0, seed);
      s.collection = ['boia'];
      s.mode = { kind: 'abyss', depth: ASCENDED_DEPTH, wave: ABYSS_WAVES };
      const ev: CombatEvent[] = [];
      onModeKill(s, ev as never);
      const d = ev.find((e) => e.type === 'drop' && e.item.special?.ascended);
      if (d) { found++; expect(s.ascended).toEqual(['boia']); }
    }
    expect(found).toBeGreaterThan(2);
    expect(found).toBeLessThan(25);
  });

  it('migrazione v24 → v25: collezione Ascesa vuota', () => {
    const old = JSON.parse(serialize(newGame(0, 1)));
    delete old.ascended;
    const s = deserialize(JSON.stringify({ ...old, version: 24 }))!;
    expect(s.version).toBe(STATE_VERSION);
    expect(s.ascended).toEqual([]);
  });
});
