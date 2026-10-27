import { describe, expect, it } from 'vitest';
import { step, type CombatEvent } from '../src/core/combat';
import { rollItem } from '../src/core/items';
import { deserialize } from '../src/core/save';
import { newSkills } from '../src/core/skills';
import { newGame, type GameState } from '../src/core/state';
import { stateStats } from '../src/core/stats';
import { STARS, STAR_BY_ID, START_ID } from '../src/data/constellations';
import { MAX_LIGHT } from '../src/data/skills';
import {
  CEASELESS_LIGHT, COLD_BLOOD_MULT, LAST_PRAYER_SECONDS, REAPER_STEP, TIME_STOP_EVERY_S, TIME_STOP_SPEED, type RuleId,
} from '../src/data/uniques';
import { TICK_RATE } from '../src/core/loop';

/** Percorso più corto dal centro fino alla stella con questa regola. */
function pathToRule(rule: RuleId): string[] {
  const target = STARS.find((n) => n.rule === rule)!.id;
  const prev = new Map<string, string>([[START_ID, '']]);
  const queue = [START_ID];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const l of STAR_BY_ID.get(cur)!.links) if (!prev.has(l)) { prev.set(l, cur); queue.push(l); }
  }
  const path: string[] = [];
  for (let x = target; x !== START_ID; x = prev.get(x)!) path.unshift(x);
  return path;
}

/** Partita con un nemico in campo (vita enorme) e le stelle fino alla regola (senza la regola se `off`). */
function game(rule: RuleId, off = false, level = 1): GameState {
  const s = newGame(0, 7);
  s.hero.level = level;
  s.skills = newSkills(level);
  const path = pathToRule(rule);
  s.stars = off ? path.slice(0, -1) : path; // più stelle che punti: le spese automatiche non toccano l'albero
  s.hero.hp = stateStats(s).maxHp;
  while (!s.enemy) step(s);
  s.enemy.hp = s.enemy.maxHp = 1e12;
  s.enemy.atk = 0; // l'eroe non muore (chi serve alza l'attacco)
  return s;
}
const run = (s: GameState, ticks: number) => {
  const ev: CombatEvent[] = [];
  for (let i = 0; i < ticks; i++) step(s, ev);
  return ev;
};
const dealt = (s: GameState, ticks: number) => {
  const before = s.enemy!.hp;
  run(s, ticks);
  return before - s.enemy!.hp;
};
/** Uccide il nemico corrente con il prossimo colpo. */
const killNow = (s: GameState) => {
  s.enemy!.hp = 1e-9;
  while (s.enemy) step(s);
};

