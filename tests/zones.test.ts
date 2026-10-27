import { newGear } from '../src/core/items';
import { describe, expect, it } from 'vitest';
import { rewardStage, step, type CombatEvent } from '../src/core/combat';
import { enemyAtk, makeElite, resMult, spawnEnemy, tickEnemy } from '../src/core/enemies';
import { canExpedition, canRaid, dungeonLevel, enterDungeon, expedition, enterRaid, enterTower, leaveMode, towerBonus, towerStart } from '../src/core/modes';
import { deserialize, serialize } from '../src/core/save';
import { newGame, type GameState } from '../src/core/state';
import { KILLS_PER_STAGE, LATE_STAGE, stageEnemy, stateStats } from '../src/core/stats';
import { ENEMIES, FAMILIES, FURY_AFTER_S, ZONES, ZONE_KEY_EVERY, ZONE_STAGES, zoneName, zoneOf } from '../src/data/enemies';
import { DUNGEON_ESSENCE, DUNGEON_FRAGMENTS, DUNGEON_WAVES, RAID_KEYS, TOWER_GRAND_EVERY, RAID_STAGE, TOWER_KEY_EVERY, TOWER_MILESTONE } from '../src/data/modes';

const run = (s: GameState, ticks: number) => {
  const ev: CombatEvent[] = [];
  for (let i = 0; i < ticks; i++) step(s, ev);
  return ev;
};

/** Eroe fortissimo: uccide tutto al primo colpo e non muore. */
function god(s: GameState) {
  s.hero.level = 300;
  s.upgrades.forza = s.upgrades.corazza = 200;
  s.hero.hp = stateStats(s).maxHp;
  return s;
}

describe('zone e famiglie', () => {
  it('10 zone da 10 stage, poi si ricomincia con un numero romano', () => {
    expect(zoneOf(1).zone).toBe(ZONES[0]);
    expect(zoneOf(10)).toMatchObject({ zoneBoss: true, index: 0 });
    expect(zoneOf(11).zone).toBe(ZONES[1]);
    expect(zoneName(ZONES.length * ZONE_STAGES + 1)).toBe(`${ZONES[0].name} II`);
    for (const f of Object.keys(FAMILIES)) expect(ENEMIES.filter((e) => e.family === f)).toHaveLength(3);
  });

  it('i nemici sono della famiglia della zona, il boss di zona ha le sue meccaniche', () => {
    const s = newGame(0, 2);
    s.stage.current = 15;
    for (let i = 0; i < 20; i++) expect(spawnEnemy(s).family).toBe(ZONES[1].family);
    s.stage.current = 20;
    s.stage.kills = KILLS_PER_STAGE;
    const b = spawnEnemy(s);
    expect(b).toMatchObject({ boss: true, zoneBoss: true, name: ZONES[1].boss.name, mechanics: ZONES[1].mechanics });
  });

  it('resistenze: i Non-morti temono il sacro e resistono all’ombra', () => {
    const e = { family: 'nonmorti' as const };
    expect(resMult(e, 'holy')).toBe(1.5);
    expect(resMult(e, 'shadow')).toBe(0.5);
    expect(resMult(e, 'fire')).toBe(1);
  });

  it('meccaniche: furia, scudo a metà vita, evocazioni, rigenerazione', () => {
    const s = newGame(0, 1);
    s.stage.current = 50;
    s.stage.kills = KILLS_PER_STAGE;
    const e = spawnEnemy(s);
    e.mechanics = ['enrage', 'shield', 'summon', 'regen'];
    let summons = 0;
    for (let i = 0; i < 100; i++) if (tickEnemy(e, false, { push() {} }) > 0) summons++;
    expect(summons).toBe(3);
    expect(enemyAtk(e)).toBeCloseTo(e.atk * 1.5);
    e.hp = e.maxHp * 0.4;
    tickEnemy(e, false, { push() {} });
    expect(e.hp).toBeGreaterThan(e.maxHp * 0.65);
    expect(e.shielded).toBe(true);
  });

  it('le élite sono più forti e danno di più', () => {
    const s = newGame(0, 1);
    const e = spawnEnemy(s);
    const hp = e.maxHp;
    makeElite(e, 'robusto');
    expect(e.maxHp).toBe(hp * 4);
    expect(e.name).toContain('Robusto');
  });

  it('il boss di zona dà una chiave ogni due zone', () => {
    const s = god(newGame(0, 1));
    s.stage.current = s.stage.best = 10;
    s.stage.kills = KILLS_PER_STAGE;
    expect(run(s, 100).some((e) => e.type === 'key')).toBe(false);
    s.stage.current = s.stage.best = ZONE_KEY_EVERY;
    s.stage.kills = KILLS_PER_STAGE;
    const ev = run(s, 100);
    expect(ev).toContainEqual({ type: 'key', keys: 1 });
    expect(s.keys).toBe(1);
  });

  it('ribattere il boss di zona sotto il record non dà chiavi', () => {
    const s = god(newGame(0, 1));
    s.stage.current = ZONE_KEY_EVERY;
    s.stage.best = ZONE_KEY_EVERY + 1; // si è morti dopo il boss e si è tornati indietro
    s.stage.kills = KILLS_PER_STAGE;
    const ev = run(s, 100);
    expect(s.stage.current).toBeGreaterThan(ZONE_KEY_EVERY);
    expect(ev.some((e) => e.type === 'key')).toBe(false);
  });
});

