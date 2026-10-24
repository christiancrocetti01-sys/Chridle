import { describe, expect, it } from 'vitest';
import { step, type CombatEvent } from '../src/core/combat';
import {
  canSocket, essenceFor, levelCost, levelRune, runeValue, socketRune, unlockCost, unlockRune,
} from '../src/core/runes';
import { deserialize, serialize } from '../src/core/save';
import { castOnCrit, castSkills, cooldownTicks, lightCost, newSkills } from '../src/core/skills';
import { STATE_VERSION, newGame, type GameState } from '../src/core/state';
import { stateStats } from '../src/core/stats';
import { RUNES, RUNE_UNLOCK_BASE, RUNE_UNLOCK_GROWTH, type RuneId } from '../src/data/runes';
import { skillDef } from '../src/data/skills';

function fighting(level = 30) {
  const s = newGame(0, 3);
  s.hero.level = level;
  s.skills = newSkills(level);
  s.essence = 1e9;
  while (!s.enemy) step(s);
  s.enemy!.hp = s.enemy!.maxHp = 1e12;
  s.enemy!.atk = 0;
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
    unlockRune(s, 'brace');
    expect(socketRune(s, 'colpoSacro', 0, 'potenza')).toBe(true);
    expect(canSocket(s, 'colpoSacro', 1, 'potenza')).toBe(false);
    expect(socketRune(s, 'giudizio', 0, 'potenza')).toBe(true); // la stessa runa su più skill
    expect(canSocket(s, 'preghiera', 0, 'brace')).toBe(false);
    expect(canSocket(s, 'colpoSacro', 2, 'brace')).toBe(false);
    expect(socketRune(s, 'colpoSacro', 0, null)).toBe(true);
    expect(s.runes.sockets.colpoSacro).toEqual([null, null]);
  });
});

describe('effetti delle rune', () => {
  it('Potenza, Ombra ed Esecuzione aumentano il danno', () => {
    const base = dmg(castWith(fighting(), 'colpoSacro', []));
    expect(dmg(castWith(fighting(), 'colpoSacro', ['potenza']))).toBeCloseTo(base * 1.5);
    const s = fighting();
    const hp = s.hero.hp;
    expect(dmg(castWith(s, 'colpoSacro', ['ombra']))).toBeCloseTo(base * 1.6);
    expect(s.hero.hp).toBeLessThan(hp);
    const e = fighting();
    e.enemy!.hp = e.enemy!.maxHp * 0.1;
    expect(dmg(castWith(e, 'colpoSacro', ['esecuzione']))).toBeCloseTo(base * 2);
  });

  it('Rapidità e Parsimonia riducono ricarica e costo', () => {
    const s = fighting();
    const def = skillDef('giudizio')!;
    castWith(s, 'giudizio', ['rapidita', 'parsimonia']);
    expect(cooldownTicks(s, stateStats(s), def)).toBe(Math.round(120 * 0.7));
    expect(lightCost(s, def)).toBeCloseTo(80 * 0.7, 0);
    expect(s.hero.light).toBeCloseTo(100 - lightCost(s, def));
  });

  it('Brace, Lacerazione e Sete aggiungono veleno, sanguinamento e cura', () => {
    const s = fighting();
    s.hero.hp = 1;
    const d = dmg(castWith(s, 'colpoSacro', ['brace', 'lacerazione']));
    expect(s.enemy!.poison).toBeCloseTo(d * 0.5);
    expect(s.enemy!.bleed).toBeCloseTo(d * 0.5);
    const h = fighting();
    h.hero.hp = 1;
    const d2 = dmg(castWith(h, 'colpoSacro', ['sete']));
    expect(h.hero.hp).toBeCloseTo(1 + d2 * 0.1);
  });

  it('Bastione dà scudo, Fervore velocità', () => {
    const s = fighting();
    castWith(s, 'colpoSacro', ['bastione', 'fervore']);
    expect(s.hero.shield).toBeCloseTo(stateStats(s).maxHp * 0.05);
    expect(s.hero.buffs).toContainEqual(expect.objectContaining({ key: 'rune:fervore:colpoSacro', speedPct: 0.15 }));
  });

  it('Eco a volte lancia due volte; senza la runa mai', () => {
    let doubles = 0;
    for (let seed = 0; seed < 200; seed++) {
      const s = fighting();
      s.rng = seed;
      if (castWith(s, 'colpoSacro', ['eco']).length === 2) doubles++;
    }
    expect(doubles).toBeGreaterThan(20);
    expect(doubles).toBeLessThan(90);
    expect(castWith(fighting(), 'colpoSacro', [])).toHaveLength(1);
  });

  it('Scintilla lancia gratis al critico se la ricarica è finita', () => {
    const s = fighting();
    castWith(s, 'giudizio', ['scintilla']);
    s.runes.levels.scintilla = 20; // probabilità 100%
    const ev: CombatEvent[] = [];
    castOnCrit(s, stateStats(s), ev);
    expect(ev).toHaveLength(0); // in ricarica
    s.skills.cooldowns.giudizio = 0;
    s.hero.light = 0;
    castOnCrit(s, stateStats(s), ev);
    expect(ev).toHaveLength(1);
    expect(s.hero.light).toBe(0);
  });

  it('ogni runa ha una descrizione', () => {
    for (const r of RUNES) expect(r.text(r.value).length).toBeGreaterThan(5);
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
