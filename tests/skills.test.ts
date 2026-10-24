import { describe, expect, it } from 'vitest';
import { step, type CombatEvent } from '../src/core/combat';
import { deserialize, serialize } from '../src/core/save';
import { canCast, castSkills, moveSlot, newSkills, setSlot, unlockSkills } from '../src/core/skills';
import { STATE_VERSION, newGame } from '../src/core/state';
import { stateStats } from '../src/core/stats';
import { LIGHT_PER_HIT, LIGHT_PER_SECOND, MAX_LIGHT, SKILLS, SKILL_SLOTS } from '../src/data/skills';

function fighting(level = 1) {
  const s = newGame(0, 3);
  s.hero.level = level;
  s.skills = newSkills(level);
  while (!s.enemy) step(s);
  s.enemy!.hp = s.enemy!.maxHp = 1e12; // non muore: si osservano le skill
  s.enemy!.atk = 0;
  return s;
}

describe('skill attive', () => {
  it('a livello 1 c’è solo Colpo Sacro; salendo le nuove skill riempiono gli slot liberi', () => {
    const s = newSkills(1);
    expect(s.slots).toEqual(['colpoSacro', null, null, null]);
    expect(unlockSkills(s, 8)).toEqual(['preghiera', 'lamaRapida', 'fiammaPurificatrice']);
    expect(unlockSkills(s, 30)).toEqual([]); // slot pieni
    expect(s.slots).toHaveLength(SKILL_SLOTS);
  });

  it('una skill tolta da uno slot non torna da sola', () => {
    const s = fighting(5);
    setSlot(s, 1, null);
    expect(unlockSkills(s.skills, 5)).toEqual([]);
    expect(s.skills.slots[1]).toBeNull();
  });

  it('la Luce sale colpendo e col tempo in combattimento, fino al massimo', () => {
    const s = fighting();
    s.skills.slots = [null, null, null, null];
    const ev: CombatEvent[] = [];
    for (let i = 0; i < 20; i++) step(s, ev);
    const hits = ev.filter((e) => e.type === 'hit' && e.target === 'enemy').length;
    expect(hits).toBeGreaterThan(0);
    expect(s.hero.light).toBeCloseTo(hits * LIGHT_PER_HIT + 2 * LIGHT_PER_SECOND);
    for (let i = 0; i < 200; i++) step(s);
    expect(s.hero.light).toBe(MAX_LIGHT);
  });

  it('soglie: cura solo a vita bassa, scudo solo se è quasi finito, velocità solo se scaduta', () => {
    const s = fighting(12);
    const hero = stateStats(s);
    const cast = (id: string) => {
      s.skills.slots = [id, null, null, null];
      s.skills.cooldowns[id] = 0;
      s.hero.light = 100;
      const ev: CombatEvent[] = [];
      castSkills(s, hero, ev);
      return ev.length;
    };
    s.hero.hp = hero.maxHp * 0.6;
    expect(cast('preghiera')).toBe(0);
    s.hero.hp = hero.maxHp * 0.4;
    expect(cast('preghiera')).toBe(1);
    expect(cast('egida')).toBe(1);
    expect(cast('egida')).toBe(0); // lo scudo c'è già
    expect(cast('lamaRapida')).toBe(1);
    expect(cast('lamaRapida')).toBe(0); // effetto ancora attivo
  });

  it('il lancio consuma Luce e avvia la ricarica', () => {
    const s = fighting();
    s.hero.light = 100;
    const hp = s.enemy!.hp;
    const ev: CombatEvent[] = [];
    castSkills(s, stateStats(s), ev);
    expect(ev).toEqual([expect.objectContaining({ type: 'skill', id: 'colpoSacro' })]);
    expect(s.hero.light).toBe(70);
    expect(s.enemy!.hp).toBeLessThan(hp);
    expect(canCast(s, stateStats(s), 'colpoSacro')).toBe(false);
    for (let i = 0; i < 29; i++) step(s);
    expect(s.skills.cooldowns.colpoSacro).toBe(1);
    const next: CombatEvent[] = [];
    step(s, next); // ricarica finita: si rilancia subito
    expect(next).toContainEqual(expect.objectContaining({ type: 'skill', id: 'colpoSacro' }));
  });

  it('senza Luce sufficiente non si lancia nulla', () => {
    const s = fighting();
    s.hero.light = 20;
    const ev: CombatEvent[] = [];
    castSkills(s, stateStats(s), ev);
    expect(ev).toEqual([]);
  });

  it('l’ordine degli slot è la priorità, e si può cambiare', () => {
    const s = fighting(5);
    expect(s.skills.slots).toEqual(['colpoSacro', 'preghiera', 'lamaRapida', null]);
    moveSlot(s, 2, -1);
    moveSlot(s, 1, -1);
    expect(s.skills.slots[0]).toBe('lamaRapida');
    s.hero.light = 100;
    const ev: CombatEvent[] = [];
    castSkills(s, stateStats(s), ev);
    expect(ev[0]).toMatchObject({ id: 'lamaRapida' });
    expect(s.hero.buffs).toContainEqual(expect.objectContaining({ key: 'skill:lamaRapida', speedPct: 0.4 }));
  });

  it('setSlot scambia gli slot e rifiuta le skill non sbloccate', () => {
    const s = fighting(5);
    expect(setSlot(s, 3, 'giudizio')).toBe(false);
    expect(setSlot(s, 0, 'lamaRapida')).toBe(true);
    expect(s.skills.slots).toEqual(['lamaRapida', 'preghiera', 'colpoSacro', null]);
  });

  it('ogni skill fa qualcosa (danno, cura, scudo o velocità)', () => {
    for (const def of SKILLS) {
      const s = fighting(Math.max(30, def.level));
      s.skills.slots = [def.id, null, null, null];
      if (def.via) s.vie.main = def.via;
      s.hero.light = 100;
      s.hero.hp = 1;
      s.hero.buffs = [];
      const ev: CombatEvent[] = [];
      castSkills(s, stateStats(s), ev);
      expect(ev, def.id).toHaveLength(1);
      expect((ev[0] as { amount: number }).amount).toBeGreaterThan(0);
    }
  });

  it('la morte azzera la Luce', () => {
    const s = fighting();
    s.hero.light = 90;
    s.enemy!.atk = 1e9;
    for (let i = 0; i < 100 && s.totals.deaths === 0; i++) step(s);
    expect(s.totals.deaths).toBe(1);
    expect(s.hero.light).toBe(0);
  });

  it('migrazione v7 → v8: Luce a 0 e skill del livello negli slot', () => {
    const { skills, ...rest } = newGame(0);
    const v7 = { ...rest, version: 7, hero: { ...rest.hero, level: 10, light: undefined } };
    const s = deserialize(JSON.stringify(v7))!;
    expect(s.version).toBe(STATE_VERSION);
    expect(s.hero.light).toBe(0);
    expect(s.skills.slots).toEqual(['colpoSacro', 'preghiera', 'lamaRapida', 'fiammaPurificatrice']);
    expect(skills).toBeDefined();
    expect(deserialize(serialize(s))).toEqual(s);
  });
});
