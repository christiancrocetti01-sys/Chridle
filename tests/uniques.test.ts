import { describe, expect, it } from 'vitest';
import { step, type CombatEvent } from '../src/core/combat';
import { gearRules, itemMods, rollItem, setCounts, type Item } from '../src/core/items';
import { deserialize } from '../src/core/save';
import { STATE_VERSION, newGame, type GameState } from '../src/core/state';
import { stateStats } from '../src/core/stats';
import { gearTriggers } from '../src/core/triggers';
import type { ItemType, SlotId } from '../src/data/items';
import { SETS, UNIQUES, UNIQUE_MIN_RARITY, SET_MIN_RARITY, type RuleId } from '../src/data/uniques';

const rng = (seed: number) => ({ rng: seed });

/** Oggetto "vuoto" (nessuna statistica) di un tipo, eventualmente unico o di set. */
function bare(uid: number, type: ItemType, special?: Item['special']): Item {
  const it = rollItem(rng(uid), uid, 1, 0, type);
  it.base.value = 0;
  it.affixes = [];
  if (special) it.special = special;
  return it;
}
const unique = (uid: number, id: string) => bare(uid, UNIQUES.find((u) => u.id === id)!.type, { kind: 'unique', id, mods: [] });
const piece = (uid: number, set: string, type: ItemType) => bare(uid, type, { kind: 'set', id: set, mods: [] });

const SLOT_OF: Partial<Record<ItemType, SlotId>> = { anello: 'anello1' };

/** Partita con un nemico in campo (vita enorme) e gli oggetti indicati indossati. */
function game(items: Item[], seed = 1): GameState {
  const s = newGame(0, seed);
  for (const it of items) s.gear.equipped[SLOT_OF[it.type] ?? (it.type as SlotId)] = it;
  while (!s.enemy) step(s);
  s.enemy.hp = s.enemy.maxHp = 1e12;
  return s;
}
const run = (s: GameState, ticks: number) => {
  const ev: CombatEvent[] = [];
  for (let i = 0; i < ticks; i++) step(s, ev);
  return ev;
};
/** Partita con una sola regola attiva, data da un unico che la possiede. */
const withRule = (rule: RuleId, extra: Item[] = []) => game([unique(900, UNIQUES.find((u) => u.rule === rule)!.id), ...extra]);

describe('drop di unici e set', () => {
  it('unici solo da Leggendario, set solo da Epico; nome e tipo fissi', () => {
    const seen = { unique: 0, set: 0 };
    for (let rarity = 0; rarity <= 6; rarity++) {
      for (let seed = 0; seed < 400; seed++) {
        const it = rollItem(rng(seed), 1, 10, rarity);
        if (!it.special) continue;
        seen[it.special.kind]++;
        if (it.special.kind === 'unique') {
          expect(rarity).toBeGreaterThanOrEqual(UNIQUE_MIN_RARITY);
          const u = UNIQUES.find((x) => x.id === it.special!.id)!;
          expect([it.name, it.type]).toEqual([u.name, u.type]);
        } else {
          expect(rarity).toBeGreaterThanOrEqual(SET_MIN_RARITY);
          const p = SETS.find((x) => x.id === it.special!.id)!.pieces.find((x) => x.type === it.type)!;
          expect(it.name).toBe(p.name);
        }
      }
    }
    expect(seen.unique).toBeGreaterThan(50);
    expect(seen.set).toBeGreaterThan(20);
  });

  it('con il tipo fissato escono solo unici e pezzi di quel tipo', () => {
    for (let seed = 0; seed < 300; seed++) expect(rollItem(rng(seed), 1, 10, 6, 'stivali').type).toBe('stivali');
  });

  it('le statistiche piatte degli unici crescono con il livello oggetto', () => {
    const find = (ilvl: number) => {
      for (let seed = 0; ; seed++) {
        const it = rollItem(rng(seed), 1, ilvl, 6, 'amuleto');
        if (it.special?.id === 'brace') return it.special.mods.find((m) => m.stat === 'fire')!.value;
      }
    };
    expect(find(30)).toBeGreaterThan(find(1) * 10);
  });
});

describe('bonus dei set', () => {
  const pal = (n: number) => SETS[0].pieces.slice(0, n).map((p, i) => piece(i + 1, 'paladino', p.type));

  it('2 pezzi: statistiche; 4: effetto a scatto; 6: regola e statistiche', () => {
    expect(itemMods(pal(1)).holyPct).toBe(0);
    expect(itemMods(pal(2)).holyPct).toBeCloseTo(0.25);
    expect(gearTriggers(game(pal(3)).gear)).toHaveLength(0);
    expect(gearTriggers(game(pal(4)).gear).map((t) => t.def.id)).toEqual(['set:paladino']);
    expect(gearRules(pal(5)).size).toBe(0);
    expect(gearRules(pal(6))).toEqual(new Set(['overhealShield']));
    expect(itemMods(pal(6)).hpPct).toBeCloseTo(0.2);
  });

  it('due anelli uguali dello stesso set contano una volta', () => {
    const a = piece(1, 'piromante', 'anello');
    const b = piece(2, 'piromante', 'anello');
    expect(setCounts([a, b])).toEqual({ piromante: 1 });
  });
});

