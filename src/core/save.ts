import { cleanStars } from './constellations';
import { newGear } from './items';
import { levelCost, newRunes, type RuneState } from './runes';
import { RUNE_UNLOCK_BASE, RUNE_UNLOCK_GROWTH } from '../data/runes';
import { newSkills } from './skills';
import { newVie } from './vie';
import { newAscension, type AscensionState } from './ascension';
import { VEGLIA_REFUND } from '../data/ascension';
import { newCodex } from './codex';
import { collectFrom } from './collection';
import { checkAchievements } from './achievements';
import { checkLumi, newLumi } from './lumi';
import { newParagon, newRebirth } from './endgame';
import type { GearState } from './items';
import { STATE_VERSION, newGame, type GameState } from './state';

export const SAVE_KEY = 'chridle.save';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

type Migration = (data: Record<string, unknown>) => Record<string, unknown>;

/** migrations[n] porta un salvataggio dalla versione n alla n+1. */
export const migrations: Record<number, Migration> = {
  // v1 → v2: arrivano combattimento, livelli e oro; si conserva il tempo di gioco
  1: (d) => ({ ...newGame(d.createdAt as number), tick: d.tick, lastSeen: d.lastSeen }),
  // v2 → v3: arriva l'equipaggiamento
  2: (d) => ({ ...d, fragments: 0, gear: newGear() }),
  // v3 → v4: gli affissi possono avere più statistiche ({ stat, value } → mods)
  3: (d) => {
    type OldAffix = { id: string; tier: number; stat: string; value: number };
    type OldItem = { affixes: OldAffix[] };
    const item = (it: OldItem) => ({
      ...it,
      affixes: it.affixes.map(({ id, tier, stat, value }) => ({ id, tier, mods: [{ stat, value }] })),
    });
    const gear = d.gear as { equipped: Record<string, OldItem>; inventory: OldItem[] };
    return {
      ...d,
      gear: {
        ...gear,
        equipped: Object.fromEntries(Object.entries(gear.equipped).map(([slot, it]) => [slot, item(it)])),
        inventory: gear.inventory.map(item),
      },
    };
  },
  // v4 → v5: effetti a scatto (scudo, buff, contatore colpi; sanguinamento e veleno sul nemico)
  4: (d) => ({
    ...d,
    hero: { ...(d.hero as object), shield: 0, hits: 0, buffs: [] },
    enemy: d.enemy ? { ...(d.enemy as object), bleed: 0, poison: 0 } : null,
  }),
  // v5 → v6: unici e set (campo opzionale sugli oggetti) e il critico garantito dopo una schivata
  5: (d) => ({ ...d, hero: { ...(d.hero as object), nextCrit: false } }),
  // v6 → v7: crafting (contatore `crafts` opzionale sugli oggetti, assente = 0): niente da convertire
  6: (d) => d,
  // v7 → v8: Luce e skill attive (le skill già sbloccate dal livello vanno negli slot)
  7: (d) => {
    const hero = d.hero as { level: number };
    return { ...d, hero: { ...hero, light: 0 }, skills: newSkills(hero.level) };
  },
  // v8 → v9: Essenza di Luce e rune
  8: (d) => ({ ...d, essence: 0, runes: newRunes() }),
  // v9 → v10: Costellazioni
  9: (d) => ({ ...d, stars: [] }),
  // v10 → v11: Vie (sottoclassi)
  10: (d) => ({ ...d, vie: newVie() }),
  // v11 → v12: zone e famiglie (il nemico in corso si rigenera), chiavi, Dungeon/Torre/Raid
  11: (d) => ({
    ...d,
    enemy: null,
    keys: 0,
    mode: { kind: 'campaign' },
    tower: { best: 0 },
    totals: { ...(d.totals as object), dungeons: 0, raids: 0 },
  }),
  // v12 → v13: Ascensione
  12: (d) => ({ ...d, ascension: newAscension() }),
  // v13 → v14: rune del lotto 4 (campi opzionali su buff e nemico, assenti = 0): niente da convertire
  13: (d) => d,
  // v14 → v15: Purezza/Corruzione (ricarica della Santità)
  14: (d) => ({ ...d, hero: { ...(d.hero as object), sanctity: 0 } }),
  // v15 → v16: Codex/Bestiario
  15: (d) => ({ ...d, codex: newCodex() }),
  // v16 → v17: Collezione leggendari (contano gli unici già posseduti)
  16: (d) => {
    const g = d.gear as GearState;
    return { ...d, collection: collectFrom([...Object.values(g.equipped), ...g.inventory]) };
  },
  // v17 → v18: Imprese (quelle già raggiunte si danno subito, senza avvisi)
  17: (d) => {
    const s = { ...d, achievements: [] } as unknown as GameState;
    checkAchievements(s);
    return s as unknown as Record<string, unknown>;
  },
  // v18 → v19: Lumi (quelli già raggiunti si sbloccano subito)
  18: (d) => {
    const s = { ...d, lumi: newLumi() } as unknown as GameState;
    checkLumi(s);
    return s as unknown as Record<string, unknown>;
  },
  // v19 → v20: endgame (Abisso, Paragon, Rinascita Solare)
  19: (d) => ({ ...d, abyss: { best: 0 }, paragon: newParagon(), rebirth: newRebirth() }),
  // v20 → v21: 6 skill fisse con livelli e rune automatiche: l'Essenza spesa nelle rune torna indietro
  20: (d) => {
    const hero = d.hero as { level: number };
    const runes = d.runes as RuneState;
    return { ...d, essence: (d.essence as number) + runeRefund(runes), runes: newRunes(), skills: newSkills(hero.level) };
  },
  // v21 → v22: offline al 100%, Veglia Eterna tolta: le Scintille spese tornano
  21: (d) => {
    const a = d.ascension as AscensionState;
    const { veglia, ...perks } = a.perks as Record<string, number>;
    return { ...d, ascension: { ...a, perks, scintille: a.scintille + VEGLIA_REFUND(veglia ?? 0) } };
  },
};

