import { AFFIX_TIERS, FLAT_STATS, affixesFor, triggersFor, type AffixDef, type TriggerDef } from '../data/items';
import { CRAFT_COST, CRAFT_GROWTH, FUSE_COST, FUSE_COUNT, FUSE_MAX_RARITY } from '../data/craft';
import {
  itemGrowth, pick, rollAffix, rollItem, rollTrigger, salvageValue,
  type GearState, type Item,
} from './items';
import { discover } from './collection';
import type { GameState } from './state';

export const MAX_TIER = AFFIX_TIERS[AFFIX_TIERS.length - 1].tier;
const tierMult = (tier: number) => AFFIX_TIERS.find((t) => t.tier === tier)!.mult;

/** Oggetto indossato o nell'inventario. */
export function findItem(gear: GearState, uid: number): Item | undefined {
  return Object.values(gear.equipped).find((it) => it?.uid === uid) ?? gear.inventory.find((it) => it.uid === uid);
}

/** Unici e pezzi di set non si modificano né si fondono. */
export const craftable = (it: Item) => !it.special;

function cost(it: Item, mult: number): number {
  return Math.ceil(salvageValue(it) * mult * Math.pow(CRAFT_GROWTH, it.crafts ?? 0));
}

export const rerollCost = (it: Item) => cost(it, CRAFT_COST.reroll);
export const upgradeCost = (it: Item, i: number) => cost(it, CRAFT_COST.upgrade * it.affixes[i].tier);
export const transferCost = (it: Item) => cost(it, CRAFT_COST.transfer);

function pay(state: GameState, it: Item, amount: number) {
  state.fragments -= amount;
  it.crafts = (it.crafts ?? 0) + 1;
}

/** Affissi con cui si può ritirare l'affisso `i`: stesso genere, nessun doppione. */
function rerollPool(it: Item, i: number) {
  const present = new Set(it.affixes.map((a) => a.id));
  const pool = it.affixes[i].power ? triggersFor(it.type) : affixesFor(it.type);
  return pool.filter((a) => !present.has(a.id));
}

export function canReroll(state: GameState, it: Item, i: number): boolean {
  return craftable(it) && !!it.affixes[i] && rerollPool(it, i).length > 0 && state.fragments >= rerollCost(it);
}

/** Sostituisce l'affisso `i` con uno nuovo, tirato come al drop. */
export function rerollAffix(state: GameState, uid: number, i: number): boolean {
  const it = findItem(state.gear, uid);
  if (!it || !canReroll(state, it, i)) return false;
  pay(state, it, rerollCost(it));
  const pool = rerollPool(it, i);
  const old = it.affixes[i];
  it.affixes[i] = old.power
    ? rollTrigger(state, pick(state, pool as TriggerDef[]))
    : rollAffix(state, pick(state, pool as AffixDef[]), itemGrowth(it.ilvl));
  return true;
}

export function canUpgrade(state: GameState, it: Item, i: number): boolean {
  return craftable(it) && !!it.affixes[i] && it.affixes[i].tier < MAX_TIER && state.fragments >= upgradeCost(it, i);
}

/** Alza di uno il tier dell'affisso `i`: i valori si scalano come tra i due tier. */
export function upgradeAffix(state: GameState, uid: number, i: number): boolean {
  const it = findItem(state.gear, uid);
  if (!it || !canUpgrade(state, it, i)) return false;
  pay(state, it, upgradeCost(it, i));
  const a = it.affixes[i];
  const k = tierMult(a.tier + 1) / tierMult(a.tier);
  a.tier++;
  for (const m of a.mods) m.value *= k;
  if (a.power) a.power *= k;
  return true;
}

/** Il donatore deve essere nell'inventario, dello stesso tipo, e non creare doppioni o un secondo effetto a scatto. */
export function canTransfer(state: GameState, target: Item, i: number, donor: Item, j: number): boolean {
  const a = donor.affixes[j];
  if (!a || !target.affixes[i] || donor.uid === target.uid || donor.type !== target.type) return false;
  if (!craftable(target) || !craftable(donor) || !state.gear.inventory.includes(donor)) return false;
  const others = target.affixes.filter((_, k) => k !== i);
  if (others.some((x) => x.id === a.id)) return false;
  if (a.power && others.some((x) => x.power)) return false;
  return state.fragments >= transferCost(target);
}

/** Copia l'affisso `j` del donatore al posto dell'affisso `i`; le statistiche piatte si adattano al livello oggetto. */
export function transferAffix(state: GameState, uid: number, i: number, donorUid: number, j: number): boolean {
  const target = findItem(state.gear, uid);
  const donor = state.gear.inventory.find((it) => it.uid === donorUid);
  if (!target || !donor || !canTransfer(state, target, i, donor, j)) return false;
  pay(state, target, transferCost(target));
  const a = donor.affixes[j];
  const k = itemGrowth(target.ilvl) / itemGrowth(donor.ilvl);
  target.affixes[i] = { ...a, mods: a.mods.map((m) => ({ stat: m.stat, value: FLAT_STATS.has(m.stat) ? m.value * k : m.value })) };
  state.gear.inventory.splice(state.gear.inventory.indexOf(donor), 1);
  return true;
}

/** Oggetti dell'inventario fondibili con `it`: stesso tipo e rarità, il più alto livello oggetto prima. */
export function fusePartners(gear: GearState, it: Item): Item[] {
  return gear.inventory
    .filter((x) => x !== it && x.type === it.type && x.rarity === it.rarity && craftable(x))
    .sort((a, b) => b.ilvl - a.ilvl);
}

const fuseIlvl = (items: Item[]) => Math.round(items.reduce((s, x) => s + x.ilvl, 0) / items.length);

export function fuseCost(items: Item[]): number {
  const r = items[0].rarity + 1;
  return Math.ceil(salvageValue({ ...items[0], rarity: r, ilvl: fuseIlvl(items) }) * FUSE_COST);
}

export function canFuse(state: GameState, items: Item[]): boolean {
  const first = items[0];
  if (items.length !== FUSE_COUNT || new Set(items).size !== FUSE_COUNT || first.rarity >= FUSE_MAX_RARITY) return false;
  const ok = items.every((x) => state.gear.inventory.includes(x) && craftable(x) && x.type === first.type && x.rarity === first.rarity);
  return ok && state.fragments >= fuseCost(items);
}

/**
 * Fonde gli oggetti indicati (tutti nell'inventario) in uno nuovo dello stesso tipo, rarità successiva e
 * livello oggetto medio. Può uscire anche un unico o un pezzo di set. Restituisce il nuovo oggetto.
 */
export function fuseItems(state: GameState, uids: number[]): Item | null {
  const items = uids.map((u) => state.gear.inventory.find((x) => x.uid === u)!);
  if (items.some((x) => !x) || !canFuse(state, items)) return null;
  state.fragments -= fuseCost(items);
  const gear = state.gear;
  gear.inventory = gear.inventory.filter((x) => !items.includes(x));
  const item = rollItem(state, gear.nextId++, fuseIlvl(items), items[0].rarity + 1, items[0].type);
  gear.inventory.push(item);
  discover(state, item);
  return item;
}
