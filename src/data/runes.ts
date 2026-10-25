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

/** Soglia di vita del nemico per la runa Esecuzione. */
export const RUNE_EXECUTE_HP = 0.25;

export type RuneId =
  | 'potenza' | 'esecuzione' | 'bastione' | 'custodia' | 'feritaAperta' | 'pazienza' | 'persistenza' | 'purificazione';

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

export const RUNES: RuneDef[] = [
  { id: 'potenza', name: 'Potenza', value: 0.5, text: (v) => `+${pct(v)} all'effetto (danno, cura o scudo)` },
  { id: 'esecuzione', name: 'Esecuzione', value: 1, damageOnly: true, text: (v) => `+${pct(v)} danno contro nemici sotto il ${pct(RUNE_EXECUTE_HP)} di vita` },
  { id: 'bastione', name: 'Bastione', value: 0.05, text: (v) => `dà anche uno scudo pari al ${pct(v)} della vita` },
  { id: 'custodia', name: 'Custodia', value: 0.6, supportOnly: true, text: (v) => `+${pct(v)} all'effetto delle skill di cura, scudo e velocità` },
  { id: 'feritaAperta', name: 'Ferita Aperta', value: 0.5, damageOnly: true, text: (v) => `+${pct(v)} danno contro nemici che sanguinano o sono avvelenati` },
  { id: 'pazienza', name: 'Pazienza', value: 0.08, damageOnly: true, text: (v) => `+${pct(v)} danno per ogni secondo di ricarica della skill` },
  { id: 'persistenza', name: 'Persistenza', value: 0.5, supportOnly: true, text: (v) => `+${pct(v)} alla durata degli effetti a tempo (velocità)` },
  { id: 'purificazione', name: 'Purificazione', value: 0.1, supportOnly: true, text: (v) => `cura anche il ${pct(v)} della vita mancante` },
];

export const runeDef = (id: string) => RUNES.find((r) => r.id === id);
