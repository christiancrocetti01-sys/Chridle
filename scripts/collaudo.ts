/**
 * Collaudo massivo: un "giocatore automatico" gioca ore simulate con tutti i sistemi
 * (equip, crafting e fusione, potenziamenti, Vie, Stelle, skill, rune, Dungeon/Torre/Raid,
 * Ascensioni, Purezza/Corruzione, offline, salvataggio) e controlla che lo stato resti sano.
 *
 *   npm run collaudo                       tutti i profili in parallelo, 8 ore
 *   npm run collaudo -- --ore 24 --seed 7
 *   npm run collaudo -- --profilo lama     un solo profilo (stampa anche le tappe)
 */
import { spawn } from 'node:child_process';
import { buyUpgrade, changeGear, step, upgradePrice, type CombatEvent } from '../src/core/combat';
import { newGame, type GameState } from '../src/core/state';
import { equip, salvageUpTo, type Item } from '../src/core/items';
import { craftable, fuseItems, fusePartners, canFuse, upgradeAffix, canUpgrade, MAX_TIER } from '../src/core/craft';
import { elementalDamage, stateStats, type Stats } from '../src/core/stats';
import { canTake, pointsLeft, takeStar } from '../src/core/constellations';
import { chooseSecondVia, chooseVia } from '../src/core/vie';
import { canSocket, levelCost, levelRune, socketRune, unlockCost, unlockRune, isDamageSkill } from '../src/core/runes';
import { setSlot, unlockedSkills } from '../src/core/skills';
import { activeVie } from '../src/core/vie';
import { canRaid, enterDungeon, enterRaid, enterTower } from '../src/core/modes';
import { ascend, buyPerk, canAscend, perkCost, perkLevel, PERKS } from '../src/core/ascension';
import { applyOffline } from '../src/core/offline';
import { deserialize, serialize } from '../src/core/save';
import { TICK_RATE } from '../src/core/loop';
import { SLOTS } from '../src/data/items';
import { UPGRADES } from '../src/data/upgrades';
import { STARS } from '../src/data/constellations';
import { RUNES, RUNE_SOCKETS, type RuneId } from '../src/data/runes';
import { VIA_LEVEL, type ViaId } from '../src/data/vie';
import { RAID_KEYS, RAID_STAGE } from '../src/data/modes';
import type { PerkId } from '../src/data/ascension';

interface Profile {
  id: string;
  via: ViaId;
  second: ViaId;
  /** >0 premia la Corruzione, <0 la Purezza nella scelta di oggetti e stelle. */
  bias: number;
  /** Priorità dei potenziamenti dell'Ascensione. */
  perks: PerkId[];
  /** Simula sessioni: ogni 2 h di gioco, 2 h offline. */
  offline?: boolean;
}

