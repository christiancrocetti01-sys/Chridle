import {
  AFFIXES, AFFIX_TIERS, ITEM_TYPES, RARITIES, SLOTS,
  type ItemType, type SlotId, type StatKey,
} from '../data/items';
import { nextRandom } from './rng';

export interface Affix {
  id: string;
  stat: StatKey;
  tier: number;
  value: number;
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

export function rollRarity(rng: Rng, boss = false): number {
  const once = () => RARITIES.indexOf(pickWeighted(rng, RARITIES));
  // boss: il migliore di due tiri e almeno Magico
  return boss ? Math.max(1, once(), once()) : once();
}

/** Genera un oggetto casuale. Deterministico: dipende solo dallo stato dell'RNG. */
export function rollItem(rng: Rng, uid: number, ilvl: number, rarity: number, type?: ItemType): Item {
  const def = type ? ITEM_TYPES.find((t) => t.id === type)! : pick(rng, ITEM_TYPES);
  const r = RARITIES[rarity];
  const growth = Math.pow(ILVL_GROWTH, ilvl - 1);
  // piccola variazione (±10%) anche sulla statistica di base
  const base = { stat: def.base, value: def.baseValue * growth * r.power * (0.9 + 0.2 * nextRandom(rng)) };

  const pool = AFFIXES.slice();
  const affixes: Affix[] = [];
  for (let i = 0; i < r.affixes && pool.length; i++) {
    const a = pool.splice(Math.floor(nextRandom(rng) * pool.length), 1)[0];
    const t = pickWeighted(rng, AFFIX_TIERS);
    const roll = 0.85 + 0.3 * nextRandom(rng);
    affixes.push({ id: a.id, stat: a.stat, tier: t.tier, value: a.value * t.mult * roll * (a.scales ? growth : 1) });
  }

  const best = affixes.reduce<Affix | null>((b, a) => (!b || a.tier > b.tier ? a : b), null);
  const suffix = best ? ` ${AFFIXES.find((a) => a.id === best.id)!.name}` : '';
  return { uid, type: def.id, rarity, ilvl, name: pick(rng, def.names) + suffix, base, affixes };
}

export function emptyMods(): StatMods {
  return { atk: 0, def: 0, hp: 0, atkPct: 0, defPct: 0, hpPct: 0, speedPct: 0, crit: 0, critDmg: 0, regenPct: 0 };
}

export function itemMods(items: Iterable<Item | undefined>): StatMods {
  const m = emptyMods();
  for (const it of items) {
    if (!it) continue;
    m[it.base.stat] += it.base.value;
    for (const a of it.affixes) m[a.stat] += a.value;
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
