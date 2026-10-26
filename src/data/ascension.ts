/** Ascensione (prestige, GDD §12): si riparte dallo stage 1 e dal livello 1 e si ottengono Scintille. */
export const ASCEND_STAGE = 40;

/** Scintille ottenute ascendendo con questo stage record. */
export const scintilleFor = (best: number) => (best < ASCEND_STAGE ? 0 : Math.floor(Math.pow((best - 30) / 10, 2)));

export type PerkId = 'fiamma' | 'oro' | 'sapienza' | 'essenza' | 'fortuna' | 'balzo' | 'slot' | 'secondaVia';

export interface PerkDef {
  id: PerkId;
  name: string;
  /** Testo con {v} = valore totale al livello attuale. */
  text: string;
  /** Valore per livello. */
  value: number;
  cost: number;
  growth: number;
  /** Livello massimo (assente = infinito: pozzo per le Scintille). */
  max?: number;
}

export const PERKS: PerkDef[] = [
  { id: 'fiamma', name: 'Fiamma Interiore', text: '+{v}% attacco e vita', value: 0.2, cost: 1, growth: 1.5 },
  { id: 'oro', name: 'Mida dell’Alba', text: '+{v}% oro', value: 0.25, cost: 1, growth: 1.4 },
  { id: 'sapienza', name: 'Sapienza Antica', text: '+{v}% esperienza', value: 0.2, cost: 1, growth: 1.4 },
  { id: 'essenza', name: 'Pozzo di Luce', text: '+{v}% Essenza', value: 0.25, cost: 2, growth: 1.5 },
  { id: 'fortuna', name: 'Stella Fortunata', text: '+{v}% ritrovamento magico', value: 0.1, cost: 2, growth: 1.5 },
  { id: 'balzo', name: 'Balzo Solare', text: 'si riparte dallo stage {v}+1', value: 5, cost: 3, growth: 1.6, max: 20 },
  { id: 'slot', name: 'Quinto Sole', text: '+{v} livelli a tutte le skill', value: 5, cost: 10, growth: 5, max: 2 },
  { id: 'secondaVia', name: 'Doppia Via', text: 'sblocca la seconda Via (ibrido)', value: 1, cost: 5, growth: 1, max: 1 },
];

export const perkDef = (id: string) => PERKS.find((p) => p.id === id);
/** Il progresso offline vale quanto il gioco aperto (decisione utente 2026-10-26). */
export const OFFLINE_EFFICIENCY = 1;
/** Veglia Eterna (offline oltre il 75%) è stata tolta: le Scintille spese tornano (migrazione v22). */
export const VEGLIA_REFUND = (level: number) => Array.from({ length: level }, (_, i) => Math.ceil(2 * Math.pow(2, i))).reduce((a, b) => a + b, 0);
