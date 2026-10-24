import {
  AFFIX_TIERS, FLAT_STATS, ITEM_TYPES, RARITIES, SLOTS, STAT_LABELS, affixDef, affixesFor, triggersFor,
  type ItemType, type SlotId, type StatKey,
} from '../data/items';
import {
  SETS, SET_CHANCE, SET_MIN_RARITY, SET_PIECES, UNIQUES, UNIQUE_CHANCE, UNIQUE_MIN_RARITY, type RuleId,
} from '../data/uniques';
import { nextRandom } from './rng';

export interface Affix {
  id: string;
  tier: number;
  mods: { stat: StatKey; value: number }[];
  /** Solo per gli effetti a scatto: moltiplicatore del valore base (tier × variazione). */
  power?: number;
}

export interface Item {
  uid: number;
  type: ItemType;
  /** Indice in RARITIES. */
  rarity: number;
  /** Livello oggetto: lo stage in cui è caduto. */
  ilvl: number;
  name: string;
  base: { stat: StatKey; value: number };
  affixes: Affix[];
  /** Leggendario unico (con le sue statistiche fisse) o pezzo di un set. */
  special?: { kind: 'unique' | 'set'; id: string; mods: { stat: StatKey; value: number }[] };
}

export type StatMods = Record<StatKey, number>;

export interface GearState {
  equipped: Partial<Record<SlotId, Item>>;
  inventory: Item[];
  nextId: number;
  /** Rarità massima smantellata automaticamente al drop (-1 = nessuna). */
  autoSalvage: number;
}

type Rng = { rng: number };

export const INVENTORY_SIZE = 40;
/** Probabilità di drop da un nemico normale; i boss lasciano sempre un oggetto. */
export const DROP_CHANCE = 1 / 8;
/** Crescita delle statistiche piatte per livello oggetto. */
export const ILVL_GROWTH = 1.1;

export function newGear(): GearState {
  return { equipped: {}, inventory: [], nextId: 1, autoSalvage: -1 };
}

function pickWeighted<T extends { weight: number }>(rng: Rng, list: T[]): T {
  let r = nextRandom(rng) * list.reduce((s, x) => s + x.weight, 0);
  for (const x of list) if ((r -= x.weight) < 0) return x;
  return list[list.length - 1];
}

const pick = <T>(rng: Rng, list: T[]): T => list[Math.floor(nextRandom(rng) * list.length)];

/** `magicFind` moltiplica il peso di tutte le rarità sopra Comune. */
export function rollRarity(rng: Rng, boss = false, magicFind = 0): number {
  const table = RARITIES.map((r, i) => ({ i, weight: i ? r.weight * (1 + magicFind) : r.weight }));
  const once = () => pickWeighted(rng, table).i;
  // boss: il migliore di due tiri e almeno Magico
  return boss ? Math.max(1, once(), once()) : once();
}

/** Genera un oggetto casuale. Deterministico: dipende solo dallo stato dell'RNG. */
export function rollItem(rng: Rng, uid: number, ilvl: number, rarity: number, type?: ItemType): Item {
  const r = RARITIES[rarity];
  const growth = Math.pow(ILVL_GROWTH, ilvl - 1);
  const special = rollSpecial(rng, rarity, growth, type);
  const def = ITEM_TYPES.find((t) => t.id === (special?.type ?? type)) ?? pick(rng, ITEM_TYPES);
  // piccola variazione (±10%) anche sulla statistica di base
  const base = { stat: def.base, value: def.baseValue * growth * r.power * (0.9 + 0.2 * nextRandom(rng)) };

  const pool = affixesFor(def.id);
  const affixes: Affix[] = [];
  // da Epico in su, uno degli affissi può essere un effetto a scatto
  const triggers = triggersFor(def.id);
  if (r.triggerChance > 0 && triggers.length && nextRandom(rng) < r.triggerChance) {
    const a = pick(rng, triggers);
    const t = pickWeighted(rng, AFFIX_TIERS);
    affixes.push({ id: a.id, tier: t.tier, mods: [], power: t.mult * (0.85 + 0.3 * nextRandom(rng)) });
  }
  while (affixes.length < r.affixes && pool.length) {
    const a = pool.splice(Math.floor(nextRandom(rng) * pool.length), 1)[0];
    const t = pickWeighted(rng, AFFIX_TIERS);
    const roll = 0.85 + 0.3 * nextRandom(rng);
    const mods = a.mods.map((m) => ({ stat: m.stat, value: m.value * t.mult * roll * (FLAT_STATS.has(m.stat) ? growth : 1) }));
    affixes.push({ id: a.id, tier: t.tier, mods });
  }

  const best = affixes.reduce<Affix | null>((b, a) => (!b || a.tier > b.tier ? a : b), null);
  const suffix = best ? ` ${affixDef(best.id)!.name}` : '';
  const name = special?.name ?? pick(rng, def.names) + suffix;
  const item: Item = { uid, type: def.id, rarity, ilvl, name, base, affixes };
  if (special) item.special = { kind: special.kind, id: special.id, mods: special.mods };
  return item;
}

/** Statistiche fisse degli unici: le piatte valgono come un affisso T3 e crescono con il livello oggetto. */
const UNIQUE_FLAT_MULT = 2;

