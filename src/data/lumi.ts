/** Lumi (GDD §14): spiriti compagni. Uno attivo dà il bonus pieno e il suo effetto, gli altri una parte. */
import type { TrackId } from './achievements';
import type { StatKey } from './items';

export type LumoId = 'fiammella' | 'brina' | 'scintilla' | 'aureola' | 'ombretta' | 'lucciola'
  | 'mezzaluna' | 'pallido' | 'stellina' | 'solicello';

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
  // 2026-10-27: i Lumi del fine gioco
  { id: 'mezzaluna', name: 'Mezzaluna', lore: 'Il primo spicchio di luce dopo l’Eclissi.', unlock: { track: 'codex', n: 10, text: '10 gradi del Bestiario' },
    perLevel: [['shadowPct', 0.02], ['critDmg', 0.02]], special: [['lifeSteal', 0.005]] },
  { id: 'pallido', name: 'Pallido', lore: 'Ha visto il fondo dell’Abisso ed è tornato a galla.', unlock: { track: 'abisso', n: 5, text: "profondità 5 dell'Abisso" },
    perLevel: [['defPct', 0.015], ['hpPct', 0.01]], special: [['dodge', 0.02]] },
  { id: 'stellina', name: 'Stellina', lore: 'Caduta da una Costellazione, non vuole più tornarci.', unlock: { track: 'paragon', n: 50, text: 'Paragon 50' },
    perLevel: [['atkPct', 0.015], ['elemPct', 0.01]], special: [['bossDmg', 0.15]] },
  { id: 'solicello', name: 'Solicello', lore: 'Un Sole bambino, nato dalla prima Rinascita.', unlock: { track: 'rinascite', n: 1, text: 'prima Rinascita Solare' },
    perLevel: [['holyPct', 0.015], ['hpPct', 0.015]], special: [['xpPct', 0.15], ['regenPct', 0.002]] },
];

/** I Lumi non attivi danno questa frazione del loro bonus per livello. */
export const LUMO_IDLE_SHARE = 0.25;
export const LUMO_COST_BASE = 100;
export const LUMO_COST_GROWTH = 1.35;
