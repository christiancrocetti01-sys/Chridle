import {
  ASCENDED_BONUS_MULT, ASCENDED_MILESTONES, ASCENDED_MULT, COLLECTION_BONUS, COLLECTION_MILESTONES,
} from '../data/collection';
import { UNIQUES } from '../data/uniques';
import type { Item, StatMods } from './items';

/** Id degli unici trovati almeno una volta (permanenti, restano all'Ascensione). */
export type CollectionState = string[];

/** Segna l'oggetto nella collezione (e in quella Ascesa). Restituisce true se è un unico (o un Asceso) mai trovato prima. */
export function discover(state: { collection: CollectionState; ascended: CollectionState }, item: Item): boolean {
  if (item.special?.kind !== 'unique') return false;
  const list = item.special.ascended ? state.ascended : state.collection;
  let fresh = false;
  if (!state.collection.includes(item.special.id)) { state.collection.push(item.special.id); fresh = true; }
  if (list !== state.collection && !list.includes(item.special.id)) { list.push(item.special.id); fresh = true; }
  return fresh;
}

/** Rende Asceso un unico appena generato: statistiche fisse ×ASCENDED_MULT e un segno nel nome. */
export function ascendItem(item: Item): Item {
  if (item.special?.kind !== 'unique') return item;
  item.special.ascended = true;
  for (const m of item.special.mods) m.value *= ASCENDED_MULT;
  item.name = `${item.name} ✦`;
  return item;
}

/** Unici già presenti in una lista di oggetti (per la migrazione dei vecchi salvataggi). */
export function collectFrom(items: (Item | undefined)[]): CollectionState {
  const ids = items.flatMap((it) => (it?.special?.kind === 'unique' ? [it.special.id] : []));
  return [...new Set(ids)];
}

/** Premi di completamento raggiunti con questi unici (della collezione normale o, con `list`, di quella Ascesa). */
export function reachedMilestones(collection: CollectionState, list = COLLECTION_MILESTONES) {
  const known = collection.filter((id) => UNIQUES.some((u) => u.id === id)).length;
  return list.filter((m) => known >= Math.ceil(m.frac * UNIQUES.length));
}

/** Somma i bonus della collezione e di quella Ascesa (per unico e di completamento). */
export function addCollectionMods(collection: CollectionState | undefined, mods: StatMods, ascended: CollectionState = []) {
  if (!collection) return;
  for (const id of collection) for (const [k, v] of COLLECTION_BONUS[id] ?? []) mods[k] += v;
  for (const m of reachedMilestones(collection)) for (const [k, v] of m.mods) mods[k] += v;
  for (const id of ascended) for (const [k, v] of COLLECTION_BONUS[id] ?? []) mods[k] += v * ASCENDED_BONUS_MULT;
  for (const m of reachedMilestones(ascended, ASCENDED_MILESTONES)) for (const [k, v] of m.mods) mods[k] += v;
}
