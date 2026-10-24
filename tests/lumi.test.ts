import { describe, expect, it } from 'vitest';
import { step, type CombatEvent } from '../src/core/combat';
import { ascend } from '../src/core/ascension';
import { checkLumi, levelLumo, lumoCost, newLumi, setActiveLumo } from '../src/core/lumi';
import { deserialize, serialize } from '../src/core/save';
import { STATE_VERSION, newGame, type GameState } from '../src/core/state';
import { stateStats } from '../src/core/stats';
import { LUMI, LUMO_IDLE_SHARE } from '../src/data/lumi';

describe('Lumi', () => {
  it('si sbloccano al traguardo, il primo diventa attivo', () => {
    const s = newGame(0, 1);
    expect(checkLumi(s)).toEqual([]);
    s.stage.best = 15;
    s.totals.dungeons = 1;
    expect(checkLumi(s)).toEqual(['fiammella', 'brina']);
    expect(s.lumi.active).toBe('fiammella');
    expect(s.lumi.levels).toEqual({ fiammella: 1, brina: 1 });
    expect(checkLumi(s)).toEqual([]);
  });

  it('il combattimento li sblocca con un evento', () => {
    const s = newGame(0, 2);
    s.stage.best = 15;
    const ev: CombatEvent[] = [];
    for (let i = 0; i < 20; i++) step(s, ev);
    expect(ev.some((e) => e.type === 'lumo' && e.id === 'fiammella')).toBe(true);
  });

  it("l'attivo dà il bonus pieno e l'effetto, gli altri una parte", () => {
    const s = newGame(0, 1);
    const base = stateStats(s);
    s.lumi = { levels: { fiammella: 4, aureola: 2 }, active: 'fiammella' };
    const st = stateStats(s);
    const fire = LUMI[0].perLevel[0][1];
    expect(st.elemMult.fire).toBeCloseTo(base.elemMult.fire + fire * 4);
    expect(st.critMult).toBeCloseTo(base.critMult + LUMI[0].special[0][1]);
    expect(st.maxHp).toBeCloseTo(base.maxHp * (1 + 0.015 * 2 * LUMO_IDLE_SHARE));
  });

  it("livelli con l'Essenza, attivo solo se sbloccato", () => {
    const s = newGame(0, 1);
    s.lumi.levels.fiammella = 1;
    expect(setActiveLumo(s, 'brina')).toBe(false);
    expect(levelLumo(s, 'fiammella')).toBe(false);
    s.essence = lumoCost(1) + lumoCost(2);
    expect(levelLumo(s, 'fiammella')).toBe(true);
    expect(levelLumo(s, 'fiammella')).toBe(true);
    expect(s.lumi.levels.fiammella).toBe(3);
    expect(s.essence).toBe(0);
    expect(lumoCost(3)).toBeGreaterThan(lumoCost(2));
  });

  it("restano dopo l'Ascensione", () => {
    const s = newGame(0, 1);
    s.lumi = { levels: { fiammella: 5 }, active: 'fiammella' };
    s.stage.best = 40;
    ascend(s);
    expect(s.lumi.levels.fiammella).toBe(5);
    expect(s.lumi.active).toBe('fiammella');
  });

  it('migra da v18 sbloccando quelli già raggiunti', () => {
    const s = newGame(0, 2);
    s.ascension.count = 2;
    const { lumi: _, ...old } = s;
    const back = deserialize(serialize({ ...old, version: 18 } as GameState))!;
    expect(back.version).toBe(STATE_VERSION);
    expect(back.lumi).toEqual({ ...newLumi(), levels: { aureola: 1 }, active: 'aureola' });
  });
});
