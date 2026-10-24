import { describe, expect, it } from 'vitest';
import { step, type CombatEvent } from '../src/core/combat';
import { rollItem, type Item } from '../src/core/items';
import { deserialize, serialize } from '../src/core/save';
import { STATE_VERSION, newGame, type GameState } from '../src/core/state';
import { stateStats } from '../src/core/stats';
import { gearTriggers } from '../src/core/triggers';
import { RARITIES, TRIGGER_AFFIXES } from '../src/data/items';

const rng = (seed: number) => ({ rng: seed });
const isTrigger = (id: string) => TRIGGER_AFFIXES.some((t) => t.id === id);

/** Partita con un nemico in campo e gli effetti a scatto indicati, ognuno su un oggetto diverso. */
function withTriggers(ids: string[], power = 1, seed = 1): GameState {
  const s = newGame(0, seed);
  const slots = ['arma', 'guanti', 'anello1', 'anello2', 'amuleto', 'reliquia'] as const;
  ids.forEach((id, i) => {
    const it: Item = rollItem(rng(i), 100 + i, 1, 0, 'reliquia');
    it.base.value = 0;
    it.affixes = [{ id, tier: 1, mods: [], power }];
    s.gear.equipped[slots[i]] = it;
  });
  while (!s.enemy) step(s);
  s.enemy.hp = s.enemy.maxHp = 1e12;
  return s;
}

const run = (s: GameState, ticks: number) => {
  const ev: CombatEvent[] = [];
  for (let i = 0; i < ticks; i++) step(s, ev);
  return ev;
};

describe('generazione degli effetti a scatto', () => {
  it('solo da Epico in su, al massimo uno, senza cambiare il numero di affissi', () => {
    RARITIES.forEach((r, rarity) => {
      let found = 0;
      for (let seed = 0; seed < 200; seed++) {
        const it = rollItem(rng(seed), 1, 10, rarity);
        expect(it.affixes).toHaveLength(r.affixes);
        const n = it.affixes.filter((a) => isTrigger(a.id)).length;
        expect(n).toBeLessThanOrEqual(1);
        found += n;
      }
      if (r.triggerChance === 0) expect(found).toBe(0);
      if (r.triggerChance === 1) expect(found).toBe(200);
      if (r.triggerChance > 0 && r.triggerChance < 1) expect(found).toBeGreaterThan(0);
    });
  });

  it('il valore cresce con il tier', () => {
    const s = withTriggers(['critFire'], 3.5);
    expect(gearTriggers(s.gear)[0].value).toBeCloseTo(0.5 * 3.5);
  });
});

describe('effetti a scatto in combattimento', () => {
  it('ogni N colpi: scatta esattamente ogni N colpi', () => {
    const s = withTriggers(['nLightning']);
    const ev = run(s, 400);
    const hits = ev.filter((e) => e.type === 'hit' && e.target === 'enemy').length;
    const procs = ev.filter((e) => e.type === 'proc').length;
    expect(procs).toBe(Math.floor(hits / 4));
  });

  it('effetti uguali su due oggetti si sommano', () => {
    const one = run(withTriggers(['nLightning']), 400).filter((e) => e.type === 'proc').length;
    const two = run(withTriggers(['nLightning', 'nLightning']), 400).filter((e) => e.type === 'proc').length;
    expect(two).toBe(one * 2);
  });

  it("l'esplosione al critico infligge danno in base all'attacco", () => {
    const s = withTriggers(['critFire']);
    const ev = run(s, 600);
    const proc = ev.find((e) => e.type === 'proc');
    expect(proc && proc.type === 'proc' && proc.amount).toBeCloseTo(0.5 * stateStats(s).atk);
  });

  it('la velocità a tempo si rinnova e poi scade', () => {
    const s = withTriggers(['critHaste']);
    const base = stateStats(s).attackSpeed;
    run(s, 300);
    expect(s.hero.buffs.length).toBeLessThanOrEqual(1);
    s.hero.buffs = [{ key: 'x', speedPct: 0.5, ticks: 2 }];
    expect(stateStats(s).attackSpeed).toBeGreaterThan(base * 1.4);
    s.gear.equipped = {};
    run(s, 2);
    expect(s.hero.buffs).toEqual([]);
  });

  it('lo scudo assorbe i colpi prima della vita', () => {
    const s = withTriggers(['struckShield'], 20);
    const ev = run(s, 400);
    const struck = ev.filter((e) => e.type === 'hit' && e.target === 'hero');
    expect(struck.length).toBeGreaterThan(2);
    // dopo il primo colpo lo scudo (60% della vita) assorbe i successivi
    expect(struck.slice(1).every((e) => e.type === 'hit' && e.amount === 0)).toBe(true);
  });

  it("all'uccisione: cura", () => {
    const s = withTriggers(['killHeal'], 10);
    s.enemy!.hp = 0.001;
    s.hero.hp = 10;
    s.hero.swing = 0.99;
    const ev = run(s, 5);
    expect(ev.some((e) => e.type === 'kill')).toBe(true);
    expect(s.hero.hp).toBeGreaterThan(10 + 0.3 * stateStats(s).maxHp);
  });

  it('il sanguinamento è danno nel tempo e può uccidere da solo', () => {
    const s = withTriggers([]);
    s.enemy!.hp = 100;
    s.enemy!.bleed = 1000;
    s.hero.swing = -1e9; // l'eroe non attacca
    const ev = run(s, 30);
    expect(ev.some((e) => e.type === 'kill')).toBe(true);
  });
});

describe('salvataggio v5', () => {
  it('migra un v4 aggiungendo scudo, buff e riserve dei danni nel tempo', () => {
    const s = withTriggers(['critFire']);
    const { shield, hits, buffs, ...hero } = s.hero;
    const { bleed, poison, ...enemy } = s.enemy!;
    const v4 = { ...s, version: 4, hero, enemy };
    const m = deserialize(JSON.stringify(v4))!;
    expect(m.version).toBe(STATE_VERSION);
    expect(m.hero).toMatchObject({ shield: 0, hits: 0, buffs: [] });
    expect(m.enemy).toMatchObject({ bleed: 0, poison: 0 });
    expect([shield, hits, buffs, bleed, poison]).toBeDefined();
  });

  it('gli effetti a scatto sopravvivono a salva/carica', () => {
    const s = withTriggers(['critFire', 'killHaste'], 2);
    run(s, 50);
    expect(deserialize(serialize(s))).toEqual(s);
  });
});