describe('regione «Oltre»', () => {
  it('ogni regola è su una stella raggiungibile', () => {
    const rules: RuleId[] = ['chainBolt', 'battleBreath', 'blazingShield', 'reaper', 'sunrise', 'deepFreeze', 'livingFlames', 'riposte',
      'lightVampire', 'lastPrayer', 'armorBreak', 'skillEcho', 'judgeHammer', 'ceaselessLight', 'coldBlood', 'supernova', 'livingFortress', 'timeStop'];
    for (const r of rules) expect(stateStats(game(r)).rules.has(r), r).toBe(true);
  });

  it('Catena di Luce e Sole Nascente: più danno dei colpi normali', () => {
    for (const r of ['chainBolt', 'sunrise'] as RuleId[]) expect(dealt(game(r), 300), r).toBeGreaterThan(dealt(game(r, true), 300) * 1.1);
  });

  it('Martello del Giudizio: contro un boss il danno per colpo sale', () => {
    const s = game('judgeHammer');
    s.enemy!.boss = true;
    const hits = run(s, 600).filter((e) => e.type === 'hit' && e.target === 'enemy' && !e.crit).map((e) => (e as { amount: number }).amount);
    expect(hits.at(-1)!).toBeGreaterThan(hits[0] * 1.3);
  });

  it('Mietitore: +10% danni per uccisione; Respiro della Battaglia: ricarica la skill più lontana', () => {
    const s = game('reaper');
    const atk = stateStats(s).atk;
    killNow(s);
    expect(stateStats(s).atk).toBeCloseTo(atk * (1 + REAPER_STEP));
    const b = game('battleBreath', false, 20);
    b.skills.cooldowns = { colpoSacro: 5, preghiera: 50, squarcio: 20 };
    killNow(b);
    expect(b.skills.cooldowns.preghiera).toBe(0);
    expect(b.skills.cooldowns.squarcio).toBeGreaterThan(0);
  });

  it('Fiamme Vive: il veleno rimasto passa al nemico successivo', () => {
    const s = game('livingFlames');
    s.enemy!.poison = 1e6;
    killNow(s);
    while (!s.enemy) step(s);
    expect(s.enemy.poison).toBeGreaterThan(5e5);
    const t = game('livingFlames', true);
    t.enemy!.poison = 1e6;
    killNow(t);
    while (!t.enemy) step(t);
    expect(t.enemy.poison).toBeLessThan(1);
  });

  it('Colpo Spezzante: i critici tolgono fino al 50% della difesa', () => {
    const s = game('armorBreak');
    run(s, 2000);
    expect(s.enemy!.broken).toBeGreaterThan(0);
    expect(s.enemy!.broken).toBeLessThanOrEqual(0.5);
  });

  it('Sangue Freddo a vita piena; Tempo Fermo e Fortezza Vivente cambiano le statistiche', () => {
    const s = game('coldBlood');
    const full = stateStats(s).atk;
    s.hero.hp /= 2;
    expect(full).toBeCloseTo(stateStats(s).atk * COLD_BLOOD_MULT);
    expect(stateStats(game('timeStop')).attackSpeed).toBeCloseTo(stateStats(game('timeStop', true)).attackSpeed * TIME_STOP_SPEED);
    expect(stateStats(game('livingFortress')).dodge).toBe(0);
  });

  it('Tempo Fermo e Gelo Profondo bloccano il nemico', () => {
    const s = game('timeStop');
    while (s.tick % (TIME_STOP_EVERY_S * TICK_RATE) !== 0) step(s);
    expect(s.enemy!.frozen).toBeGreaterThan(0);
    const f = game('deepFreeze');
    const cold = rollItem({ rng: 1 }, 999, 1, 0, 'arma');
    cold.affixes = [{ id: 'cold', tier: 1, mods: [{ stat: 'cold', value: 50 }] }];
    f.gear.equipped.arma = cold;
    let frozen = false;
    for (let i = 0; i < 3000 && !frozen; i++) { step(f); frozen = f.enemy!.frozen > 0; }
    expect(frozen).toBe(true);
  });

  it('Fortezza Vivente: si subisce meno danno', () => {
    const taken = (off: boolean) => {
      const s = game('livingFortress', off);
      s.enemy!.atk = 1e3;
      return run(s, 200).filter((e) => e.type === 'hit' && e.target === 'hero').reduce((a, e) => a + (e as { amount: number }).amount, 0);
    };
    expect(taken(false)).toBeLessThan(taken(true) * 0.8);
  });

  it('Scudo Ardente: lo scudo che si rompe esplode sul nemico', () => {
    const s = game('blazingShield');
    s.enemy!.atk = 20;
    s.hero.shield = 1;
    s.enemy!.swing = 0.99;
    const hp = s.enemy!.hp;
    s.hero.swing = -1e9; // l'eroe non attacca: conta solo l'esplosione
    step(s);
    expect(hp - s.enemy!.hp).toBeGreaterThan(stateStats(s).maxHp * 0.2);
  });

  it('Vampiro di Luce: a vita piena il rubavita diventa scudo', () => {
    const s = game('lightVampire');
    run(s, 100);
    expect(s.hero.shield).toBeGreaterThan(0);
  });

  it('Ultima Preghiera: sotto il 20% della vita la Preghiera parte da sola, poi aspetta 20 s', () => {
    const s = game('lastPrayer', false, 5);
    s.hero.light = 0;
    s.hero.hp = stateStats(s).maxHp * 0.1;
    const ev = run(s, 1);
    expect(ev.some((e) => e.type === 'skill' && e.id === 'preghiera')).toBe(true);
    expect(s.hero.prayer).toBe(LAST_PRAYER_SECONDS * TICK_RATE);
  });

  it('Luce Incessante, Eco delle Skill e Supernova', () => {
    const l = game('ceaselessLight');
    l.hero.light = 30;
    const ev = run(l, 1);
    expect(ev.some((e) => e.type === 'skill')).toBe(true);
    expect(l.hero.light).toBeGreaterThanOrEqual(CEASELESS_LIGHT);
    const e = game('skillEcho');
    const events = run(e, 3000).filter((x) => x.type === 'skill');
    const off = run(game('skillEcho', true), 3000).filter((x) => x.type === 'skill');
    expect(events.length).toBeGreaterThan(off.length);
    const n = game('supernova');
    n.hero.light = 50;
    expect(run(n, 1).some((x) => x.type === 'skill')).toBe(false); // aspetta la Luce piena
    n.hero.light = MAX_LIGHT;
    expect(run(n, 1).some((x) => x.type === 'skill')).toBe(true);
  });

  it('Contrattacco: dopo una schivata un colpo in più', () => {
    const hits = (off: boolean) => {
      const s = game('riposte', off);
      return run(s, 3000).filter((e) => e.type === 'hit' && e.target === 'enemy').length;
    };
    expect(hits(false)).toBeGreaterThan(hits(true));
  });

  it('migrazione v23 → v24: contatori dell’eroe e stati del nemico', () => {
    const old = game('reaper');
    const h = old.hero as unknown as Record<string, unknown>;
    delete h.sunrise; delete h.prayer; delete h.embers;
    const s = deserialize(JSON.stringify({ ...old, version: 23 }))!;
    expect([s.hero.sunrise, s.hero.prayer, s.hero.embers, s.enemy!.frozen, s.enemy!.broken]).toEqual([0, 0, 0, 0, 0]);
  });
});