const PERKS_BASE: PerkId[] = ['secondaVia', 'slot', 'fiamma', 'balzo', 'essenza', 'sapienza', 'oro', 'fortuna', 'veglia'];
const PROFILES: Profile[] = [
  { id: 'paladino', via: 'paladino', second: 'custode', bias: -1, perks: PERKS_BASE },
  { id: 'lama', via: 'lama', second: 'inquisitore', bias: 0, perks: PERKS_BASE },
  { id: 'inquisitore', via: 'inquisitore', second: 'lama', bias: 0, perks: ['fiamma', 'secondaVia', 'balzo', 'slot', 'essenza', 'sapienza', 'oro', 'fortuna', 'veglia'] },
  { id: 'custode', via: 'custode', second: 'paladino', bias: -1, perks: PERKS_BASE },
  { id: 'eclissiarca', via: 'eclissiarca', second: 'lama', bias: 1, perks: PERKS_BASE },
  { id: 'offline', via: 'lama', second: 'paladino', bias: 0, perks: ['veglia', ...PERKS_BASE], offline: true },
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

function autoBuy(state: GameState) {
  for (;;) {
    const cheapest = UPGRADES.map((u) => u.id).sort((a, b) => upgradePrice(state, a) - upgradePrice(state, b))[0];
    if (!buyUpgrade(state, cheapest)) return;
  }
}

function autoEquip(state: GameState, p: Profile) {
  for (const item of state.gear.inventory.slice()) {
    for (const slot of SLOTS.filter((x) => x.type === item.type)) {
      const before = power(state, p);
      const old = state.gear.equipped[slot.id];
      equip(state.gear, item.uid, slot.id);
      if (power(state, p) > before * 1.0001) break;
      if (old) equip(state.gear, old.uid, slot.id);
      else { state.gear.inventory.push(item); delete state.gear.equipped[slot.id]; }
    }
  }
}

/** Fonde terne di oggetti uguali (prima di smantellare), poi alza i tier degli affissi indossati. */
function autoCraft(state: GameState, p: Profile, stats: Counters) {
  for (let again = true; again;) {
    again = false;
    for (const it of state.gear.inventory) {
      if (!craftable(it)) continue;
      const group = [it, ...fusePartners(state.gear, it).slice(0, 2)];
      if (group.length === 3 && canFuse(state, group) && fuseItems(state, group.map((x) => x.uid))) {
        stats.fusions++;
        again = true;
        break;
      }
    }
  }
  autoEquip(state, p);
  state.fragments += salvageUpTo(state.gear, 99);
  // affissi: il più economico per primo, finché bastano i Frammenti
  for (let n = 0; n < 50; n++) {
    let best: { it: Item; i: number; cost: number } | null = null;
    for (const it of Object.values(state.gear.equipped)) {
      if (!it || !craftable(it)) continue;
      it.affixes.forEach((a, i) => {
        if (a.tier >= MAX_TIER || !canUpgrade(state, it, i)) return;
        const cost = a.tier * ((it.crafts ?? 0) + 1);
        if (!best || cost < best.cost) best = { it, i, cost };
      });
    }
    if (!best) break;
    const b = best as { it: Item; i: number };
    if (!upgradeAffix(state, b.it.uid, b.i)) break;
    stats.crafts++;
  }
}

/** Stelle: sceglie sempre quella raggiungibile che alza di più la potenza. */
function autoStars(state: GameState, p: Profile) {
  while (pointsLeft(state) > 0) {
    let best: string | null = null;
    let bestPow = -1;
    for (const n of STARS) {
      if (!canTake(state, n.id)) continue;
      state.stars.push(n.id);
      const pow = power(state, p) * (n.kind === 'keystone' ? 0.98 : 1); // chiavi di volta solo se convengono davvero
      state.stars.pop();
      if (pow > bestPow) { bestPow = pow; best = n.id; }
    }
    if (!best || !takeStar(state, best)) return;
  }
}

/** Skill: prima quelle delle Vie, poi le più recenti; le skill di danno davanti nella priorità. */
function autoSkills(state: GameState) {
  const vie = activeVie(state.vie);
  const pool = unlockedSkills(state.hero.level, vie)
    .sort((a, b) => Number(!!b.via) - Number(!!a.via) || b.level - a.level)
    .slice(0, state.skills.slots.length)
    .sort((a, b) => Number(isDamageSkill(b)) - Number(isDamageSkill(a)));
  pool.forEach((d, i) => { if (state.skills.slots[i] !== d.id) setSlot(state, i, d.id); });
}

/** Rune: sblocca la prossima (ordine del profilo), altrimenti alza quelle incastonate; poi incastona. */
function autoRunes(state: GameState, order: RuneId[], stats: Counters) {
  for (let n = 0; n < 100; n++) {
    const next = order.find((id) => !state.runes.levels[id]);
    if (next && unlockRune(state, next)) { stats.runesUnlocked++; continue; }
    const used = new Set(Object.values(state.runes.sockets).flat().filter(Boolean) as RuneId[]);
    const cheap = [...used].sort((a, b) => state.runes.levels[a]! - state.runes.levels[b]!)[0];
    // si alza solo se costa meno di metà del prossimo sblocco (si risparmia per le rune nuove)
    if (cheap && (!next || levelCost(state.runes.levels[cheap]!) < unlockCost(state) / 2) && levelRune(state, cheap)) {
      stats.runeLevels++;
      continue;
    }
    break;
  }
  const owned = order.filter((id) => state.runes.levels[id]).sort((a, b) => state.runes.levels[b]! - state.runes.levels[a]!);
  for (const skill of state.skills.slots) {
    if (!skill) continue;
    for (let i = 0; i < RUNE_SOCKETS; i++) {
      const id = owned.find((r) => canSocket(state, skill, i, r));
      if (id) socketRune(state, skill, i, id);
    }
  }
}

function autoPerks(state: GameState, p: Profile) {
  for (let bought = true; bought;) {
    bought = false;
    // il primo della lista che si può comprare (le priorità alte vengono prese appena possibile)
    for (const id of p.perks) {
      const def = PERKS.find((x) => x.id === id)!;
      if (def.max !== undefined && perkLevel(state.ascension, id) >= def.max) continue;
      if (perkCost(state.ascension, id) > state.ascension.scintille) break;
      if (buyPerk(state, id)) { bought = true; break; }
    }
  }
}

// ---------------------------------------------------------------- controlli

interface Counters {
  kills: number; deaths: number; keysGained: number; keysOffline: number;
  /** Chiavi per fonte: boss di zona, élite in Campagna, Dungeon (élite), Torre. */
  keySrc: Record<string, number>;
  /** Esiti dei Raid persi (morte o tempo) e Corruzione massima raggiunta. */
  raidLoss: Record<string, number>; maxCorr: number; minCorr: number;
  dungeons: [number, number]; towers: [number, number]; raids: [number, number];
  ascensions: number; fusions: number; crafts: number; runesUnlocked: number; runeLevels: number;
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
  if (state.gear.inventory.length > 40) bad('inventario', state.gear.inventory.length);
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
}

function simulate(p: Profile) {
  const state = newGame(0, SEED * 1000 + PROFILES.indexOf(p) + 1);
  const order = [...RUNES.map((r) => r.id)].sort((a, b) => ((a.charCodeAt(0) * 31 + SEED) % 7) - ((b.charCodeAt(0) * 31 + SEED) % 7));
  const c: Counters = {
    kills: 0, deaths: 0, keysGained: 0, keysOffline: 0, keySrc: {}, raidLoss: {}, maxCorr: 0, minCorr: 0, dungeons: [0, 0], towers: [0, 0], raids: [0, 0],
    ascensions: 0, fusions: 0, crafts: 0, runesUnlocked: 0, runeLevels: 0, essenceGained: 0, offlineHours: 0, saveChecks: 0,
  };
  const checkpoints: Checkpoint[] = [];
  const ascendAt: number[] = [];
  const ticksPerHour = 3600 * TICK_RATE;
  const total = HOURS * ticksPerHour;
  let lastBest = 0;
  let lastBestTick = 0;
  let lastTower = -Infinity;
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
      autoBuy(state);
      autoCraft(state, p, c);
      autoStars(state, p);
      autoSkills(state);
      autoRunes(state, order, c);
      if (state.mode.kind === 'campaign') {
        // Ascensione quando si è fermi da 15 minuti; prima si spendono le chiavi
        const stuck = t - lastBestTick > 15 * 60 * TICK_RATE;
        if (state.stage.best >= RAID_STAGE && canRaid(state)) enterRaid(state);
        else if (state.keys >= 1 && (state.stage.best < RAID_STAGE || state.keys > RAID_KEYS)) enterDungeon(state);
        else if (t - lastTower > 20 * 60 * TICK_RATE) { enterTower(state); lastTower = t; }
        else if (stuck && canAscend(state)) {
          ascend(state);
          c.ascensions++;
          ascendAt.push(+(t / ticksPerHour).toFixed(2));
          autoPerks(state, p);
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
  return {
    profile: p.id, hours: HOURS, seconds: +((Date.now() - t0) / 1000).toFixed(1), issues: [...issues],
    counters: c, ascendAt, checkpoints,
    end: {
      vie: activeVie(state.vie), stars: state.stars.length, corruption: s.corruption, rules: [...s.rules],
      skills: state.skills.slots, perks: state.ascension.perks, codex: state.codex,
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
    console.log('  h  liv stage best asc scint torre chiavi rune essenza/prossima corr morti');
    for (const k of r.checkpoints) {
      console.log(`  ${String(k.h).padStart(2)} ${String(k.level).padStart(4)} ${String(k.stage).padStart(5)} ${String(k.best).padStart(4)} ${String(k.asc).padStart(3)} ${String(k.scint).padStart(5)} ${String(k.tower).padStart(5)} ${String(k.keys).padStart(6)} ${String(k.runes).padStart(4)}  ${fmt(k.essence)}/${fmt(k.nextRune)} ${String(k.corruption).padStart(4)} ${String(k.deaths).padStart(5)}`);
    }
    const online = r.hours;
    console.log(`  chiavi: ${c.keysGained} in gioco (${fmt(c.keysGained / online)}/h) + ${c.keysOffline} offline (${c.offlineHours} h)  ·  fonti ${JSON.stringify(c.keySrc)}`);
    console.log(`  dungeon ${c.dungeons[0]}✓/${c.dungeons[1]}✗  torre ${c.towers[0]}✓/${c.towers[1]}✗  raid ${c.raids[0]}✓/${c.raids[1]}✗ ${JSON.stringify(c.raidLoss)}  ·  corruzione ${c.minCorr}…${c.maxCorr}`);
    console.log(`  ascensioni ${c.ascensions} a ${r.ascendAt.join(', ') || '—'} h  ·  fusioni ${c.fusions}  affissi alzati ${c.crafts}  rune ${c.runesUnlocked} sbloccate / ${c.runeLevels} livelli`);
    console.log(`  fine: Vie ${r.end.vie.join('+')}, stelle ${r.end.stars}, corruzione ${r.end.corruption}, regole ${r.end.rules.join(' ') || '—'}`);
    console.log(`  skill ${r.end.skills.join(', ')}  ·  perk ${JSON.stringify(r.end.perks)}`);
    console.log(`  codex ${JSON.stringify(r.end.codex)}`);
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
