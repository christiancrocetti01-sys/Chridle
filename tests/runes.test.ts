import { describe, expect, it } from 'vitest';
import { step, type CombatEvent } from '../src/core/combat';
import {
  canSocket, essenceFor, levelCost, levelRune, runeValue, socketRune, unlockCost, unlockRune,
} from '../src/core/runes';
import { deserialize, serialize } from '../src/core/save';
import { castSkills, newSkills } from '../src/core/skills';
import { STATE_VERSION, newGame, type GameState } from '../src/core/state';
import { stateStats } from '../src/core/stats';
import { RUNES, RUNE_UNLOCK_BASE, RUNE_UNLOCK_GROWTH, type RuneId } from '../src/data/runes';
import { skillDef } from '../src/data/skills';

function fighting(level = 30) {
  const s = newGame(0, 3);
  s.hero.level = level;
  s.skills = newSkills(level);
  while (!s.enemy) step(s);
  s.essence = 1e9; // dopo i passi: altrimenti l'Essenza si spenderebbe da sola
  s.enemy!.hp = s.enemy!.maxHp = 1e12;
  s.enemy!.atk = 0;
  s.enemy!.family = 'bestie'; // niente resistenze a sacro e ombra
  return s;
}

/** Lancia una volta `skill` con le rune indicate e restituisce gli eventi. */
function castWith(s: GameState, skill: string, runes: RuneId[]): CombatEvent[] {
  for (const r of runes) if (!s.runes.levels[r]) unlockRune(s, r);
  runes.forEach((r, i) => expect(socketRune(s, skill, i, r), r).toBe(true));
  s.skills.slots = [skill, null, null, null];
  s.skills.cooldowns[skill] = 0;
  s.hero.light = 100;
  const ev: CombatEvent[] = [];
  castSkills(s, stateStats(s), ev);
  return ev;
}

const dmg = (ev: CombatEvent[]) => (ev[0] as { amount: number }).amount;

describe('Essenza e sblocco delle rune', () => {
  it('i nemici danno Essenza, i boss ×10, e cresce con lo stage', () => {
    expect(essenceFor(1, false)).toBeCloseTo(1.1);
    expect(essenceFor(1, true)).toBeCloseTo(11);
    expect(essenceFor(20, false)).toBeCloseTo(3);
    const s = newGame(0, 1);
    const ev: CombatEvent[] = [];
    for (let i = 0; i < 2000 && !ev.some((e) => e.type === 'kill'); i++) step(s, ev);
    expect(s.essence).toBeCloseTo(1.1);
  });

  it('sbloccare costa 50 e poi ×1,6 per runa già sbloccata; i livelli ×1,5', () => {
    const s = newGame(0);
    s.essence = 1000;
    expect(unlockCost(s)).toBe(RUNE_UNLOCK_BASE);
    expect(unlockRune(s, 'potenza')).toBe(true);
    expect(unlockRune(s, 'potenza')).toBe(false);
    expect(unlockCost(s)).toBe(Math.ceil(RUNE_UNLOCK_BASE * RUNE_UNLOCK_GROWTH));
    expect(s.essence).toBe(950);
    const c = levelCost(1);
    expect(levelRune(s, 'potenza')).toBe(true);
    expect(s.essence).toBe(950 - c);
    expect(levelCost(2)).toBeGreaterThan(c);
    expect(runeValue(s, 'potenza')).toBeCloseTo(0.55);
  });

  it('senza Essenza non si sblocca', () => {
    const s = newGame(0);
    expect(unlockRune(s, 'potenza')).toBe(false);
    expect(s.runes.levels).toEqual({});
  });

  it('incastonatura: serve la runa sbloccata, niente doppioni, rune di danno solo su skill di danno', () => {
    const s = fighting();
    expect(canSocket(s, 'colpoSacro', 0, 'potenza')).toBe(false);
    unlockRune(s, 'potenza');
    unlockRune(s, 'esecuzione');
    expect(socketRune(s, 'colpoSacro', 0, 'potenza')).toBe(true);
    expect(canSocket(s, 'colpoSacro', 1, 'potenza')).toBe(false);
    expect(socketRune(s, 'giudizio', 0, 'potenza')).toBe(true); // la stessa runa su più skill
    expect(canSocket(s, 'preghiera', 0, 'esecuzione')).toBe(false);
    expect(canSocket(s, 'colpoSacro', 2, 'esecuzione')).toBe(false);
    expect(socketRune(s, 'colpoSacro', 0, null)).toBe(true);
    expect(s.runes.sockets.colpoSacro).toEqual([null, null]);
  });
});

