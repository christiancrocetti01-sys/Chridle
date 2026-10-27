/**
 * Collaudo massivo: un "giocatore automatico" gioca ore simulate con tutti i sistemi
 * (Vie, Stelle, Dungeon/Torre/Raid/Abisso,
 * Ascensioni, Rinascite, Paragon, Purezza/Corruzione, offline, salvataggio) e controlla che lo stato resti sano.
 *
 *   npm run collaudo                       tutti i profili in parallelo, 8 ore
 *   npm run collaudo -- --ore 24 --seed 7
 *   npm run collaudo -- --profilo lama     un solo profilo (stampa anche le tappe)
 */
import { spawn } from 'node:child_process';
import { changeGear, step, type CombatEvent } from '../src/core/combat';
import { newGame, type GameState } from '../src/core/state';
import { elementalDamage, stateStats, type Stats } from '../src/core/stats';
import { chooseSecondVia, chooseVia } from '../src/core/vie';
import { unlockCost } from '../src/core/runes';
import { activeVie } from '../src/core/vie';
import { canExpedition, canRaid, enterAbyss, enterDungeon, enterRaid, enterTower, expedition } from '../src/core/modes';
import { abyssUnlocked, canRebirth, rebirth } from '../src/core/endgame';
import { ascend, canAscend } from '../src/core/ascension';
import { applyOffline } from '../src/core/offline';
import { deserialize, serialize } from '../src/core/save';
import { TICK_RATE } from '../src/core/loop';
import { VIA_LEVEL, type ViaId } from '../src/data/vie';
import { EXPEDITION_BATCH, RAID_KEYS, RAID_STAGE } from '../src/data/modes';
import { UNIQUES } from '../src/data/uniques';

interface Profile {
  id: string;
  via: ViaId;
  second: ViaId;
  /** >0 premia la Corruzione, <0 la Purezza nella scelta di oggetti e stelle. */
  bias: number;
  /** Simula sessioni: ogni 2 h di gioco, 2 h offline. */
  offline?: boolean;
}

const PROFILES: Profile[] = [
  { id: 'paladino', via: 'paladino', second: 'custode', bias: -1 },
  { id: 'lama', via: 'lama', second: 'inquisitore', bias: 0 },
  { id: 'inquisitore', via: 'inquisitore', second: 'lama', bias: 0 },
  { id: 'custode', via: 'custode', second: 'paladino', bias: -1 },
  { id: 'eclissiarca', via: 'eclissiarca', second: 'lama', bias: 1 },
  { id: 'offline', via: 'lama', second: 'paladino', bias: 0, offline: true },
];

// ---------------------------------------------------------------- argomenti

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const HOURS = Number(arg('ore') ?? 8);
const SEED = Number(arg('seed') ?? 1);
const ONLY = arg('profilo');

// ---------------------------------------------------------------- giocatore automatico

/** Misura grezza di potenza (danno × resistenza), con la preferenza del profilo per Purezza/Corruzione. */
function power(state: GameState, p: Profile): number {
  const s = stateStats(state);
  const hit = (s.atk * (1 + s.bleed) + elementalDamage(s)) * (1 + s.critChance * (s.critMult - 1));
  const dps = hit * s.attackSpeed + s.poison;
  const tank = s.maxHp * (1 + s.def / 50) * (1 + s.lifeSteal * 10 * s.healMult) / (1 - s.dodge) + s.regen * 60 * s.healMult;
  // le soglie (±50) hanno regole che la misura non vede: un profilo a tema le cerca
  const theme = p.bias * s.corruption >= 50 ? 1.15 : 1;
  return dps * tank * (1 + 0.3 * p.bias * s.corruption / 100) * theme;
}


// ---------------------------------------------------------------- controlli

interface Counters {
  kills: number; deaths: number; expeditionKeys: number; keysGained: number; keysOffline: number;
  /** Chiavi per fonte: boss di zona, élite in Campagna, Dungeon (élite), Torre. */
  keySrc: Record<string, number>;
  /** Esiti dei Raid persi (morte o tempo) e Corruzione massima raggiunta. */
  raidLoss: Record<string, number>; maxCorr: number; minCorr: number;
  dungeons: [number, number]; towers: [number, number]; raids: [number, number]; abyss: number;
  ascensions: number; rebirths: number; rebirthAt: number[]; /** Affissi alzati sugli oggetti indossati a fine collaudo. */
  crafts: number;
  essenceGained: number; offlineHours: number; saveChecks: number;
}

