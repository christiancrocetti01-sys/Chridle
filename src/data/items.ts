/** Statistiche che gli oggetti possono modificare. I "Pct" sono frazioni (0.1 = +10%). */
export type StatKey =
  | 'atk' | 'def' | 'hp'
  | 'atkPct' | 'defPct' | 'hpPct'
  | 'speedPct' | 'crit' | 'critDmg' | 'regenPct';

export const STAT_LABELS: Record<StatKey, string> = {
  atk: 'Attacco', def: 'Difesa', hp: 'Vita',
  atkPct: 'Attacco', defPct: 'Difesa', hpPct: 'Vita',
  speedPct: "Velocità d'attacco", crit: 'Probabilità di critico', critDmg: 'Danno critico', regenPct: 'Rigenerazione',
};

/** Statistiche espresse in percentuale (per la formattazione). */
export const PCT_STATS: ReadonlySet<StatKey> = new Set(['atkPct', 'defPct', 'hpPct', 'speedPct', 'crit', 'critDmg', 'regenPct']);

export type ItemType =
  | 'arma' | 'secondaria' | 'elmo' | 'armatura' | 'guanti' | 'stivali'
  | 'cintura' | 'mantello' | 'anello' | 'amuleto' | 'reliquia';

export type SlotId = Exclude<ItemType, 'anello'> | 'anello1' | 'anello2';

export interface ItemTypeDef {
  id: ItemType;
  name: string;
  /** Statistica di base dell'oggetto e valore a livello oggetto 1. */
  base: StatKey;
  baseValue: number;
  names: string[];
}

export const ITEM_TYPES: ItemTypeDef[] = [
  { id: 'arma', name: 'Arma', base: 'atk', baseValue: 4, names: ['Spada', 'Ascia', 'Mazza', 'Lancia', 'Spadone'] },
  { id: 'secondaria', name: 'Mano secondaria', base: 'def', baseValue: 2, names: ['Scudo', 'Tomo', 'Pugnale', 'Lanterna'] },
  { id: 'elmo', name: 'Elmo', base: 'hp', baseValue: 14, names: ['Elmo', 'Celata', 'Cappuccio', 'Corona'] },
  { id: 'armatura', name: 'Armatura', base: 'def', baseValue: 3, names: ['Corazza', 'Cotta', 'Usbergo', 'Tunica'] },
  { id: 'guanti', name: 'Guanti', base: 'atk', baseValue: 2, names: ['Guanti', 'Manopole', 'Bracciali'] },
  { id: 'stivali', name: 'Stivali', base: 'def', baseValue: 1.5, names: ['Stivali', 'Schinieri', 'Calzari'] },
  { id: 'cintura', name: 'Cintura', base: 'hp', baseValue: 10, names: ['Cintura', 'Fascia', 'Cinghia'] },
  { id: 'mantello', name: 'Mantello', base: 'hp', baseValue: 8, names: ['Mantello', 'Cappa', 'Stendardo'] },
  { id: 'anello', name: 'Anello', base: 'atk', baseValue: 1.5, names: ['Anello', 'Sigillo', 'Fede'] },
  { id: 'amuleto', name: 'Amuleto', base: 'hp', baseValue: 12, names: ['Amuleto', 'Talismano', 'Medaglione'] },
  { id: 'reliquia', name: 'Reliquia', base: 'def', baseValue: 2, names: ['Reliquia', 'Icona', 'Frammento sacro'] },
];