/** Decide se l'oggetto è un unico o un pezzo di set (con `type` fissato, solo tra quelli di quel tipo). */
function rollSpecial(rng: Rng, rarity: number, growth: number, type?: ItemType) {
  if (rarity >= UNIQUE_MIN_RARITY && nextRandom(rng) < UNIQUE_CHANCE) {
    const pool = UNIQUES.filter((u) => !type || u.type === type);
    if (pool.length) {
      const u = pick(rng, pool);
      const mods = u.mods.map(([stat, value]) => ({ stat, value: FLAT_STATS.has(stat) ? value * UNIQUE_FLAT_MULT * growth : value }));
      return { kind: 'unique' as const, id: u.id, type: u.type, name: u.name, mods };
    }
  } else if (rarity >= SET_MIN_RARITY && nextRandom(rng) < SET_CHANCE) {
    const pool = SETS.flatMap((set) => set.pieces.map((p) => ({ set, ...p }))).filter((p) => !type || p.type === type);
    if (pool.length) {
      const p = pick(rng, pool);
      return { kind: 'set' as const, id: p.set.id, type: p.type, name: p.name, mods: [] };
    }
  }
  return null;
}

/** Pezzi indossati per ogni set (un pezzo conta una volta sola, anche con due anelli uguali). */
export function setCounts(items: Iterable<Item | undefined>): Record<string, number> {
  const types: Record<string, Set<ItemType>> = {};
  for (const it of items) if (it?.special?.kind === 'set') (types[it.special.id] ??= new Set()).add(it.type);
  return Object.fromEntries(Object.entries(types).map(([id, t]) => [id, t.size]));
}

/** Regole speciali attive: dagli unici e dai set completi. */
export function gearRules(items: Iterable<Item | undefined>): Set<RuleId> {
  const list = [...items];
  const rules = new Set<RuleId>();
  for (const it of list) if (it?.special?.kind === 'unique') rules.add(UNIQUES.find((u) => u.id === it.special!.id)!.rule);
  const counts = setCounts(list);
  for (const set of SETS) if ((counts[set.id] ?? 0) >= SET_PIECES) rules.add(set.bonus6.rule);
  return rules;
}

export function emptyMods(): StatMods {
  return Object.fromEntries(Object.keys(STAT_LABELS).map((k) => [k, 0])) as StatMods;
}

/** Statistiche di un insieme di oggetti, compresi i bonus dei set (2 e 6 pezzi). */
export function itemMods(items: Iterable<Item | undefined>): StatMods {
  const m = emptyMods();
  const list = [...items];
  for (const it of list) {
    if (!it) continue;
    m[it.base.stat] += it.base.value;
    for (const a of it.affixes) for (const x of a.mods) m[x.stat] += x.value;
    for (const x of it.special?.mods ?? []) m[x.stat] += x.value;
  }
  const counts = setCounts(list);
  for (const set of SETS) {
    const n = counts[set.id] ?? 0;
    if (n >= 2) for (const [stat, value] of set.bonus2) m[stat] += value;
    if (n >= SET_PIECES) for (const [stat, value] of set.bonus6.mods) m[stat] += value;
  }
  return m;
}

export function gearMods(gear: GearState): StatMods {
  return itemMods(Object.values(gear.equipped));
}

export function salvageValue(item: Item): number {
  return RARITIES[item.rarity].fragments * Math.ceil(item.ilvl / 5);
}

export function slotsFor(type: ItemType): SlotId[] {
  return SLOTS.filter((s) => s.type === type).map((s) => s.id);
}

/** Slot in cui finisce un oggetto se non se ne sceglie uno: il primo libero, altrimenti il primo. */
export function defaultSlot(gear: GearState, type: ItemType): SlotId {
  const slots = slotsFor(type);
  return slots.find((s) => !gear.equipped[s]) ?? slots[0];
}

/** Indossa un oggetto dell'inventario; quello già nello slot torna nell'inventario. */
export function equip(gear: GearState, uid: number, slot?: SlotId): boolean {
  const i = gear.inventory.findIndex((it) => it.uid === uid);
  if (i < 0) return false;
  const item = gear.inventory[i];
  const target = slot ?? defaultSlot(gear, item.type);
  if (!slotsFor(item.type).includes(target)) return false;
  const old = gear.equipped[target];
  gear.equipped[target] = item;
  if (old) gear.inventory[i] = old;
  else gear.inventory.splice(i, 1);
  return true;
}

export function unequip(gear: GearState, slot: SlotId): boolean {
  const item = gear.equipped[slot];
  if (!item || gear.inventory.length >= INVENTORY_SIZE) return false;
  delete gear.equipped[slot];
  gear.inventory.push(item);
  return true;
}

/** Smantella un oggetto dell'inventario e restituisce i Frammenti ottenuti (0 se non trovato). */
export function salvage(gear: GearState, uid: number): number {
  const i = gear.inventory.findIndex((it) => it.uid === uid);
  if (i < 0) return 0;
  return salvageValue(gear.inventory.splice(i, 1)[0]);
}

/** Smantella tutti gli oggetti dell'inventario fino alla rarità indicata. */
export function salvageUpTo(gear: GearState, rarity: number): number {
  let total = 0;
  gear.inventory = gear.inventory.filter((it) => {
    if (it.rarity > rarity) return true;
    total += salvageValue(it);
    return false;
  });
  return total;
}