const issues: string[] = [];
function check(state: GameState, s: Stats, where: string) {
  const bad = (path: string, v: unknown) => issues.length < 20 && issues.push(`${where}: ${path} = ${String(v)}`);
  const walk = (o: unknown, path: string) => {
    if (typeof o === 'number') { if (!Number.isFinite(o)) bad(path, o); return; }
    if (o && typeof o === 'object' && !(o instanceof Set)) for (const [k, v] of Object.entries(o)) walk(v, `${path}.${k}`);
  };
  walk(state, 'state');
  walk(s, 'stats');
  if (state.gold < 0 || state.essence < 0 || state.fragments < 0 || state.keys < 0) bad('valute negative', JSON.stringify([state.gold, state.essence, state.fragments, state.keys]));
  if (state.hero.hp > s.maxHp * 1.0001 + 1) bad('hp > maxHp', `${state.hero.hp} / ${s.maxHp}`);
}

function checkSave(state: GameState, where: string) {
  const back = deserialize(serialize(state));
  if (!back) { issues.push(`${where}: salvataggio non ricaricabile`); return; }
  if (serialize(back) !== serialize(state)) issues.push(`${where}: salvataggio diverso dopo il ricaricamento`);
}

// ---------------------------------------------------------------- simulazione di un profilo

interface Checkpoint {
  h: number; level: number; stage: number; best: number; asc: number; scint: number; tower: number;
  keys: number; runes: number; essence: number; nextRune: number; corruption: number; power: number; deaths: number;
  abyss: number; paragon: number; soli: number; collection: number; achievements: number;
}