export const SLOTS: { id: SlotId; type: ItemType; name: string }[] = [
  { id: 'arma', type: 'arma', name: 'Arma' },
  { id: 'secondaria', type: 'secondaria', name: 'Mano secondaria' },
  { id: 'elmo', type: 'elmo', name: 'Elmo' },
  { id: 'armatura', type: 'armatura', name: 'Armatura' },
  { id: 'guanti', type: 'guanti', name: 'Guanti' },
  { id: 'stivali', type: 'stivali', name: 'Stivali' },
  { id: 'cintura', type: 'cintura', name: 'Cintura' },
  { id: 'mantello', type: 'mantello', name: 'Mantello' },
  { id: 'anello1', type: 'anello', name: 'Anello' },
  { id: 'anello2', type: 'anello', name: 'Anello' },
  { id: 'amuleto', type: 'amuleto', name: 'Amuleto' },
  { id: 'reliquia', type: 'reliquia', name: 'Reliquia' },
];

export interface RarityDef {
  id: string;
  name: string;
  color: string;
  /** Numero di affissi casuali. */
  affixes: number;
  /** Moltiplicatore della statistica di base. */
  power: number;
  /** Peso nella tabella dei drop. */
  weight: number;
  /** Frammenti ottenuti smantellando, per livello oggetto. */
  fragments: number;
}

/** In ordine crescente: l'indice è il "grado" della rarità. */
export const RARITIES: RarityDef[] = [
  { id: 'comune', name: 'Comune', color: '#c9c9c9', affixes: 0, power: 1, weight: 600, fragments: 1 },
  { id: 'magico', name: 'Magico', color: '#5b8cff', affixes: 1, power: 1.1, weight: 250, fragments: 2 },
  { id: 'raro', name: 'Raro', color: '#f2d24b', affixes: 2, power: 1.25, weight: 100, fragments: 5 },
  { id: 'epico', name: 'Epico', color: '#b45cff', affixes: 3, power: 1.45, weight: 40, fragments: 12 },
  { id: 'leggendario', name: 'Leggendario', color: '#ff8a1f', affixes: 4, power: 1.7, weight: 9, fragments: 30 },
  { id: 'mitico', name: 'Mitico', color: '#ff3b4e', affixes: 5, power: 2, weight: 0.9, fragments: 80 },
  { id: 'divino', name: 'Divino', color: '#fff6c8', affixes: 6, power: 2.5, weight: 0.1, fragments: 250 },
];

export interface AffixDef {
  id: string;
  stat: StatKey;
  /** Suffisso usato nel nome dell'oggetto. */
  name: string;
  /** Valore al tier 1 (per le statistiche piatte: a livello oggetto 1). */
  value: number;
  /** Le statistiche piatte crescono con il livello oggetto, le percentuali no. */
  scales: boolean;
}

export const AFFIXES: AffixDef[] = [
  { id: 'atk', stat: 'atk', name: 'del Falco', value: 2, scales: true },
  { id: 'def', stat: 'def', name: 'della Torre', value: 1.2, scales: true },
  { id: 'hp', stat: 'hp', name: "dell'Orso", value: 10, scales: true },
  { id: 'atkPct', stat: 'atkPct', name: 'della Furia', value: 0.03, scales: false },
  { id: 'defPct', stat: 'defPct', name: 'del Bastione', value: 0.03, scales: false },
  { id: 'hpPct', stat: 'hpPct', name: 'della Vita', value: 0.03, scales: false },
  { id: 'speedPct', stat: 'speedPct', name: "dell'Alba", value: 0.02, scales: false },
  { id: 'crit', stat: 'crit', name: 'del Lampo', value: 0.01, scales: false },
  { id: 'critDmg', stat: 'critDmg', name: 'della Lama Nera', value: 0.06, scales: false },
  { id: 'regenPct', stat: 'regenPct', name: 'del Sole', value: 0.002, scales: false },
];

/** Tier degli affissi: T1 comune … T5 raro. Il valore è moltiplicato per `mult`. */
export const AFFIX_TIERS = [
  { tier: 1, weight: 50, mult: 1 },
  { tier: 2, weight: 28, mult: 1.5 },
  { tier: 3, weight: 14, mult: 2 },
  { tier: 4, weight: 6, mult: 2.7 },
  { tier: 5, weight: 2, mult: 3.5 },
];