/** Essenza spesa per sbloccare e potenziare le rune. */
export function runeRefund(runes: RuneState): number {
  const levels = Object.values(runes.levels);
  let total = 0;
  for (let k = 0; k < levels.length; k++) total += Math.ceil(RUNE_UNLOCK_BASE * Math.pow(RUNE_UNLOCK_GROWTH, k));
  for (const lv of levels) for (let l = 1; l < (lv ?? 1); l++) total += levelCost(l);
  return total;
}

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

export function deserialize(raw: string, migs = migrations, target = STATE_VERSION): GameState | null {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object' || typeof data.version !== 'number') return null;
  while ((data.version as number) < target) {
    const migrate = migs[data.version as number];
    if (!migrate) return null;
    data = { ...migrate(data), version: (data.version as number) + 1 };
  }
  if (data.version !== target) return null;
  if (!isGameState(data)) return null;
  data.stars = cleanStars(data.stars);
  return data;
}

function isGameState(d: Record<string, unknown>): d is Record<string, unknown> & GameState {
  const numbers = ['tick', 'createdAt', 'lastSeen', 'rng', 'gold', 'fragments', 'essence', 'respawn', 'keys'].every((k) => typeof d[k] === 'number');
  const objects = ['hero', 'upgrades', 'stage', 'totals', 'gear', 'skills', 'runes', 'stars', 'vie', 'mode', 'tower', 'ascension', 'collection', 'achievements', 'lumi', 'abyss', 'paragon', 'rebirth'].every((k) => d[k] && typeof d[k] === 'object');
  return numbers && objects;
}

export function saveGame(storage: StorageLike, state: GameState, now: number): void {
  state.lastSeen = now;
  storage.setItem(SAVE_KEY, serialize(state));
}

/** Se il salvataggio è illeggibile lo mette da parte invece di sovrascriverlo. */
export function loadGame(storage: StorageLike): GameState | null {
  const raw = storage.getItem(SAVE_KEY);
  if (!raw) return null;
  const state = deserialize(raw);
  if (!state) storage.setItem(`${SAVE_KEY}.corrotto`, raw);
  return state;
}