function simulate(p: Profile) {
  const state = newGame(0, SEED * 1000 + PROFILES.indexOf(p) + 1);
  const c: Counters = {
    kills: 0, deaths: 0, expeditionKeys: 0, keysGained: 0, keysOffline: 0, keySrc: {}, raidLoss: {}, maxCorr: 0, minCorr: 0, dungeons: [0, 0], towers: [0, 0], raids: [0, 0], abyss: 0,
    ascensions: 0, rebirths: 0, rebirthAt: [], crafts: 0, essenceGained: 0, offlineHours: 0, saveChecks: 0,
  };
  const checkpoints: Checkpoint[] = [];
  const ascendAt: number[] = [];
  const ticksPerHour = 3600 * TICK_RATE;
  const total = HOURS * ticksPerHour;
  let lastBest = 0;
  let lastBestTick = 0;
  let lastTower = -Infinity;
  let lastAbyss = -Infinity;
  const ev: CombatEvent[] = [];
  const t0 = Date.now();

  for (let t = 1; t <= total && issues.length === 0; t++) {
    const kind = state.mode.kind;
    const zoneBoss = !!state.enemy?.zoneBoss;
    ev.length = 0;
    try {
      step(state, ev);
    } catch (e) {
      issues.push(`tick ${t} (${kind}, stage ${state.stage.current}): eccezione ${(e as Error).stack}`);
      break;
    }
    for (const e of ev) {
      if (e.type === 'kill') { c.kills++; c.essenceGained += e.essence; }
      else if (e.type === 'death') c.deaths++;
      else if (e.type === 'key') {
        c.keysGained++;
        const src = kind !== 'campaign' ? kind : zoneBoss ? 'boss' : 'elite';
        c.keySrc[src] = (c.keySrc[src] ?? 0) + 1;
      }
      else if (e.type === 'mode' && kind === 'abyss') {
        if (state.mode.kind !== 'abyss') c.abyss++;
      }
      else if (e.type === 'mode') {
        const slot = kind === 'dungeon' ? c.dungeons : kind === 'tower' ? c.towers : c.raids;
        slot[e.ok ? 0 : 1]++;
        if (kind === 'raid' && !e.ok) { const k = e.text.startsWith('Tempo') ? 'tempo' : 'morte'; c.raidLoss[k] = (c.raidLoss[k] ?? 0) + 1; }
      }
    }
    if (state.stage.best > lastBest) { lastBest = state.stage.best; lastBestTick = t; }

    // decisioni ogni 10 s di gioco
    if (t % (10 * TICK_RATE) === 0) changeGear(state, () => {
      if (state.hero.level >= VIA_LEVEL && state.vie.main !== p.via) chooseVia(state, p.via);
      if (state.vie.secondUnlocked && state.vie.second !== p.second) chooseSecondVia(state, p.second);
      if (state.mode.kind === 'campaign') {
        // Ascensione quando si è fermi da 15 minuti; prima si spendono le chiavi
        const stuck = t - lastBestTick > 15 * 60 * TICK_RATE;
        // chiavi accumulate (offline): Spedizione, tenendo quelle del Raid
        if (canExpedition(state) && state.keys >= EXPEDITION_BATCH + RAID_KEYS) c.expeditionKeys += expedition(state, state.keys - RAID_KEYS)!.keys;
        if (state.stage.best >= RAID_STAGE && canRaid(state)) enterRaid(state);
        else if (state.keys >= 1 && (state.stage.best < RAID_STAGE || state.keys > RAID_KEYS)) enterDungeon(state);
        else if (t - lastTower > 20 * 60 * TICK_RATE) { enterTower(state); lastTower = t; }
        else if (abyssUnlocked(state) && t - lastAbyss > 30 * 60 * TICK_RATE) { enterAbyss(state); lastAbyss = t; }
        else if (stuck && canRebirth(state)) {
          rebirth(state);
          c.rebirths++;
          c.rebirthAt.push(+(t / ticksPerHour).toFixed(1));
          lastBest = state.stage.best;
          lastBestTick = t;
        }
        else if (stuck && canAscend(state)) {
          ascend(state);
          c.ascensions++;
          ascendAt.push(+(t / ticksPerHour).toFixed(2));
          lastBest = state.stage.best;
          lastBestTick = t;
        }
      }
      return true;
    });

    // controlli ogni minuto, salvataggio ogni 10 minuti
    if (t % (60 * TICK_RATE) === 0) {
      const s = stateStats(state);
      check(state, s, `tick ${t} (${state.mode.kind})`);
      c.maxCorr = Math.max(c.maxCorr, s.corruption);
      c.minCorr = Math.min(c.minCorr, s.corruption);
    }
    if (t % (600 * TICK_RATE) === 0) { checkSave(state, `tick ${t}`); c.saveChecks++; }

    if (t % ticksPerHour === 0) {
      const s = stateStats(state);
      checkpoints.push({
        h: t / ticksPerHour, level: state.hero.level, stage: state.stage.current, best: state.stage.best,
        asc: state.ascension.count, scint: state.ascension.total, tower: state.tower.best, keys: state.keys,
        runes: Object.keys(state.runes.levels).length, essence: Math.round(state.essence), nextRune: unlockCost(state),
        corruption: s.corruption, power: power(state, p), deaths: c.deaths,
        abyss: state.abyss.best, paragon: state.paragon.level, soli: state.rebirth.soli,
        collection: state.collection.length, achievements: state.achievements.length,
      });
      if (ONLY) console.log(JSON.stringify(checkpoints.at(-1)));
      // sessioni: dopo ogni 2 h di gioco, 2 h offline
      if (p.offline && (t / ticksPerHour) % 2 === 0) {
        const r = applyOffline(state, 7200);
        if (r) { c.keysOffline += r.keys; c.offlineHours += 2; }
        check(state, stateStats(state), `offline dopo ${t / ticksPerHour} h`);
      }
    }
  }
  const s = stateStats(state);
  c.crafts = Object.values(state.gear.equipped).reduce((n, it) => n + (it?.crafts ?? 0), 0);
  return {
    profile: p.id, hours: HOURS, seconds: +((Date.now() - t0) / 1000).toFixed(1), issues: [...issues],
    counters: c, ascendAt, checkpoints,
    end: {
      vie: activeVie(state.vie), stars: state.stars.length, corruption: s.corruption, rules: [...s.rules],
      skills: state.skills.slots.map((id) => `${id}:${state.skills.levels[id!] ?? 1}`), runes: state.runes, perks: state.ascension.perks, codex: state.codex, collection: state.collection.length, achievements: state.achievements.length, lumi: state.lumi,
      gear: Object.values(state.gear.equipped).map((it) => `${it!.rarity}:${it!.special?.id ?? it!.type}`),
    },
  };
}

type Result = ReturnType<typeof simulate>;

// ---------------------------------------------------------------- report

const fmt = (n: number) => (Math.abs(n) >= 1e6 ? n.toExponential(2) : String(Math.round(n * 10) / 10));