describe('regole speciali', () => {
  it('eco: le esplosioni dell\'elemento colpiscono due volte', () => {
    const burst = (items: Item[]) => {
      const s = game(items);
      s.hero.swing = 0.99;
      const ev = run(s, 400);
      const p = ev.find((e) => e.type === 'proc' && e.id === 'set:piromante');
      return p?.type === 'proc' ? p.amount / stateStats(s).atk : 0;
    };
    const pyro = SETS[1].pieces.slice(0, 4).map((p, i) => piece(i + 1, 'piromante', p.type));
    const plain = burst(pyro);
    expect(plain).toBeGreaterThan(0);
    // con l'unico "Cuore di Brace" (eco del fuoco) al posto dell'amuleto
    expect(burst([...pyro, unique(50, 'brace')]) / plain).toBeGreaterThan(1.9);
  });

  it('veleno infinito: la riserva non cala', () => {
    const s = withRule('endlessPoison');
    s.enemy!.poison = 100;
    s.hero.swing = -1e9;
    run(s, 50);
    expect(s.enemy!.poison).toBe(100);
  });

  it('dopo una schivata il colpo seguente è critico', () => {
    const s = withRule('dodgeCrit');
    s.hero.nextCrit = true;
    s.hero.swing = 0.99;
    const ev = run(s, 1);
    expect(ev.find((e) => e.type === 'hit')).toMatchObject({ target: 'enemy', crit: true });
    expect(s.hero.nextCrit).toBe(false);
  });

  it('le cure in eccesso diventano scudo', () => {
    const s = withRule('overhealShield');
    run(s, 1);
    expect(s.hero.shield).toBeGreaterThan(0);
    expect(withRule('execute').hero.shield).toBe(0);
  });

  it('esecuzione: danno doppio sotto il 25% della vita', () => {
    const hit = (hpFrac: number) => {
      const s = withRule('execute');
      s.enemy!.def = 0;
      s.enemy!.hp = s.enemy!.maxHp * hpFrac;
      s.hero.swing = 0.99;
      const ev = run(s, 1);
      const h = ev.find((e) => e.type === 'hit');
      return h?.type === 'hit' ? h.amount : NaN;
    };
    // stesso seme: stesso esito del critico in entrambi i casi
    expect(hit(0.1) / hit(0.9)).toBeCloseTo(2);
  });

  it('critico che fa sanguinare', () => {
    const s = withRule('critBleed');
    s.hero.nextCrit = true;
    s.hero.swing = 0.99;
    const ev = run(s, 1);
    const h = ev.find((e) => e.type === 'hit')!;
    expect(h.type === 'hit' && s.enemy!.bleed).toBeGreaterThanOrEqual(h.type === 'hit' ? h.amount * 0.89 : 0);
  });

  it('frenesia: più veloce sotto metà vita', () => {
    const s = withRule('frenzy');
    const full = stateStats(s).attackSpeed;
    s.hero.hp = 1;
    expect(stateStats(s).attackSpeed).toBeCloseTo(full * 1.5);
  });

  it('effetti "ogni N colpi" un colpo prima', () => {
    const count = (items: Item[]) => {
      const s = game(items);
      const ev = run(s, 400);
      return { hits: ev.filter((e) => e.type === 'hit' && e.target === 'enemy').length, procs: ev.filter((e) => e.type === 'proc').length };
    };
    const ring = bare(7, 'arma');
    ring.affixes = [{ id: 'nLightning', tier: 1, mods: [], power: 1 }];
    const fast = count([ring, unique(8, 'eco')]);
    expect(fast.procs).toBe(Math.floor(fast.hits / 3));
  });

  it('velocità a tempo che si accumula (con un limite)', () => {
    const boots = unique(9, 'tormenta');
    const gloves = bare(10, 'guanti');
    gloves.affixes = [{ id: 'critHaste', tier: 1, mods: [], power: 1 }, { id: 'crit', tier: 5, mods: [{ stat: 'crit', value: 0.6 }] }];
    const s = game([boots, gloves]);
    let max = 0;
    for (let i = 0; i < 600; i++) {
      step(s);
      max = Math.max(max, s.hero.buffs.length);
    }
    expect(max).toBeGreaterThan(1);
    expect(max).toBeLessThanOrEqual(20);
  });
});

