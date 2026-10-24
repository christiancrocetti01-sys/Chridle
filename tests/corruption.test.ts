import { describe, expect, it } from 'vitest';
import { step, type CombatEvent } from '../src/core/combat';
import { deserialize, serialize } from '../src/core/save';
import { castSkills, lightCost, newSkills } from '../src/core/skills';
import { STATE_VERSION, newGame, type GameState } from '../src/core/state';
import { stateStats } from '../src/core/stats';
import { heal } from '../src/core/triggers';
import { chooseVia } from '../src/core/vie';
import { CORRUPTION_THRESHOLD, SANCTITY_SECONDS, corruptionState } from '../src/data/corruption';
import { SKILLS } from '../src/data/skills';

/** Indossa un amuleto finto con questa Corruzione (positiva) o Purezza (negativa). */
function withCorruption(c: number, level = 30): GameState {
  const s = newGame(0, 5);
  s.hero.level = level;
  s.gear.equipped.amuleto = {
    uid: 999, type: 'amuleto', rarity: 0, ilvl: 1, name: 'prova', base: { stat: 'hp', value: 0 },
    affixes: [{ id: c > 0 ? 'corruptFury' : 'pureWard', tier: 1, mods: [{ stat: c > 0 ? 'corruption' : 'purity', value: Math.abs(c) }] }],
  };
  s.hero.hp = stateStats(s).maxHp;
  return s;
}

describe('Purezza e Corruzione', () => {
  it('neutro: nessun effetto', () => {
    const s = stateStats(newGame(0));
    expect(s.corruption).toBe(0);
    expect(s.healMult).toBe(1);
    expect(corruptionState(0)).toBe('neutro');
  });

  it('ogni punto: Corruzione +1% danni −0,5% difesa e cure; Purezza l\'opposto', () => {
    const base = stateStats(withCorruption(0.0001));
    const c = stateStats(withCorruption(40));
    expect(c.corruption).toBe(40);
    expect(c.atk).toBeCloseTo(base.atk * 1.4);
    expect(c.def).toBeCloseTo(base.def * 0.8);
    expect(c.healMult).toBeCloseTo(0.8);
    const p = stateStats(withCorruption(-40));
    expect(p.corruption).toBe(-40);
    expect(p.atk).toBeCloseTo(base.atk * 0.8);
    expect(p.def).toBeCloseTo(base.def * 1.4);
    expect(p.healMult).toBeCloseTo(1.4);
    expect(stateStats(withCorruption(500)).corruption).toBe(100); // limite ±100
  });

  it('le cure seguono il moltiplicatore', () => {
    const s = withCorruption(-40);
    const hero = stateStats(s);
    s.hero.hp = 1;
    heal(s, hero, 10);
    expect(s.hero.hp).toBeCloseTo(15);
  });

  it('le Vie spostano il valore: Eclissiarca verso Corrotto, Paladino verso Puro', () => {
    const e = newGame(0);
    e.hero.level = 10;
    chooseVia(e, 'eclissiarca');
    expect(stateStats(e).corruption).toBe(30);
    const p = newGame(0);
    p.hero.level = 10;
    chooseVia(p, 'paladino');
    expect(stateStats(p).corruption).toBe(-30);
  });

  it('Corrotto (≥50): le skill di danno costano vita invece di Luce', () => {
    const def = SKILLS.find((k) => k.id === 'giudizio')!;
    const s = withCorruption(CORRUPTION_THRESHOLD, 60);
    s.skills = newSkills(60);
    const hero = stateStats(s);
    expect(hero.rules.has('corruptShadow')).toBe(true);
    expect(lightCost(s, hero, def)).toBe(0);
    expect(lightCost(s, stateStats(withCorruption(10)), def)).toBeGreaterThan(0);
    while (!s.enemy) step(s);
    s.enemy!.hp = s.enemy!.maxHp = 1e15;
    s.skills.slots = [def.id, null, null, null];
    s.skills.cooldowns[def.id] = 0;
    s.hero.light = 0;
    s.hero.hp = stateStats(s).maxHp;
    const before = s.hero.hp;
    const ev: CombatEvent[] = [];
    castSkills(s, stateStats(s), ev);
    expect(ev.some((e) => e.type === 'skill')).toBe(true);
    expect(s.hero.hp).toBeLessThan(before);
    expect(s.hero.light).toBe(0);
  });

  it('Puro (≤−50): le cure in eccesso diventano scudo', () => {
    const s = withCorruption(-CORRUPTION_THRESHOLD);
    const hero = stateStats(s);
    expect(hero.rules.has('overhealShield')).toBe(true);
    s.hero.hp = hero.maxHp;
    heal(s, hero, 10);
    expect(s.hero.shield).toBeGreaterThan(0);
  });

  it('Eclissi (+100): danni ×2 e nessuna cura', () => {
    const base = stateStats(withCorruption(0.0001));
    const s = withCorruption(100);
    const hero = stateStats(s);
    expect(hero.rules.has('eclipse')).toBe(true);
    expect(hero.atk).toBeCloseTo(base.atk * 2 * 2);
    s.hero.hp = 1;
    heal(s, hero, 100);
    expect(s.hero.hp).toBe(1);
  });

  it('Santità (−100): un colpo mortale lascia a 1 di vita, poi si ricarica in 30 s', () => {
    const s = withCorruption(-100);
    expect(stateStats(s).rules.has('sanctity')).toBe(true);
    while (!s.enemy) step(s);
    s.enemy!.atk = 1e9;
    s.enemy!.hp = s.enemy!.maxHp = 1e15;
    const ev: CombatEvent[] = [];
    for (let i = 0; i < 50 && !ev.some((e) => e.type === 'hit' && e.target === 'hero'); i++) step(s, ev);
    expect(ev.some((e) => e.type === 'death')).toBe(false);
    expect(s.hero.hp).toBeGreaterThan(0);
    expect(s.hero.sanctity).toBeGreaterThan(SANCTITY_SECONDS * 10 - 50);
    // il colpo successivo, con la Santità in ricarica, è mortale
    const more: CombatEvent[] = [];
    for (let i = 0; i < 100 && !more.some((e) => e.type === 'death'); i++) step(s, more);
    expect(more.some((e) => e.type === 'death')).toBe(true);
  });

  it('migra da v14 con la Santità pronta', () => {
    const s = newGame(0, 2);
    const { sanctity: _, ...hero } = s.hero;
    const back = deserialize(serialize({ ...s, hero: hero as GameState['hero'], version: 14 }))!;
    expect(back.version).toBe(STATE_VERSION);
    expect(back.hero.sanctity).toBe(0);
  });
});