describe('Dungeon, Torre e Raid', () => {
  it('Dungeon: costa una chiave, 8 nemici + boss, poi set garantito e ritorno alla Campagna', () => {
    const s = god(newGame(0, 4));
    s.stage.current = s.stage.best = 30;
    expect(enterDungeon(s)).toBe(false);
    s.keys = 1;
    expect(enterDungeon(s)).toBe(true);
    expect(s.keys).toBe(0);
    expect(s.mode).toMatchObject({ kind: 'dungeon', level: dungeonLevel(s), wave: 0 });
    if (s.mode.kind === 'dungeon') expect(new Set(s.mode.mods).size).toBe(2);
    expect(rewardStage(s)).toBe(dungeonLevel(s));
    const frag = s.fragments;
    const ev: CombatEvent[] = [];
    while (!ev.some((e) => e.type === 'mode')) step(s, ev);
    expect(ev.filter((e) => e.type === 'kill')).toHaveLength(DUNGEON_WAVES + 1);
    expect(ev.some((e) => e.type === 'mode' && e.ok)).toBe(true);
    expect(s.mode.kind).toBe('campaign');
    expect(s.fragments).toBeGreaterThan(frag);
    expect(ev.some((e) => e.type === 'drop' && e.item.special?.kind === 'set')).toBe(true);
    expect(s.stage.current).toBe(30); // la Campagna riprende da dove era
  });

  it('Torre: piani a tempo, record e bonus permanente ai traguardi', () => {
    const s = god(newGame(0, 4));
    expect(enterTower(s)).toBe(true);
    run(s, 300);
    expect(s.tower.best).toBeGreaterThanOrEqual(TOWER_MILESTONE);
    // senza equipaggiamento né stelle (si prendono da sole e le percentuali si sommano)
    const bare = { ...s, gear: newGear(), stars: [] };
    const before = stateStats({ ...bare, tower: { ...s.tower, best: 0 } }).atk;
    expect(stateStats(bare).atk).toBeCloseTo(before * (1 + towerBonus(s.tower.best)));
    expect(s.tower.best).toBeGreaterThanOrEqual(TOWER_KEY_EVERY);
    expect(s.keys).toBe(Math.floor(s.tower.best / TOWER_KEY_EVERY));
    // un eroe debole non regge: torna alla Campagna
    const w = newGame(0, 4);
    enterTower(w);
    w.mode.kind === 'tower' && (w.mode.floor = 40);
    const ev = run(w, 400);
    expect(ev.some((e) => e.type === 'mode' && !e.ok)).toBe(true);
    expect(w.mode.kind).toBe('campaign');
    // si riparte vicino al record, non da capo
    w.tower.best = 23;
    enterTower(w);
    expect(w.mode.kind === 'tower' && w.mode.floor).toBe(towerStart(23));
    expect(towerStart(23)).toBe(19);
    expect(towerStart(2)).toBe(1);
  });

  it('Spedizione: dopo il primo Dungeon spende le chiavi e dà subito le ricompense', () => {
    const s = god(newGame(0, 4));
    s.stage.best = 40;
    s.keys = 25;
    expect(canExpedition(s)).toBe(false);
    expect(expedition(s, 10)).toBeNull();
    s.totals.dungeons = 1;
    const f0 = s.fragments, e0 = s.essence;
    const r = expedition(s, 10)!;
    expect(r.keys).toBe(10);
    expect(s.keys).toBe(15);
    expect(r.items).toBe(10);
    expect(s.fragments - f0).toBeGreaterThanOrEqual(DUNGEON_FRAGMENTS * dungeonLevel(s) * 10); // più i pezzi scartati
    expect(s.essence - e0).toBe(DUNGEON_ESSENCE * dungeonLevel(s) * 10);
    expect(s.totals.dungeons).toBe(11);
    expect(expedition(s, 100)!.keys).toBe(15);
    expect(s.keys).toBe(0);
    expect(canExpedition(s)).toBe(false);
  });

  it(`Torre: ogni ${TOWER_GRAND_EVERY} piani di record un oggetto Mitico`, () => {
    const s = god(newGame(0, 4));
    s.tower.best = TOWER_GRAND_EVERY - 1;
    enterTower(s);
    s.mode.kind === 'tower' && (s.mode.floor = TOWER_GRAND_EVERY);
    const ev = run(s, 100);
    expect(s.tower.best).toBeGreaterThanOrEqual(TOWER_GRAND_EVERY);
    expect(ev.some((e) => e.type === 'drop' && e.item.rarity === 5)).toBe(true);
    expect(ev.some((e) => e.type === 'mode' && e.text.startsWith('Vetta'))).toBe(true);
  });

  it('Raid: serve lo stage richiesto e 3 chiavi, poi bottino Leggendario o meglio', () => {
    const s = god(newGame(0, 4));
    s.keys = RAID_KEYS;
    expect(canRaid(s)).toBe(false);
    s.stage.best = RAID_STAGE;
    expect(enterRaid(s)).toBe(true);
    expect(s.keys).toBe(0);
    while (!s.enemy) step(s);
    Object.assign(s.enemy, { hp: 1, phase: 3, mechanics: [] }); // il boss è enorme: qui interessa solo la ricompensa
    const ev = run(s, 300);
    expect(s.mode.kind).toBe('campaign');
    expect(s.totals.raids).toBe(1);
    expect(ev.some((e) => e.type === 'drop' && e.item.rarity >= 4)).toBe(true);
  });

  it('si può abbandonare; il salvataggio conserva modalità e chiavi', () => {
    const s = newGame(0, 4);
    s.keys = 2;
    enterDungeon(s);
    const back = deserialize(serialize(s))!;
    expect(back.mode).toEqual(s.mode);
    expect(back.keys).toBe(1);
    leaveMode(s, []);
    expect(s.mode.kind).toBe('campaign');
  });

  it('morire in modalità non fa perdere stage', () => {
    const s = newGame(0, 4);
    s.stage.current = s.stage.best = 5;
    s.keys = 1;
    enterDungeon(s);
    if (s.mode.kind === 'dungeon') s.mode.level = 80;
    const ev: CombatEvent[] = [];
    while (!ev.some((e) => e.type === 'death')) step(s, ev);
    expect(s.mode.kind).toBe('campaign');
    expect(s.stage.current).toBe(5);
  });

  it('Furia: dopo due minuti ogni nemico raddoppia l’attacco ogni 10 s', () => {
    const e = spawnEnemy(newGame(0, 1));
    e.age = FURY_AFTER_S * 10;
    expect(enemyAtk(e)).toBe(e.atk);
    e.age += 100;
    expect(enemyAtk(e)).toBe(e.atk * 2);
  });

  it('uno stallo nel Dungeon (boss che non muore, eroe che non muore) finisce con la sconfitta', () => {
    const s = god(newGame(0, 5));
    s.keys = 1;
    enterDungeon(s);
    while (!s.enemy) step(s);
    Object.assign(s.enemy, { hp: 1e300, maxHp: 1e300, atk: 1 }); // non lo si scalfisce e quasi non fa male
    const ev: CombatEvent[] = [];
    for (let i = 0; i < 3600 * 10 && s.mode.kind === 'dungeon'; i++) step(s, ev);
    expect(s.mode.kind).toBe('campaign');
    expect(ev.some((e) => e.type === 'mode' && !e.ok)).toBe(true);
  });
});

describe('crescita dei nemici', () => {
  it('dallo stage LATE_STAGE vita e attacco crescono più piano, senza salti', () => {
    const r = (a: number, k: 'hp' | 'atk') => stageEnemy(a + 1)[k] / stageEnemy(a)[k];
    expect(r(LATE_STAGE - 1, 'hp')).toBeCloseTo(1.2);
    expect(r(LATE_STAGE, 'hp')).toBeCloseTo(1.15);
    expect(r(LATE_STAGE, 'atk')).toBeCloseTo(1.1);
    expect(r(LATE_STAGE + 50, 'hp')).toBeCloseTo(1.15);
    expect(stageEnemy(100).hp).toBeCloseTo(40 * 1.2 ** 99);
  });
});