describe('regole del lotto 5', () => {
  const firstHit = (s: GameState) => {
    s.enemy!.def = 0;
    s.hero.swing = 0.99;
    const h = run(s, 1).find((e) => e.type === 'hit');
    return h?.type === 'hit' ? h.amount : NaN;
  };

  it('ogni unico e ogni set ha una regola con il suo testo; 6 pezzi di tipi diversi per set', () => {
    expect(UNIQUES.length).toBe(41);
    expect(SETS.length).toBe(10);
    expect(new Set(UNIQUES.map((u) => u.id)).size).toBe(UNIQUES.length);
    for (const set of SETS) expect(new Set(set.pieces.map((p) => p.type)).size).toBe(6);
  });

  it('gelo che intorpidisce: il nemico attacca più piano', () => {
    const swing = (s: GameState) => {
      s.enemy!.swing = 0;
      s.hero.swing = -1e9;
      run(s, 1);
      return s.enemy!.swing / s.enemy!.attackSpeed;
    };
    expect(swing(withRule('frostbite')) / swing(withRule('execute'))).toBeCloseTo(0.7);
  });

  it('fulmine a catena: un critico toglie in più il 100% dell\'attacco', () => {
    const s = withRule('chainLightning');
    s.hero.nextCrit = true;
    s.enemy!.def = 0;
    s.hero.swing = 0.99;
    const before = s.enemy!.hp;
    const ev = run(s, 1);
    const h = ev.find((e) => e.type === 'hit')!;
    const extra = before - s.enemy!.hp - (h.type === 'hit' ? h.amount : 0);
    expect(extra).toBeGreaterThan(stateStats(s).atk * 0.5);
  });

  it('raccolto delle anime: uccidere cura', () => {
    const s = withRule('soulHarvest');
    s.hero.hp = 1;
    s.enemy!.hp = 0.1;
    s.hero.swing = 0.99;
    run(s, 1);
    expect(s.hero.hp).toBeGreaterThan(stateStats(s).maxHp * 0.15);
  });

  it('ultimo baluardo: sotto il 30% della vita difesa doppia', () => {
    const s = withRule('lastStand');
    const def = stateStats(s).def;
    s.hero.hp = 1;
    expect(stateStats(s).def).toBeCloseTo(def * 2);
  });

  it('primo raggio: il primo colpo fa ×4, il secondo no', () => {
    const a = withRule('firstStrike');
    const b = withRule('firstStrike');
    b.hero.hits = 1;
    expect(firstHit(a) / firstHit(b)).toBeCloseTo(4, 0);
  });

  it('aura di rovi: spine ×3', () => {
    const thorns = [{ stat: 'thorns' as const, value: 10 }];
    const s = withRule('thornsAura');
    s.gear.equipped.armatura!.special!.mods = thorns;
    const plain = withRule('execute');
    plain.gear.equipped.arma!.special!.mods = thorns;
    expect(stateStats(s).thorns).toBeCloseTo(3 * stateStats(plain).thorns);
  });
});

describe('salvataggio v6', () => {
  it('migra un v5 aggiungendo il critico garantito', () => {
    const s = newGame(0, 1);
    const { nextCrit, ...hero } = s.hero;
    const m = deserialize(JSON.stringify({ ...s, version: 5, hero }))!;
    expect(m.version).toBe(STATE_VERSION);
    expect(m.hero.nextCrit).toBe(false);
    expect(nextCrit).toBe(false);
  });
});

describe('lotto 6', () => {
  it('le notevoli di «Oltre» arrivano anche dagli unici, mai le chiavi di volta', () => {
    const lot6 = ['setteSaette', 'mattino', 'cuoreGhiaccio', 'duellante', 'calVermiglio', 'rogo', 'spezzascudi', 'messe', 'sangueFreddo', 'fiammeVive', 'ecoArcano'];
    lot6.forEach((id, i) => {
      const u = UNIQUES.find((x) => x.id === id)!;
      expect(stateStats(game([unique(900 + i, id)])).rules.has(u.rule), id).toBe(true);
    });
    const keystones: RuleId[] = ['supernova', 'livingFortress', 'timeStop', 'battleBreath', 'judgeHammer'];
    for (const u of UNIQUES) expect(keystones).not.toContain(u.rule);
  });

  it('Gladiatore completo: regola Spezzascudi', () => {
    const set = SETS.find((x) => x.id === 'gladiatore')!;
    const s = game(set.pieces.map((p, i) => piece(950 + i, 'gladiatore', p.type)));
    expect(stateStats(s).rules.has('armorBreak')).toBe(true);
  });
});
