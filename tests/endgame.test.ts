import { describe, expect, it } from 'vitest';
import { skillLevel } from '../src/core/skills';
import { step, type CombatEvent } from '../src/core/combat';
import { abyssUnlocked, canRebirth, gainParagon, paragonFree, rebirth, resetParagon, spendParagon } from '../src/core/endgame';
import { abyssStage, abyssStart, enterAbyss } from '../src/core/modes';
import { applyOffline } from '../src/core/offline';
import { deserialize, serialize } from '../src/core/save';
import { STATE_VERSION, newGame, type GameState } from '../src/core/state';
import { stateStats } from '../src/core/stats';
import { ABYSS_ASCENSIONS, ABYSS_HP, ABYSS_WAVES, PARAGON, REBIRTH_SCINTILLE, paragonCost, soliFor } from '../src/data/endgame';

const run = (s: GameState, ticks: number) => {
  const ev: CombatEvent[] = [];
  for (let i = 0; i < ticks; i++) step(s, ev);
  return ev;
};
/** Uccide subito il nemico in campo (aspettando che compaia). */
function killOne(s: GameState) {
  while (!s.enemy) step(s);
  s.enemy.hp = 0.01;
  s.enemy.bleed = 1;
  s.enemy.mechanics = [];
  return run(s, 1);
}

describe('Abisso', () => {
  it(`si sblocca dopo ${ABYSS_ASCENSIONS} Ascensioni o con una Rinascita`, () => {
    const s = newGame(0, 1);
    expect(enterAbyss(s)).toBe(false);
    s.ascension.count = ABYSS_ASCENSIONS;
    expect(abyssUnlocked(s)).toBe(true);
    s.ascension.count = 0;
    s.rebirth.count = 1;
    expect(enterAbyss(s)).toBe(true);
    expect(s.mode).toMatchObject({ kind: 'abyss', depth: 1, wave: 0 });
  });

  it('nemici più forti dello stage equivalente; si riparte poco sotto il record', () => {
    const s = newGame(0, 1);
    s.rebirth.count = 1;
    s.abyss.best = 10;
    enterAbyss(s);
    expect(s.mode).toMatchObject({ depth: abyssStart(10) });
    while (!s.enemy) step(s);
    const e = s.enemy;
    expect(e.maxHp).toBeGreaterThan(40 * Math.pow(1.2, abyssStage(abyssStart(10)) - 1) * ABYSS_HP * 0.5);
  });

  it('10 nemici e il Guardiano: profondità successiva, record ed esperienza Paragon', () => {
    const s = newGame(0, 1);
    s.rebirth.count = 1;
    s.hero.hp = 1e30;
    enterAbyss(s);
    for (let i = 0; i < ABYSS_WAVES; i++) killOne(s);
    expect(s.mode).toMatchObject({ kind: 'abyss', depth: 1, wave: ABYSS_WAVES });
    expect(s.paragon.xp + s.paragon.level).toBeGreaterThan(0);
    while (!s.enemy) step(s);
    expect(s.enemy.name).toContain('Guardiano');
    killOne(s);
    expect(s.mode).toMatchObject({ kind: 'abyss', depth: 2, wave: 0 });
    expect(s.abyss.best).toBe(1);
  });

  it('se si cade si torna alla Campagna; offline la modalità si chiude', () => {
    const s = newGame(0, 1);
    s.rebirth.count = 1;
    enterAbyss(s);
    while (!s.enemy) step(s);
    s.hero.hp = 0.001;
    run(s, 200);
    expect(s.mode.kind).toBe('campaign');
    enterAbyss(s);
    applyOffline(s, 120);
    expect(s.mode.kind).toBe('campaign');
  });
});

