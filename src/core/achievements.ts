import { ROMAN, TRACKS, type TrackId } from '../data/achievements';
import { codexTier } from './codex';
import type { StatMods } from './items';
import type { GameState } from './state';

/** Id delle imprese completate ("traccia:gradino", gradino da 0). Permanenti. */
export type AchievementState = string[];

export const achievementId = (track: TrackId, step: number) => `${track}:${step}`;

/** "Sterminatore III". */
export function achievementName(id: string): string {
  const [track, step] = id.split(':');
  return `${TRACKS.find((t) => t.id === track)?.name ?? track} ${ROMAN[Number(step)]}`;
}

/** Valore attuale del contatore di una traccia. */
export function trackValue(state: GameState, id: TrackId): number {
  switch (id) {
    case 'uccisioni': return state.totals.kills;
    case 'stage': return state.stage.best;
    case 'livello': return state.hero.level;
    case 'ascensioni': return state.ascension.count;
    case 'dungeon': return state.totals.dungeons;
    case 'raid': return state.totals.raids;
    case 'torre': return state.tower.best;
    case 'codex': return (Object.values(state.codex) as number[]).reduce((s, n) => s + codexTier(n), 0);
    case 'collezione': return state.collection.length;
    case 'rune': return Object.keys(state.runes.levels).length;
    case 'oro': return state.totals.gold;
    case 'abisso': return state.abyss?.best ?? 0;
    case 'paragon': return state.paragon?.level ?? 0;
    case 'rinascite': return state.rebirth?.count ?? 0;
  }
}

/** Gradini raggiunti di una traccia (le imprese restano anche se il contatore poi scende, es. all'Ascensione). */
export const trackSteps = (list: AchievementState, id: TrackId) => list.filter((a) => a.startsWith(`${id}:`)).length;

/** Completa le imprese raggiunte. Restituisce gli id nuovi. */
export function checkAchievements(state: GameState): string[] {
  const gained: string[] = [];
  for (const t of TRACKS) {
    const v = trackValue(state, t.id);
    t.steps.forEach((n, i) => {
      const id = achievementId(t.id, i);
      if (v >= n && !state.achievements.includes(id)) {
        state.achievements.push(id);
        gained.push(id);
      }
    });
  }
  return gained;
}

/** Somma i bonus delle imprese completate. */
export function addAchievementMods(list: AchievementState | undefined, mods: StatMods) {
  if (!list) return;
  for (const t of TRACKS) {
    const n = trackSteps(list, t.id);
    if (n) for (const [k, v] of t.bonus) mods[k] += v * n;
  }
}
