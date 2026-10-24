import { describe, expect, it } from 'vitest';
import { step, type CombatEvent } from '../src/core/combat';
import { deserialize, serialize } from '../src/core/save';
import { newSkills } from '../src/core/skills';
import { newGame } from '../src/core/state';
import { stateStats } from '../src/core/stats';
import { activeVie, chooseSecondVia, chooseVia } from '../src/core/vie';
import { VIA_LEVEL, VIE } from '../src/data/vie';

function hero(level = VIA_LEVEL) {
  const s = newGame(0, 5);
  s.hero.level = level;
  s.skills = newSkills(level);
  return s;
}

function fight(s: ReturnType<typeof hero>, ticks: number) {
  while (!s.enemy) step(s);
  s.enemy!.hp = s.enemy!.maxHp = 1e12;
  s.enemy!.atk = 0;
  const ev: CombatEvent[] = [];
  for (let i = 0; i < ticks; i++) step(s, ev);
  return ev;
}

describe('Vie', () => {
  it('si sceglie solo dal livello richiesto e si cambia gratis', () => {
    const s = hero(VIA_LEVEL - 1);
    expect(chooseVia(s, 'paladino')).toBe(false);
    s.hero.level = VIA_LEVEL;
    expect(chooseVia(s, 'paladino')).toBe(true);
    expect(chooseVia(s, 'lama')).toBe(true);
    expect(s.vie.main).toBe('lama');
  });

  it('le statistiche della Via si applicano, la seconda a metà', () => {
    const s = hero(30);
    const base = stateStats(s).maxHp;
    chooseVia(s, 'paladino');
    expect(stateStats(s).maxHp).toBeCloseTo(base * 1.25);
    expect(stateStats(s).rules.has('reflect')).toBe(true);
    chooseVia(s, 'lama');
    expect(chooseSecondVia(s, 'paladino')).toBe(false); // non ancora sbloccata
    s.vie.secondUnlocked = true;
    expect(chooseSecondVia(s, 'lama')).toBe(false); // uguale alla prima
    expect(chooseSecondVia(s, 'paladino')).toBe(true);
    expect(stateStats(s).maxHp).toBeCloseTo(base * 1.125);
    expect(activeVie(s.vie)).toEqual(['lama', 'paladino']);
    expect(stateStats(s).rules.has('doubleStrike') && stateStats(s).rules.has('reflect')).toBe(true);
  });

  it('Lama: colpi doppi; Custode: lo spirito colpisce; Inquisitore: bruciatura', () => {
    const count = (via: (typeof VIE)[number]['id'] | null) => {
      const s = hero(30);
      s.skills.slots = [null, null, null, null];
      if (via) chooseVia(s, via);
      s.skills.slots = [null, null, null, null];
      const ev = fight(s, 600);
      return { hits: ev.filter((e) => e.type === 'hit' && e.target === 'enemy').length, s };
    };
    const none = count(null);
    expect(count('lama').hits).toBeGreaterThan(none.hits * 1.15 * 1.1);
    const custode = count('custode').s;
    expect(custode.enemy!.maxHp - custode.enemy!.hp).toBeGreaterThan(none.s.enemy!.maxHp - none.s.enemy!.hp);
    expect(count('inquisitore').s.enemy!.poison).toBeGreaterThan(0);
  });

  it('Eclissiarca: più danni con meno vita; Paladino: riflette', () => {
    const s = hero(30);
    chooseVia(s, 'eclissiarca');
    s.hero.hp = stateStats(s).maxHp;
    const full = stateStats(s).atk;
    s.hero.hp = 1;
    expect(stateStats(s).atk).toBeGreaterThan(full * 1.9);

    const p = hero(30);
    chooseVia(p, 'paladino');
    p.skills.slots = [null, null, null, null];
    while (!p.enemy) step(p);
    p.enemy!.hp = p.enemy!.maxHp = 1e12;
    p.enemy!.atk = 50;
    p.hero.swing = -1e9; // l'eroe non attacca: il danno al nemico è solo riflesso
    for (let i = 0; i < 50; i++) step(p);
    expect(p.enemy!.hp).toBeLessThan(1e12);
  });

  it('il salvataggio conserva le Vie', () => {
    const s = hero(30);
    chooseVia(s, 'custode');
    expect(deserialize(serialize(s))!.vie.main).toBe('custode');
  });
});