describe('Paragon', () => {
  it('livelli con costo crescente, un punto per livello', () => {
    const s = newGame(0, 1);
    expect(gainParagon(s, paragonCost(0) + paragonCost(1))).toBe(2);
    expect(paragonFree(s.paragon)).toBe(2);
    expect(paragonCost(10)).toBeGreaterThan(paragonCost(1));
  });

  it('i punti spesi entrano nelle statistiche e si possono riprendere', () => {
    const s = newGame(0, 1);
    gainParagon(s, 1e6);
    const before = stateStats(s).atk;
    expect(spendParagon(s, 'forza')).toBe(true);
    expect(stateStats(s).atk).toBeCloseTo(before * (1 + PARAGON[0].mods[0][1]));
    resetParagon(s);
    expect(stateStats(s).atk).toBeCloseTo(before);
    s.paragon.level = 0;
    expect(spendParagon(s, 'forza')).toBe(false);
  });
});

describe('Rinascita Solare', () => {
  const ready = () => {
    const s = newGame(0, 1);
    s.ascension = { count: 12, scintille: 30, total: REBIRTH_SCINTILLE, perks: { fiamma: 8, balzo: 5, slot: 1, secondaVia: 1 } };
    s.skills.slots.push(null);
    s.vie.secondUnlocked = true;
    s.stage = { current: 80, best: 80, kills: 0, auto: true };
    s.hero.level = 120;
    s.paragon.level = 7;
    return s;
  };

  it(`serve aver guadagnato ${REBIRTH_SCINTILLE} Scintille nel ciclo`, () => {
    const s = ready();
    s.ascension.total = REBIRTH_SCINTILLE - 1;
    expect(canRebirth(s)).toBe(false);
    expect(soliFor(REBIRTH_SCINTILLE)).toBeGreaterThan(0);
  });

  it('azzera Ascensioni e potenziamenti (tranne slot e Doppia Via), tiene Paragon e oggetti', () => {
    const s = ready();
    const gain = rebirth(s);
    expect(gain).toBe(soliFor(REBIRTH_SCINTILLE));
    expect(s.rebirth).toEqual({ count: 1, soli: gain });
    expect(s.ascension).toEqual({ count: 0, scintille: 0, total: 0, perks: { slot: 1, secondaVia: 1 } });
    expect(s.stage).toMatchObject({ current: 1, best: 1 });
    expect(s.hero.level).toBe(1);
    expect(skillLevel(s, 'colpoSacro')).toBe(6);
    expect(s.vie.secondUnlocked).toBe(true);
    expect(s.paragon.level).toBe(7);
  });

  it('la soglia conta le Scintille senza il bonus dei Soli', () => {
    const s = ready();
    s.rebirth.soli = 4; // Scintille ×2
    expect(canRebirth(s)).toBe(false);
    s.ascension.total = REBIRTH_SCINTILLE * 2;
    expect(canRebirth(s)).toBe(true);
  });

  it('i Soli moltiplicano attacco, vita e ricompense', () => {
    const a = newGame(0, 1);
    const b = newGame(0, 1);
    b.rebirth.soli = 2;
    const sa = stateStats(a);
    const sb = stateStats(b);
    expect(sb.atk / sa.atk).toBeCloseTo(3);
    expect(sb.maxHp / sa.maxHp).toBeCloseTo(3);
    expect(sb.goldMult / sa.goldMult).toBeCloseTo(2);
  });
});

describe('salvataggio v20', () => {
  it('migra un v19 aggiungendo Abisso, Paragon e Rinascita', () => {
    const s = newGame(0, 1) as unknown as Record<string, unknown>;
    delete s.abyss;
    delete s.paragon;
    delete s.rebirth;
    s.version = 19;
    const back = deserialize(JSON.stringify(s))!;
    expect(back.version).toBe(STATE_VERSION);
    expect(back.abyss).toEqual({ best: 0 });
    expect(back.paragon).toEqual({ level: 0, xp: 0, points: {} });
    expect(back.rebirth).toEqual({ count: 0, soli: 0 });
    expect(serialize(deserialize(serialize(back))!)).toBe(serialize(back));
  });
});
