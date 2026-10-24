/** Rune: si sbloccano con l'Essenza di Luce, si incastonano nelle skill (anche in più skill insieme). */
export const RUNE_SOCKETS = 2;

/** Sblocco: il costo cresce con le rune già sbloccate. */
export const RUNE_UNLOCK_BASE = 50;
export const RUNE_UNLOCK_GROWTH = 1.6;
/** Livelli: ogni livello oltre il primo dà +10% all'effetto; il costo cresce ×1,5 per livello. */
export const RUNE_LEVEL_BONUS = 0.1;
export const RUNE_LEVEL_BASE = 50;
export const RUNE_LEVEL_GROWTH = 1.5;

/** Essenza per uccisione (i boss ×10), moltiplicata per (1 + stage / 10). */
export const ESSENCE_PER_KILL = 1;
export const ESSENCE_BOSS_MULT = 10;

/** Soglia di vita del nemico per la runa Esecuzione; vita spesa dalla runa Ombra; durata di Fervore. */
export const RUNE_EXECUTE_HP = 0.25;
export const RUNE_SHADOW_HP_COST = 0.03;
export const RUNE_HASTE_SECONDS = 3;
/** Apertura: il nemico deve avere almeno questa frazione di vita. */
export const RUNE_OPENING_HP = 0.9;

export type RuneId =
  | 'potenza' | 'rapidita' | 'parsimonia' | 'eco' | 'scintilla' | 'brace'
  | 'lacerazione' | 'ombra' | 'esecuzione' | 'sete' | 'bastione' | 'fervore'
  // lotto 3
  | 'condanna' | 'apertura' | 'luminescenza' | 'consacrazione' | 'marchio' | 'rinnovamento'
  | 'catena' | 'fulgore' | 'incendio' | 'brina' | 'tempesta' | 'custodia';

export interface RuneDef {
  id: RuneId;
  name: string;
  /** Valore al livello 1 (frazione: 0.5 = 50%). */
  value: number;
  /** Solo sulle skill che fanno danno (esplosione, sanguinamento, veleno). */
  damageOnly?: boolean;
  /** Solo sulle skill di supporto (cura, scudo, velocità). */
  supportOnly?: boolean;
  /** Descrizione con il valore effettivo. */
  text: (v: number) => string;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;
/** Riduzioni (ricarica, costo): rendimenti decrescenti, non arrivano mai a zero. */
export const reduction = (v: number) => 1 - 1 / (1 + v);

export const RUNES: RuneDef[] = [
  { id: 'potenza', name: 'Potenza', value: 0.5, text: (v) => `+${pct(v)} all'effetto (danno, cura o scudo)` },
  { id: 'rapidita', name: 'Rapidità', value: 0.43, text: (v) => `−${pct(reduction(v))} ricarica` },
  { id: 'parsimonia', name: 'Parsimonia', value: 0.43, text: (v) => `−${pct(reduction(v))} costo in Luce` },
  { id: 'eco', name: 'Eco', value: 0.25, text: (v) => `${pct(Math.min(1, v))} di probabilità di lanciarsi due volte` },
  { id: 'scintilla', name: 'Scintilla', value: 0.5, text: (v) => `al critico, ${pct(Math.min(1, v))} di lanciarsi gratis (se la ricarica è finita)` },
  { id: 'brace', name: 'Brace', value: 0.5, damageOnly: true, text: (v) => `aggiunge veleno pari al ${pct(v)} del danno` },
  { id: 'lacerazione', name: 'Lacerazione', value: 0.5, damageOnly: true, text: (v) => `aggiunge sanguinamento pari al ${pct(v)} del danno` },
  { id: 'ombra', name: 'Ombra', value: 0.6, damageOnly: true, text: (v) => `danno d'ombra +${pct(v)}, costa il ${pct(RUNE_SHADOW_HP_COST)} della vita` },
  { id: 'esecuzione', name: 'Esecuzione', value: 1, damageOnly: true, text: (v) => `+${pct(v)} danno contro nemici sotto il ${pct(RUNE_EXECUTE_HP)} di vita` },
  { id: 'sete', name: 'Sete', value: 0.1, damageOnly: true, text: (v) => `cura il ${pct(v)} del danno inflitto` },
  { id: 'bastione', name: 'Bastione', value: 0.05, text: (v) => `dà anche uno scudo pari al ${pct(v)} della vita` },
  { id: 'fervore', name: 'Fervore', value: 0.15, text: (v) => `dopo il lancio +${pct(v)} velocità d'attacco per ${RUNE_HASTE_SECONDS} s` },
  // lotto 3
  { id: 'condanna', name: 'Condanna', value: 0.4, damageOnly: true, text: (v) => `+${pct(v)} danno contro i boss` },
  { id: 'apertura', name: 'Apertura', value: 1, damageOnly: true, text: (v) => `+${pct(v)} danno contro nemici sopra il ${pct(RUNE_OPENING_HP)} di vita` },
  { id: 'luminescenza', name: 'Luminescenza', value: 0.25, text: (v) => `restituisce il ${pct(Math.min(1, v))} della Luce spesa` },
  { id: 'consacrazione', name: 'Consacrazione', value: 0.3, damageOnly: true, text: (v) => `aggiunge danno sacro pari al ${pct(v)} del danno` },
  { id: 'marchio', name: 'Marchio', value: 0.5, damageOnly: true, text: (v) => `${pct(Math.min(1, v))} di probabilità che il prossimo attacco sia critico` },
  { id: 'rinnovamento', name: 'Rinnovamento', value: 0.03, text: (v) => `cura il ${pct(v)} della vita al lancio` },
  { id: 'catena', name: 'Catena', value: 0.5, text: (v) => `riduce di ${+v.toFixed(2)} s la ricarica delle altre skill` },
  { id: 'fulgore', name: 'Fulgore', value: 0.6, damageOnly: true, text: (v) => `+${pct(v)} danno se lanciata con la Luce piena` },
  { id: 'incendio', name: 'Incendio', value: 0.3, damageOnly: true, text: (v) => `converte l'esplosione in fuoco, +${pct(v)} danno` },
  { id: 'brina', name: 'Brina', value: 0.3, damageOnly: true, text: (v) => `converte l'esplosione in gelo, +${pct(v)} danno` },
  { id: 'tempesta', name: 'Tempesta', value: 0.3, damageOnly: true, text: (v) => `converte l'esplosione in fulmine, +${pct(v)} danno` },
  { id: 'custodia', name: 'Custodia', value: 0.6, supportOnly: true, text: (v) => `+${pct(v)} all'effetto delle skill di cura, scudo e velocità` },
];

export const runeDef = (id: string) => RUNES.find((r) => r.id === id);
