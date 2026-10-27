import { describe, expect, it } from 'vitest';
import { step } from '../src/core/combat';
import { bonusStarPoints, canRefund, canTake, pointsLeft, starPoints, refundStar, resetStars, takeStar } from '../src/core/constellations';
import { deserialize, serialize } from '../src/core/save';
import { castSkills, cooldownTicks, lightCost, newSkills } from '../src/core/skills';
import { STATE_VERSION, newGame } from '../src/core/state';
import { NO_CRIT_MULT, stateStats } from '../src/core/stats';
import { heal } from '../src/core/triggers';
import { STARS, STAR_BY_ID, START_ID, buildConstellations } from '../src/data/constellations';
import { skillDef } from '../src/data/skills';

function hero(level = 200) {
  const s = newGame(0, 3);
  s.hero.level = level;
  return s;
}

/** Prende in ordine i nodi del percorso più corto fino a `id`. */
function pathTo(id: string): string[] {
  const prev = new Map<string, string>([[START_ID, '']]);
  const queue = [START_ID];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const l of STAR_BY_ID.get(cur)!.links) if (!prev.has(l)) { prev.set(l, cur); queue.push(l); }
  }
  const path: string[] = [];
  for (let x = id; x !== START_ID; x = prev.get(x)!) path.unshift(x);
  return path;
}

describe('Costellazioni: struttura', () => {
  it('circa 300 nodi, id unici, collegamenti simmetrici e tutto raggiungibile dal centro', () => {
    expect(STARS.length).toBeGreaterThanOrEqual(140);
    expect(STAR_BY_ID.size).toBe(STARS.length);
    for (const n of STARS) for (const l of n.links) expect(STAR_BY_ID.get(l)!.links).toContain(n.id);
    for (const n of STARS) if (n.id !== START_ID) expect(pathTo(n.id).at(-1)).toBe(n.id);
    // 3 rami (4 notevoli ciascuno) + 5 regioni delle Vie (2 ciascuna) + 3 regioni «Oltre» (5 ciascuna), una chiave di volta per ognuno
    expect(STARS.filter((n) => n.kind === 'keystone')).toHaveLength(11);
    expect(STARS.filter((n) => n.kind === 'notable')).toHaveLength(37);
    expect(STARS.filter((n) => n.id.startsWith('oltre-'))).toHaveLength(51);
    // nessuna stella sovrapposta a un'altra
    for (const a of STARS) for (const b of STARS) if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y), `${a.id}/${b.id}`).toBeGreaterThan(20);
  });

  it('il generatore è deterministico', () => {
    expect(JSON.stringify(buildConstellations())).toBe(JSON.stringify(STARS));
  });
});

describe('Costellazioni: punti e collegamenti', () => {
  it('1 punto per livello, solo stelle collegate a quelle prese', () => {
    const s = hero(3);
    expect(pointsLeft(s)).toBe(2);
    expect(canTake(s, 'offesa-s2')).toBe(false);
    expect(takeStar(s, 'offesa-s1')).toBe(true);
    expect(takeStar(s, 'offesa-s2')).toBe(true);
    expect(takeStar(s, 'difesa-s1')).toBe(false); // punti finiti
  });

  it('punti in più dalla Torre (1 ogni 10 piani) e dalle Ascensioni (1 ogni 3)', () => {
    const s = { ...hero(3), tower: { best: 25 }, totals: { ascensions: 6 } };
    expect(bonusStarPoints(s)).toBe(2 + 2);
    expect(starPoints(s)).toBe(2 + 4);
    expect(pointsLeft(s)).toBe(6);
  });

  it('si restituisce solo una stella che non spezza l’albero; il respec è gratis', () => {
    const s = hero();
    for (const id of pathTo('offesa-s3')) takeStar(s, id);
    expect(canRefund(s, 'offesa-s1')).toBe(false);
    expect(refundStar(s, 'offesa-s3')).toBe(true);
    expect(s.stars).toEqual(['offesa-s1', 'offesa-s2']);
    resetStars(s);
    expect(s.stars).toEqual([]);
  });

  it('le statistiche delle stelle si sommano a quelle dell’eroe', () => {
    const s = hero();
    const base = stateStats(s);
    takeStar(s, 'offesa-s1'); // +4% attacco
    expect(stateStats(s).atk).toBeCloseTo(base.atk * 1.04);
  });

  it('migra da v9 senza stelle', () => {
    const { stars, ...rest } = newGame(0);
    const s = deserialize(JSON.stringify({ ...rest, version: 9 }))!;
    expect(s.version).toBe(STATE_VERSION);
    expect(s.stars).toEqual([]);
    expect(stars).toEqual([]);
  });

  it('il salvataggio conserva le stelle e scarta quelle sconosciute o staccate', () => {
    const s = hero();
    takeStar(s, 'offesa-s1');
    takeStar(s, 'offesa-s2');
    const raw = JSON.parse(serialize(s));
    expect(deserialize(JSON.stringify(raw))!.stars).toEqual(['offesa-s1', 'offesa-s2']);
    raw.stars = ['offesa-s2', 'inesistente', 'difesa-s1'];
    expect(deserialize(JSON.stringify(raw))!.stars).toEqual(['difesa-s1']);
  });
});

