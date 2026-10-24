/** Imprese (GDD §14): traguardi a gradini, ognuno con un piccolo bonus permanente. */
import type { StatKey } from './items';

export type TrackId =
  | 'uccisioni' | 'stage' | 'livello' | 'ascensioni' | 'dungeon' | 'raid'
  | 'torre' | 'codex' | 'collezione' | 'rune' | 'oro'
  | 'abisso' | 'paragon' | 'rinascite';

export interface TrackDef {
  id: TrackId;
  /** Nome dell'impresa (il gradino si aggiunge in numeri romani). */
  name: string;
  /** Cosa si conta, per il testo: "{n} nemici uccisi". */
  text: string;
  steps: number[];
  /** Bonus per ogni gradino raggiunto (solo percentuali). */
  bonus: [StatKey, number][];
}

export const TRACKS: TrackDef[] = [
  { id: 'uccisioni', name: 'Sterminatore', text: '{n} nemici uccisi', steps: [100, 1_000, 10_000, 100_000, 1_000_000], bonus: [['atkPct', 0.02]] },
  { id: 'stage', name: 'Esploratore', text: 'stage {n} raggiunto', steps: [10, 25, 50, 75, 100, 150, 200], bonus: [['hpPct', 0.02]] },
  { id: 'livello', name: 'Veterano', text: 'livello {n}', steps: [10, 25, 50, 100, 200], bonus: [['xpPct', 0.03]] },
  { id: 'ascensioni', name: 'Asceso', text: '{n} Ascensioni', steps: [1, 3, 10, 25, 50], bonus: [['atkPct', 0.01], ['hpPct', 0.01]] },
  { id: 'dungeon', name: 'Predone', text: '{n} Dungeon completati', steps: [1, 10, 50, 200], bonus: [['magicFind', 0.02]] },
  { id: 'raid', name: 'Ammazzaboss', text: '{n} Raid vinti', steps: [1, 5, 25, 100], bonus: [['bossDmg', 0.03]] },
  { id: 'torre', name: 'Scalatore', text: "piano {n} della Torre dell'Alba", steps: [10, 25, 50, 100], bonus: [['defPct', 0.02]] },
  { id: 'codex', name: 'Studioso', text: '{n} gradi del Bestiario', steps: [5, 10, 15, 20, 25], bonus: [['elemPct', 0.02]] },
  { id: 'collezione', name: 'Collezionista', text: '{n} unici in collezione', steps: [1, 5, 10, 20, 30], bonus: [['critDmg', 0.04]] },
  { id: 'rune', name: 'Runologo', text: '{n} rune sbloccate', steps: [1, 2, 4, 6, 8], bonus: [['goldPct', 0.03]] },
  { id: 'oro', name: 'Tesoriere', text: '{n} oro guadagnato', steps: [1e4, 1e6, 1e9, 1e12, 1e15], bonus: [['goldPct', 0.03]] },
  { id: 'abisso', name: 'Abissale', text: "profondità {n} dell'Abisso", steps: [5, 10, 25, 50, 100], bonus: [['hpPct', 0.02], ['defPct', 0.02]] },
  { id: 'paragon', name: 'Paragone', text: 'Paragon {n}', steps: [10, 50, 100, 250, 500], bonus: [['atkPct', 0.02]] },
  { id: 'rinascite', name: 'Rinato', text: '{n} Rinascite Solari', steps: [1, 3, 10, 25], bonus: [['atkPct', 0.03], ['hpPct', 0.03]] },
];

export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