describe('effetti delle rune', () => {
  const base = () => dmg(castWith(fighting(), 'colpoSacro', []));

  it('Potenza ed Esecuzione aumentano il danno', () => {
    const b = base();
    expect(dmg(castWith(fighting(), 'colpoSacro', ['potenza']))).toBeCloseTo(b * 1.5);
    const e = fighting();
    e.enemy!.hp = e.enemy!.maxHp * 0.1;
    expect(dmg(castWith(e, 'colpoSacro', ['esecuzione']))).toBeCloseTo(b * 2);
    expect(dmg(castWith(fighting(), 'colpoSacro', ['esecuzione']))).toBeCloseTo(b);
  });

  it('Ferita Aperta (nemico che sanguina) e Pazienza (ricarica lunga)', () => {
    const b = base();
    const bleeding = fighting();
    bleeding.enemy!.bleed = 1;
    expect(dmg(castWith(bleeding, 'colpoSacro', ['feritaAperta']))).toBeCloseTo(b * 1.5);
    expect(dmg(castWith(fighting(), 'colpoSacro', ['feritaAperta']))).toBeCloseTo(b);
    expect(dmg(castWith(fighting(), 'colpoSacro', ['pazienza']))).toBeCloseTo(b * (1 + 0.08 * skillDef('colpoSacro')!.cooldown));
  });

  it('Bastione dà scudo', () => {
    const s = fighting();
    castWith(s, 'colpoSacro', ['bastione']);
    expect(s.hero.shield).toBeCloseTo(stateStats(s).maxHp * 0.05);
  });

  it('Custodia solo sulle skill di supporto', () => {
    const s = fighting();
    unlockRune(s, 'custodia');
    expect(canSocket(s, 'colpoSacro', 0, 'custodia')).toBe(false);
    expect(canSocket(s, 'egida', 0, 'custodia')).toBe(true);
    const plain = fighting();
    plain.hero.shield = 0;
    const a = dmg(castWith(plain, 'egida', []));
    const boosted = fighting();
    boosted.hero.shield = 0;
    expect(dmg(castWith(boosted, 'egida', ['custodia']))).toBeCloseTo(a * 1.6);
  });

  it('Persistenza allunga la velocità, Purificazione cura la vita mancante', () => {
    const s = fighting();
    castWith(s, 'lamaRapida', ['persistenza']);
    expect(s.hero.buffs.find((x) => x.key === 'skill:lamaRapida')!.ticks).toBe(5 * 1.5 * 10);
    const plain = fighting();
    plain.hero.hp = 10;
    castWith(plain, 'preghiera', []);
    const pure = fighting();
    pure.hero.hp = 10;
    castWith(pure, 'preghiera', ['purificazione']);
    expect(pure.hero.hp).toBeGreaterThan(plain.hero.hp);
  });

  it('ogni runa ha una descrizione; sono 8', () => {
    for (const r of RUNES) expect(r.text(r.value).length).toBeGreaterThan(5);
    expect(RUNES).toHaveLength(8);
  });
});

describe('salvataggio v9', () => {
  it('migra da v8 con Essenza 0 e nessuna runa', () => {
    const { essence, runes, ...rest } = newGame(0);
    const s = deserialize(JSON.stringify({ ...rest, version: 8 }))!;
    expect(s.version).toBe(STATE_VERSION);
    expect(s.essence).toBe(0);
    expect(s.runes).toEqual({ levels: {}, sockets: {} });
    expect(essence).toBe(0);
    expect(runes).toBeDefined();
    expect(deserialize(serialize(s))).toEqual(s);
  });
});

describe('migrazioni delle rune', () => {
  it('migra da v13: le rune tornano Essenza (v21, rune automatiche)', () => {
    const s = newGame(0, 2);
    s.essence = 1000;
    unlockRune(s, 'potenza');
    unlockRune(s, 'esecuzione');
    levelRune(s, 'esecuzione');
    const back = deserialize(serialize({ ...s, version: 13 }))!;
    expect(back.version).toBe(STATE_VERSION);
    expect(back.essence).toBe(1000);
    expect(back.runes.levels).toEqual({});
  });

});
