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
    const s = fighting(50);
    const def = skillDef('giudizio')!;
    castWith(s, 'giudizio', ['rapidita', 'parsimonia']);
    expect(cooldownTicks(s, stateStats(s), def)).toBe(Math.round(def.cooldown * 10 * 0.7));
    expect(lightCost(s, stateStats(s), def)).toBeCloseTo(def.light * 0.7, 0);
    expect(s.hero.light).toBeCloseTo(100 - lightCost(s, stateStats(s), def));
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
    const s = fighting(50);
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

describe('rune del lotto 3', () => {
  const base = () => dmg(castWith(fighting(), 'colpoSacro', []));

  it('Condanna (boss), Apertura (vita piena), Fulgore (Luce piena)', () => {
    const b = base();
    const boss = fighting();
    boss.enemy!.boss = true;
    expect(dmg(castWith(boss, 'colpoSacro', ['condanna']))).toBeGreaterThan(b * 1.35 * stateStats(boss).bossMult - 1e-6);
    expect(dmg(castWith(fighting(), 'colpoSacro', ['apertura']))).toBeCloseTo(b * 2);
    const low = fighting();
    low.enemy!.hp = low.enemy!.maxHp * 0.5;
    expect(dmg(castWith(low, 'colpoSacro', ['apertura']))).toBeCloseTo(b);
    expect(dmg(castWith(fighting(), 'colpoSacro', ['fulgore']))).toBeCloseTo(b * 1.6);
  });

  it('le ex conversioni danno solo danno in più: l\'elemento lo sceglie la debolezza del nemico', () => {
    expect(dmg(castWith(fighting(), 'colpoSacro', ['incendio']))).toBeCloseTo(base() * 1.3);
    expect(dmg(castWith(fighting(), 'colpoSacro', ['brina']))).toBeCloseTo(base() * 1.3);
  });

  it('Luminescenza restituisce Luce, Catena accorcia le altre ricariche, Marchio e Consacrazione', () => {
    const s = fighting();
    castWith(s, 'colpoSacro', ['luminescenza']);
    expect(s.hero.light).toBeCloseTo(100 - 30 * 0.75);
    const c = fighting();
    c.skills.cooldowns.preghiera = 50;
    socketRune(c, 'colpoSacro', 0, null);
    unlockRune(c, 'catena');
    socketRune(c, 'colpoSacro', 0, 'catena');
    c.skills.slots = ['colpoSacro', 'preghiera', null, null];
    c.skills.cooldowns.colpoSacro = 0;
    c.hero.light = 100;
    castSkills(c, stateStats(c), []);
    expect(c.skills.cooldowns.preghiera).toBe(45);
    const m = fighting();
    m.runes.levels.marchio = 6; // 100%
    castWith(m, 'colpoSacro', ['marchio']);
    expect(m.hero.nextCrit).toBe(true);
    const k = fighting();
    const hp = k.enemy!.hp;
    const d = dmg(castWith(k, 'colpoSacro', ['consacrazione']));
    expect(hp - k.enemy!.hp).toBeCloseTo(d * 1.3);
  });

  it('Custodia solo sulle skill di supporto, Rinnovamento cura', () => {
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
    const r = fighting();
    r.hero.hp = 10;
    castWith(r, 'colpoSacro', ['rinnovamento']);
    expect(r.hero.hp).toBeGreaterThan(10);
  });

  it('lotto 4: Crepuscolo, Penetrazione, Massacro, Ferita Aperta, Disperazione, Pazienza', () => {
    const b = base();
    expect(dmg(castWith(fighting(), 'colpoSacro', ['crepuscolo']))).toBeCloseTo(b * 1.3);
    // l'elemento scelto è già una debolezza: la Penetrazione non ha resistenze da ignorare
    const frozen = dmg(castWith(fighting(), 'colpoSacro', ['brina']));
    expect(dmg(castWith(fighting(), 'colpoSacro', ['brina', 'penetrazione']))).toBeCloseTo(frozen);
    const elite = fighting();
    elite.enemy!.elite = 'robusto';
    expect(dmg(castWith(elite, 'colpoSacro', ['massacro']))).toBeCloseTo(b * 1.6);
    const bleeding = fighting();
    bleeding.enemy!.bleed = 1;
    expect(dmg(castWith(bleeding, 'colpoSacro', ['feritaAperta']))).toBeCloseTo(b * 1.5);
    expect(dmg(castWith(fighting(), 'colpoSacro', ['feritaAperta']))).toBeCloseTo(b);
    const low = fighting();
    low.hero.hp = stateStats(low).maxHp * 0.2;
    expect(dmg(castWith(low, 'colpoSacro', ['disperazione']))).toBeCloseTo(b * 1.8);
    expect(dmg(castWith(fighting(), 'colpoSacro', ['pazienza']))).toBeCloseTo(b * (1 + 0.08 * skillDef('colpoSacro')!.cooldown));
  });

  it('Risonanza conta le altre skill con un tag in comune; Supernova triplica; Alba solo al primo lancio', () => {
    const b = base();
    const s = fighting();
    unlockRune(s, 'risonanza');
    socketRune(s, 'colpoSacro', 0, 'risonanza');
    s.skills.slots = ['colpoSacro', 'preghiera', 'lamaRapida', null]; // Preghiera ha il tag sacro, Lama Rapida no
    s.hero.light = 100;
    const ev: CombatEvent[] = [];
    castSkills(s, stateStats(s), ev);
    expect(dmg(ev)).toBeCloseTo(b * 1.1);
    const nova = fighting();
    unlockRune(nova, 'supernova');
    nova.runes.levels.supernova = 100; // probabilità oltre il 100%
    expect(dmg(castWith(nova, 'colpoSacro', ['supernova']))).toBeCloseTo(b * 3);
    const dawn = fighting();
    expect(dmg(castWith(dawn, 'colpoSacro', ['alba']))).toBeCloseTo(b * 2);
    dawn.skills.cooldowns.colpoSacro = 0;
    dawn.hero.light = 100;
    const again: CombatEvent[] = [];
    castSkills(dawn, stateStats(dawn), again);
    expect(dmg(again)).toBeCloseTo(b);
  });

  it('Mietitura azzera la ricarica e Raccolto dà Essenza se il colpo uccide', () => {
    const s = fighting();
    s.enemy!.hp = 1;
    castWith(s, 'colpoSacro', ['mietitura', 'raccolto']);
    expect(s.skills.cooldowns.colpoSacro).toBe(0);
    expect(s.enemy!.harvest).toBeCloseTo(0.5);
    const alive = fighting();
    castWith(alive, 'colpoSacro', ['mietitura', 'raccolto']);
    expect(alive.skills.cooldowns.colpoSacro).toBeGreaterThan(0);
    expect(alive.enemy!.harvest).toBeUndefined();
  });

  it('Persistenza allunga la velocità, Purificazione cura la vita mancante, Grazia/Fortezza/Riflesso danno buff', () => {
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
    const g = fighting();
    const before = stateStats(g);
    castWith(g, 'colpoSacro', ['grazia', 'fortezza']);
    const after = stateStats(g);
    expect(after.dodge).toBeCloseTo(before.dodge + 0.1);
    expect(after.def).toBeGreaterThan(before.def * 1.29);
    const r = fighting();
    castWith(r, 'colpoSacro', ['riflesso']);
    expect(r.hero.buffs).toContainEqual(expect.objectContaining({ key: 'rune:riflesso:colpoSacro', reflect: 0.2, ticks: 30 }));
    // il riflesso colpisce il nemico quando l'eroe viene colpito (l'eroe non attacca e non lancia skill)
    r.hero.hp = stateStats(r).maxHp;
    r.enemy!.atk = r.hero.hp * 0.3; // colpisce senza uccidere
    r.hero.swing = -1e9;
    r.skills.slots = [null, null, null, null];
    const foe = r.enemy!;
    const hp = foe.hp;
    const ev: CombatEvent[] = [];
    for (let i = 0; i < 30 && !ev.some((e) => e.type === 'hit' && e.target === 'hero'); i++) step(r, ev);
    expect(ev.some((e) => e.type === 'hit' && e.target === 'hero')).toBe(true);
    expect(foe.hp).toBeLessThan(hp);
  });

  it('migra da v13: le rune tornano Essenza (v21, rune automatiche)', () => {
    const s = newGame(0, 2);
    s.essence = 1000;
    unlockRune(s, 'potenza');
    unlockRune(s, 'eco');
    levelRune(s, 'eco');
    const back = deserialize(serialize({ ...s, version: 13 }))!;
    expect(back.version).toBe(STATE_VERSION);
    expect(back.essence).toBe(1000);
    expect(back.runes.levels).toEqual({});
  });

  it('ci sono 40 rune', () => expect(RUNES).toHaveLength(40));
});
