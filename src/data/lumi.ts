/** Lumi (GDD §14): spiriti compagni. Uno attivo dà il bonus pieno e il suo effetto, gli altri una parte. */
import type { TrackId } from './achievements';
import type { StatKey } from './items';

export type LumoId = 'fiammella' | 'brina' | 'scintilla' | 'aureola' | 'ombretta' | 'lucciola';

type Mods = [StatKey, number][];

export interface LumoDef {
  id: LumoId;
  name: string;
  lore: string;
  /** Si sblocca quando il contatore dell'impresa arriva a `n` (stessi contatori delle Imprese). */
  unlock: { track: TrackId; n: number; text: string };
  /** Bonus per livello (solo percentuali). */
  perLevel: Mods;
  /** Effetto fisso, solo se è il Lumo attivo. */
  special: Mods;
}

export const LUMI: LumoDef[] = [
  { id: 'fiammella', name: 'Fiammella', lore: 'Una brace che non si spegne mai.', unlock: { track: 'stage', n: 15, text: 'stage 15' },
    perLevel: [['firePct', 0.02]], special: [['critDmg', 0.15]] },
  { id: 'brina', name: 'Brina', lore: 'Un respiro gelato che veglia sul guerriero.', unlock: { track: 'dungeon', n: 1, text: 'primo Dungeon completato' },
    perLevel: [['coldPct', 0.02], ['defPct', 0.01]], special: [['regenPct', 0.002]] },
  { id: 'scintilla', name: 'Scintilla', lore: 'Salta da una nuvola all’altra, impaziente.', unlock: { track: 'torre', n: 10, text: "piano 10 della Torre dell'Alba" },
    perLevel: [['lightningPct', 0.02], ['speedPct', 0.005]], special: [['crit', 0.03]] },
  { id: 'aureola', name: 'Aureola', lore: "Un frammento dell'alba rimasto indietro.", unlock: { track: 'ascensioni', n: 1, text: 'prima Ascensione' },
    perLevel: [['hpPct', 0.015], ['holyPct', 0.01]], special: [['regenPct', 0.003]] },
  { id: 'ombretta', name: 'Ombretta', lore: "Un'ombra che ha scelto la luce.", unlock: { track: 'raid', n: 1, text: 'primo Raid vinto' },
    perLevel: [['critDmg', 0.03], ['shadowPct', 0.01]], special: [['dodge', 0.03]] },
  { id: 'lucciola', name: 'Lucciola', lore: 'Trova sempre qualcosa che luccica.', unlock: { track: 'collezione', n: 9, text: '9 unici in collezione' },
    perLevel: [['goldPct', 0.03], ['magicFind', 0.01]], special: [['xpPct', 0.1]] },
];

/** I Lumi non attivi danno questa frazione del loro bonus per livello. */
export const LUMO_IDLE_SHARE = 0.25;
export const LUMO_COST_BASE = 100;
export const LUMO_COST_GROWTH = 1.35;