function report(results: Result[]) {
  for (const r of results) {
    const c = r.counters;
    console.log(`\n=== ${r.profile} (${r.hours} h simulate in ${r.seconds} s) ${r.issues.length ? '❌' : '✅'}`);
    for (const i of r.issues) console.log('  !', i);
    console.log('    h  liv stage best asc scint torre abisso parag soli coll impr chiavi rune essenza/prossima corr morti');
    // nei collaudi lunghi una riga ogni 12 h
    const every = r.hours > 48 ? 12 : 1;
    for (const k of r.checkpoints.filter((x) => x.h % every === 0)) {
      console.log(`  ${String(k.h).padStart(3)} ${String(k.level).padStart(4)} ${String(k.stage).padStart(5)} ${String(k.best).padStart(4)} ${String(k.asc).padStart(3)} ${String(k.scint).padStart(5)} ${String(k.tower).padStart(5)} ${String(k.abyss).padStart(6)} ${String(k.paragon).padStart(5)} ${String(k.soli).padStart(4)} ${String(k.collection).padStart(4)} ${String(k.achievements).padStart(4)} ${String(k.keys).padStart(6)} ${String(k.runes).padStart(4)}  ${fmt(k.essence)}/${fmt(k.nextRune)} ${String(k.corruption).padStart(4)} ${String(k.deaths).padStart(5)}`);
    }
    const online = r.hours;
    console.log(`  chiavi: ${c.keysGained} in gioco (${fmt(c.keysGained / online)}/h) + ${c.keysOffline} offline (${c.offlineHours} h)  ·  fonti ${JSON.stringify(c.keySrc)}`);
    console.log(`  dungeon ${c.dungeons[0]}✓/${c.dungeons[1]}✗  torre ${c.towers[0]}✓/${c.towers[1]}✗  raid ${c.raids[0]}✓/${c.raids[1]}✗ ${JSON.stringify(c.raidLoss)}  ·  spedizioni ${c.expeditionKeys} chiavi  ·  corruzione ${c.minCorr}…${c.maxCorr}`);
    console.log(`  rinascite ${c.rebirths} a ${c.rebirthAt.join(', ') || '—'} h  ·  discese nell'Abisso ${c.abyss}`);
    console.log(`  ascensioni ${c.ascensions} a ${r.ascendAt.length > 20 ? `${r.ascendAt.slice(0, 10).join(', ')} … ${r.ascendAt.slice(-3).join(', ')}` : r.ascendAt.join(', ') || '—'} h  ·  affissi alzati ${c.crafts}  rune ${JSON.stringify(r.end.runes.levels)}`);
    console.log(`  fine: Vie ${r.end.vie.join('+')}, stelle ${r.end.stars}, corruzione ${r.end.corruption}, regole ${r.end.rules.join(' ') || '—'}`);
    console.log(`  skill ${r.end.skills.join(', ')}  ·  perk ${JSON.stringify(r.end.perks)}`);
    console.log(`  codex ${JSON.stringify(r.end.codex)}  ·  collezione ${r.end.collection}/${UNIQUES.length}  ·  imprese ${r.end.achievements}`);
    console.log(`  lumi ${JSON.stringify(r.end.lumi.levels)} attivo ${r.end.lumi.active ?? '—'} `);
  }
  const bad = results.filter((r) => r.issues.length);
  console.log(bad.length ? `\n❌ ${bad.length} profili con problemi` : `\n✅ nessun NaN, crash o salvataggio rotto in ${results.length} profili`);
  return bad.length;
}

// ---------------------------------------------------------------- avvio

if (ONLY) {
  const p = PROFILES.find((x) => x.id === ONLY);
  if (!p) throw new Error(`profilo sconosciuto: ${ONLY} (${PROFILES.map((x) => x.id).join(', ')})`);
  const r = simulate(p);
  if (process.argv.includes('--json')) console.log('@@' + JSON.stringify(r));
  else process.exitCode = report([r]);
} else {
  // un processo per profilo, in parallelo
  const runOne = (p: Profile) => new Promise<Result>((resolve, reject) => {
    const args = process.argv.slice(2).filter((a) => a !== '--');
    const child = spawn('node_modules/.bin/vite-node', ['scripts/collaudo.ts', '--', ...args, '--profilo', p.id, '--json'], { stdio: ['ignore', 'pipe', 'inherit'] });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.on('close', () => {
      const line = out.split('\n').find((l) => l.startsWith('@@'));
      line ? resolve(JSON.parse(line.slice(2))) : reject(new Error(`${p.id}: nessun risultato\n${out}`));
    });
  });
  console.log(`collaudo: ${PROFILES.length} profili × ${HOURS} h, seme ${SEED}`);
  Promise.all(PROFILES.map(runOne)).then((r) => { process.exitCode = report(r); });
}
