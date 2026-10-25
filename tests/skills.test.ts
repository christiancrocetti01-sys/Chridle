import { describe, expect, it } from 'vitest';
import { step, type CombatEvent } from '../src/core/combat';
import { deserialize, runeRefund, serialize } from '../src/core/save';
import { canSocket, levelCost } from '../src/core/runes';
import { bestElement, canCast, castSkills, levelSkill, newSkills, skillLevelCost, skillValue, unlockSkills } from '../src/core/skills';
import { RUNE_PLAN, autoEssence, wantedRunes } from '../src/core/auto';
import { skillDef } from '../src/data/skills';
import { STATE_VERSION, newGame } from '../src/core/state';
import { stateStats } from '../src/core/stats';
import { LIGHT_PER_HIT, LIGHT_PER_SECOND, MAX_LIGHT, SKILLS } from '../src/data/skills';

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
  it('6 skill fisse: a livello 1 c’è solo Colpo Sacro, salendo si aggiungono in ordine di priorità', () => {
    expect(SKILLS).toHaveLength(6);
    const s = newSkills(1);
    expect(s.slots).toEqual(['colpoSacro']);
    expect(unlockSkills(s, 12)).toEqual(['preghiera', 'squarcio']);
    expect(s.slots).toEqual(['preghiera', 'squarcio', 'colpoSacro']);
    unlockSkills(s, 100);
    expect(s.slots).toEqual(SKILLS.map((d) => d.id));
  });

  it('i livelli costano Essenza e alzano l\'effetto del 10% ciascuno', () => {
    const s = fighting(1);
    const def = skillDef('colpoSacro')!;
    const base = skillValue(s, stateStats(s), def);
    expect(levelSkill(s, 'colpoSacro')).toBe(false);
    s.essence = skillLevelCost(1);
    expect(levelSkill(s, 'colpoSacro')).toBe(true);
    expect(s.essence).toBe(0);
    expect(skillValue(s, stateStats(s), def)).toBeCloseTo(base * 1.1);
    expect(levelSkill(s, 'giudizio')).toBe(false); // non ancora sbloccata
  });

  it('l\'Essenza si spende da sola, sempre nella cosa più economica, e le rune si incastonano', () => {
    const s = fighting(50);
    s.essence = 5000;
    expect(autoEssence(s)).toBeGreaterThan(5);
    expect(s.essence).toBeLessThan(skillLevelCost(1) * 10);
    expect(Object.keys(s.skills.levels).length).toBeGreaterThan(0);
    expect(s.runes.sockets.colpoSacro).toContain('potenza');
    expect(s.runes.sockets.preghiera).toContain('custodia');
  });

  it('le esplosioni usano l\'elemento a cui il nemico è più debole', () => {
    const s = fighting(1);
    const e = bestElement(s, stateStats(s));
    // la famiglia del primo nemico (non-morti) è debole al Sacro
    expect(e).toBe('holy');
  });

  it('la Luce sale colpendo e col tempo in combattimento, fino al massimo', () => {
    const s = fighting();
    s.skills.slots = [];
    const ev: CombatEvent[] = [];
    for (let i = 0; i < 20; i++) step(s, ev);
    const hits = ev.filter((e) => e.type === 'hit' && e.target === 'enemy').length;
    expect(hits).toBeGreaterThan(0);
    expect(s.hero.light).toBeCloseTo(hits * LIGHT_PER_HIT + 2 * LIGHT_PER_SECOND);
    for (let i = 0; i < 200; i++) step(s);
    expect(s.hero.light).toBe(MAX_LIGHT);
  });

  it('soglie: cura solo a vita bassa, scudo solo se è quasi finito, velocità solo se scaduta', () => {
    const s = fighting(30);
    const hero = stateStats(s);
    const cast = (id: string) => {
      s.skills.slots = [id];
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

  it('ogni skill fa qualcosa (danno, cura, scudo o velocità)', () => {
    for (const def of SKILLS) {
      const s = fighting(Math.max(30, def.level));
      s.skills.slots = [def.id];
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

  it('migrazione fino all\'ultima versione: Luce a 0 e skill del livello negli slot', () => {
    const { skills, ...rest } = newGame(0);
    const v7 = { ...rest, version: 7, hero: { ...rest.hero, level: 10, light: undefined } };
    const s = deserialize(JSON.stringify(v7))!;
    expect(s.version).toBe(STATE_VERSION);
    expect(s.hero.light).toBe(0);
    expect(s.skills.slots).toEqual(['preghiera', 'colpoSacro']);
    expect(skills).toBeDefined();
    expect(deserialize(serialize(s))).toEqual(s);
  });

  it('il piano delle rune è valido: compatibili con la skill e tutte nell\'ordine di sblocco', () => {
    const s = fighting(100);
    expect(wantedRunes(s)).toHaveLength(new Set(Object.values(RUNE_PLAN).flat()).size);
    for (const [id, runes] of Object.entries(RUNE_PLAN)) {
      runes.forEach((r) => (s.runes.levels[r] = 1));
      runes.forEach((r, i) => expect(canSocket(s, id, i, r), `${id}/${r}`).toBe(true));
    }
  });

  it('migrazione v20 → v21: rune azzerate e rimborsate in Essenza, livelli delle skill a 1', () => {
    const old = newGame(0, 5);
    old.hero.level = 30;
    old.essence = 10;
    old.runes = { levels: { potenza: 3, esecuzione: 1 }, sockets: { geloEterno: ['potenza', null] } };
    (old.skills as { slots: (string | null)[] }).slots = ['geloEterno', 'colpoSacro', null, null];
    const s = deserialize(JSON.stringify({ ...old, version: 20 }))!;
    expect(s.essence).toBe(10 + runeRefund(old.runes));
    expect(runeRefund(old.runes)).toBe(50 + 80 + levelCost(1) + levelCost(2));
    expect(s.runes.levels).toEqual({});
    expect(s.skills.slots).toEqual(['preghiera', 'egida', 'lamaRapida', 'squarcio', 'colpoSacro']);
    expect(s.skills.levels).toEqual({});
  });
});
