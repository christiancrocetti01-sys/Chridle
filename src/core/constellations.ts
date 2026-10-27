import { START_ID, STAR_BY_ID, STAR_POINTS_ASC_EVERY, STAR_POINTS_TOWER_EVERY, type StarNode } from '../data/constellations';
import type { RuleId } from '../data/uniques';
import type { StatMods } from './items';

/** Ciò che serve dello stato: livello dell'eroe, stelle prese e (facoltativi) Torre e Ascensioni fatte. */
type StarState = { hero: { level: number }; stars: string[]; tower?: { best: number }; totals?: { ascensions?: number } };

/** Punti dalla Torre e dalle Ascensioni (permanenti). */
export const bonusStarPoints = (s: StarState) =>
  Math.floor((s.tower?.best ?? 0) / STAR_POINTS_TOWER_EVERY) + Math.floor((s.totals?.ascensions ?? 0) / STAR_POINTS_ASC_EVERY);
/** 1 punto per livello (il livello 1 parte da zero) più quelli di Torre e Ascensioni. */
export const starPoints = (s: StarState) => Math.max(0, s.hero.level - 1) + bonusStarPoints(s);
export const pointsLeft = (s: StarState) => starPoints(s) - s.stars.length;

const linkedToTree = (taken: Set<string>, n: StarNode) => n.links.some((l) => l === START_ID || taken.has(l));

export function canTake(s: StarState, id: string): boolean {
  const n = STAR_BY_ID.get(id);
  return !!n && n.kind !== 'start' && !s.stars.includes(id) && pointsLeft(s) > 0 && linkedToTree(new Set(s.stars), n);
}

export function takeStar(s: StarState, id: string): boolean {
  if (!canTake(s, id)) return false;
  s.stars.push(id);
  return true;
}

/** Stelle raggiungibili dal centro passando solo per stelle prese. */
function reachable(taken: Set<string>): Set<string> {
  const seen = new Set<string>([START_ID]);
  const queue = [START_ID];
  while (queue.length) {
    for (const l of STAR_BY_ID.get(queue.pop()!)!.links) {
      if (!seen.has(l) && taken.has(l)) {
        seen.add(l);
        queue.push(l);
      }
    }
  }
  return seen;
}

/** Si può restituire una stella solo se le altre restano collegate al centro. */
export function canRefund(s: StarState, id: string): boolean {
  if (!s.stars.includes(id)) return false;
  const rest = new Set(s.stars.filter((x) => x !== id));
  const reach = reachable(rest);
  return [...rest].every((x) => reach.has(x));
}

export function refundStar(s: StarState, id: string): boolean {
  if (!canRefund(s, id)) return false;
  s.stars = s.stars.filter((x) => x !== id);
  return true;
}

/** Respec gratuito: si restituiscono tutte le stelle. */
export function resetStars(s: StarState) {
  s.stars = [];
}

/** Aggiunge a `m` le statistiche delle stelle prese e restituisce le regole delle notevoli e chiavi di volta. */
export function addStarMods(stars: string[], m: StatMods): Set<RuleId> {
  const rules = new Set<RuleId>();
  for (const id of stars) {
    const n = STAR_BY_ID.get(id);
    if (!n) continue;
    for (const [stat, value] of n.mods) m[stat] += value;
    if (n.rule) rules.add(n.rule);
  }
  return rules;
}

/** Stelle sconosciute (dati cambiati) o non più collegate vengono tolte al caricamento. */
export function cleanStars(stars: string[]): string[] {
  const known = new Set(stars.filter((id) => STAR_BY_ID.has(id) && id !== START_ID));
  const reach = reachable(known);
  return [...known].filter((id) => reach.has(id));
}
