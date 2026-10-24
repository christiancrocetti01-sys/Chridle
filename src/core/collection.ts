import { COLLECTION_BONUS, COLLECTION_MILESTONES } from '../data/collection';
import { UNIQUES } from '../data/uniques';
import type { Item, StatMods } from './items';

/** Id degli unici trovati almeno una volta (permanenti, restano all'Ascensione). */
export type CollectionState = string[];

/** Segna l'oggetto nella collezione. Restituisce true se è un unico mai trovato prima. */
export function discover(state: { collection: CollectionState }, item: Item): boolean {
  if (item.special?.kind !== 'unique' || state.collection.includes(item.special.id)) return false;
  state.collection.push(item.special.id);
  return true;
}

/** Unici già presenti in una lista di oggetti (per la migrazione dei vecchi salvataggi). */
export function collectFrom(items: (Item | undefined)[]): CollectionState {
  const ids = items.flatMap((it) => (it?.special?.kind === 'unique' ? [it.special.id] : []));
  return [...new Set(ids)];
}

/** Premi di completamento raggiunti con questi unici. */
export function reachedMilestones(collection: CollectionState) {
  const known = collection.filter((id) => UNIQUES.some((u) => u.id === id)).length;
  return COLLECTION_MILESTONES.filter((m) => known >= Math.ceil(m.frac * UNIQUES.length));
}

/** Somma i bonus della collezione (per unico e di completamento). */
export function addCollectionMods(collection: CollectionState | undefined, mods: StatMods) {
  if (!collection) return;
  for (const id of collection) for (const [k, v] of COLLECTION_BONUS[id] ?? []) mods[k] += v;
  for (const m of reachedMilestones(collection)) for (const [k, v] of m.mods) mods[k] += v;
}