describe('Costellazioni: chiavi di volta', () => {
  const keystone = (id: string) => {
    const s = hero();
    for (const x of pathTo(id)) expect(takeStar(s, x), x).toBe(true);
    return s;
  };

  it('Colpo Assoluto: niente critici, +80% ai colpi', () => {
    const s = keystone('offesa-k');
    const st = stateStats(s);
    expect(st.critChance).toBe(0);
    const without = stateStats({ ...s, stars: s.stars.filter((x) => x !== 'offesa-k') });
    expect(st.atk).toBeCloseTo(without.atk * NO_CRIT_MULT);
    s.hero.nextCrit = true;
    s.skills = newSkills(1);
    while (!s.enemy) step(s);
    s.enemy!.hp = s.enemy!.maxHp = 1e12;
    s.enemy!.atk = 0;
    for (let i = 0; i < 200; i++) for (const e of step(s)) if (e.type === 'hit') expect(e.crit).toBe(false);
  });

  it('Luce Perpetua: skill gratis, ricarica doppia', () => {
    const s = keystone('luce-k');
    const def = skillDef('colpoSacro')!;
    const st = stateStats(s);
    expect(lightCost(st, def)).toBe(0);
    expect(cooldownTicks(st, def)).toBe(60);
    s.skills = newSkills(1);
    while (!s.enemy) step(s);
    s.hero.light = 0;
    const ev: { type: string }[] = [];
    castSkills(s, stateStats(s), ev as never);
    expect(ev).toHaveLength(1);
  });

  it('Martirio: la cura in eccesso diventa danno sacro', () => {
    const s = keystone('difesa-k');
    while (!s.enemy) step(s);
    const st = stateStats(s);
    s.hero.hp = st.maxHp - 10;
    const hp = s.enemy!.hp = s.enemy!.maxHp = 1e6;
    s.enemy!.family = 'bestie'; // nessuna resistenza al sacro
    heal(s, st, 110);
    expect(s.hero.hp).toBe(st.maxHp);
    expect(hp - s.enemy!.hp).toBeCloseTo(100 * st.elemMult.holy);
  });
});

describe('Costellazioni: chiavi di volta delle Vie', () => {
  const statsWith = (rule: string) => {
    const s = hero(2);
    const base = stateStats(s);
    s.stars = pathTo(`${rule}-k`).slice(1);
    s.hero.level = s.stars.length + 1;
    return { base, now: stateStats(s), s };
  };
  it('Giuramento, Mille Soli, Rogo Eterno, Costellazione Vivente, Sangue Nero', () => {
    const p = statsWith('paladino');
    expect(p.now.rules.has('oath')).toBe(true);
    expect(statsWith('lama').now.rules.has('twinStrike')).toBe(true);
    expect(statsWith('inquisitore').now.rules.has('dotDouble')).toBe(true);
    expect(statsWith('custode').now.rules.has('spiritHost')).toBe(true);
    const e = statsWith('eclissiarca');
    expect(e.now.rules.has('blackBlood')).toBe(true);
    // Mille Soli: il doppio dei colpi
    const hits = (s: ReturnType<typeof hero>) => {
      s.skills.slots = [null, null, null, null];
      while (!s.enemy) step(s);
      Object.assign(s.enemy!, { hp: 1e12, maxHp: 1e12, atk: 0 });
      let n = 0;
      for (let i = 0; i < 300; i++) n += step(s).filter((x) => x.type === 'hit' && x.target === 'enemy').length;
      return n;
    };
    const lama = statsWith('lama').s;
    const plain = hero(lama.hero.level);
    expect(hits(lama)).toBeGreaterThan(hits(plain) * 1.8);
  });
});
