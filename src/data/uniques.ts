import type { Element, ItemType, StatKey, Tag, TriggerDef } from './items';

/** Regole speciali: cambiano il funzionamento del combattimento (dagli unici e dai set completi). */
export type RuleId =
  | 'echoFire' | 'echoCold' | 'echoLightning' | 'echoHoly' | 'echoShadow'
  | 'endlessPoison' | 'dodgeCrit' | 'overhealShield' | 'execute' | 'critBleed'
  | 'frenzy' | 'quickTriggers' | 'hasteStacks'
  // chiavi di volta delle Costellazioni
  | 'noCrit' | 'freeSkills' | 'overhealHoly';

export const RULE_TEXT: Record<RuleId, string> = {
  echoFire: 'Le esplosioni di fuoco colpiscono due volte',
  echoCold: 'Le esplosioni di gelo colpiscono due volte',
  echoLightning: 'Le esplosioni di fulmine colpiscono due volte',
  echoHoly: 'Le esplosioni di luce sacra colpiscono due volte',
  echoShadow: "Le esplosioni d'ombra colpiscono due volte",
  endlessPoison: 'Il veleno sul nemico non si esaurisce più',
  dodgeCrit: 'Dopo una schivata il colpo successivo è sempre critico',
  overhealShield: 'Le cure in eccesso diventano scudo',
  execute: 'Danno doppio ai nemici sotto il 25% della vita',
  critBleed: 'Ogni critico fa sanguinare per il 100% del danno del colpo',
  frenzy: "Sotto il 50% della vita: +50% velocità d'attacco",
  quickTriggers: 'Gli effetti "ogni N colpi" scattano un colpo prima',
  hasteStacks: 'La velocità a tempo si accumula invece di rinnovarsi',
  noCrit: 'Niente più critici, ma ogni colpo fa +80% di danno',
  freeSkills: 'Le skill non costano Luce, ma la ricarica raddoppia',
  overhealHoly: 'Le cure in eccesso diventano danno sacro al nemico',
};

/** Esplosioni che raddoppiano con ogni regola "eco". */
export const ECHO_RULES: Record<Element, RuleId> = {
  fire: 'echoFire', cold: 'echoCold', lightning: 'echoLightning', holy: 'echoHoly', shadow: 'echoShadow',
};

type Mods = [StatKey, number][];

export interface UniqueDef {
  id: string;
  name: string;
  type: ItemType;
  tags: Tag[];
  /** Statistiche fisse (le piatte crescono con il livello oggetto, come gli affissi). */
  mods: Mods;
  rule: RuleId;
}

/** Leggendari unici: nome ed effetto fissi, più gli affissi casuali della loro rarità. */
export const UNIQUES: UniqueDef[] = [
  { id: 'crepuscolo', name: 'Lama del Crepuscolo', type: 'arma', tags: ['ombra', 'sanguinamento'], mods: [['shadow', 3], ['crit', 0.04]], rule: 'critBleed' },
  { id: 'boia', name: 'Mannaia del Boia', type: 'arma', tags: ['fisico'], mods: [['atkPct', 0.15], ['bossDmg', 0.1]], rule: 'execute' },
  { id: 'brace', name: 'Cuore di Brace', type: 'amuleto', tags: ['fuoco'], mods: [['fire', 2.5], ['firePct', 0.15]], rule: 'echoFire' },
  { id: 'tuono', name: 'Corona del Tuono', type: 'elmo', tags: ['fulmine', 'velocita'], mods: [['lightningPct', 0.2], ['speedPct', 0.05]], rule: 'echoLightning' },
  { id: 'geloEterno', name: 'Guanti del Gelo Eterno', type: 'guanti', tags: ['gelo'], mods: [['cold', 2.5], ['coldPct', 0.15]], rule: 'echoCold' },
  { id: 'martire', name: 'Usbergo del Santo Martire', type: 'armatura', tags: ['sacro', 'vita'], mods: [['hpPct', 0.1], ['holyPct', 0.2]], rule: 'echoHoly' },
  { id: 'vuoto', name: 'Sigillo del Vuoto', type: 'anello', tags: ['ombra'], mods: [['shadowPct', 0.2], ['shadow', 1.5]], rule: 'echoShadow' },
  { id: 'eclissi', name: "Mantello dell'Eclissi", type: 'mantello', tags: ['ombra', 'critico'], mods: [['dodge', 0.06], ['critDmg', 0.2]], rule: 'dodgeCrit' },
  { id: 'peste', name: 'Fiala della Peste', type: 'reliquia', tags: ['veleno'], mods: [['poison', 2]], rule: 'endlessPoison' },
  { id: 'calice', name: 'Calice del Santo', type: 'secondaria', tags: ['sacro', 'vita'], mods: [['holy', 2], ['regenPct', 0.004]], rule: 'overhealShield' },
  { id: 'berserker', name: 'Cinghia del Berserker', type: 'cintura', tags: ['fisico', 'rubavita'], mods: [['atkPct', 0.08], ['lifeSteal', 0.01]], rule: 'frenzy' },
  { id: 'eco', name: "Anello dell'Eco", type: 'anello', tags: ['fuoco', 'gelo', 'fulmine', 'sacro', 'ombra'], mods: [['elemPct', 0.08]], rule: 'quickTriggers' },
  { id: 'tormenta', name: 'Stivali della Tormenta', type: 'stivali', tags: ['velocita'], mods: [['speedPct', 0.08], ['dodge', 0.02]], rule: 'hasteStacks' },
];

export interface SetDef {
  id: string;
  name: string;
  tags: Tag[];
  /** Un pezzo per tipo di oggetto. */
  pieces: { type: ItemType; name: string }[];
  /** 2 pezzi: statistiche (solo percentuali, non crescono con il livello). */
  bonus2: Mods;
  /** 4 pezzi: effetto a scatto (valore fisso). */
  bonus4: Omit<TriggerDef, 'id' | 'name' | 'tags' | 'types'>;
  /** 6 pezzi: regola speciale + statistiche. */
  bonus6: { rule: RuleId; mods: Mods };
}

export const SET_PIECES = 6;

export const SETS: SetDef[] = [
  {
    id: 'paladino', name: 'Paladino', tags: ['sacro', 'difesa'],
    pieces: [
      { type: 'arma', name: 'Martello del Paladino' }, { type: 'secondaria', name: 'Scudo del Paladino' },
      { type: 'elmo', name: 'Elmo del Paladino' }, { type: 'armatura', name: 'Corazza del Paladino' },
      { type: 'guanti', name: 'Manopole del Paladino' }, { type: 'reliquia', name: 'Reliquia del Paladino' },
    ],
    bonus2: [['holyPct', 0.25], ['defPct', 0.1]],
    bonus4: { on: 'struck', effect: { kind: 'burst', element: 'holy', value: 1.5 } },
    bonus6: { rule: 'overhealShield', mods: [['hpPct', 0.2], ['regenPct', 0.005]] },
  },
  {
    id: 'piromante', name: 'Piromante', tags: ['fuoco', 'critico'],
    pieces: [
      { type: 'arma', name: 'Bastone del Piromante' }, { type: 'secondaria', name: 'Tomo del Piromante' },
      { type: 'elmo', name: 'Cappuccio del Piromante' }, { type: 'guanti', name: 'Guanti del Piromante' },
      { type: 'anello', name: 'Anello del Piromante' }, { type: 'amuleto', name: 'Amuleto del Piromante' },
    ],
    bonus2: [['firePct', 0.25], ['crit', 0.03]],
    bonus4: { on: 'crit', effect: { kind: 'burst', element: 'fire', value: 1 } },
    bonus6: { rule: 'echoFire', mods: [['critDmg', 0.5]] },
  },
  {
    id: 'assassino', name: 'Assassino', tags: ['ombra', 'difesa'],
    pieces: [
      { type: 'arma', name: "Lama dell'Assassino" }, { type: 'elmo', name: "Maschera dell'Assassino" },
      { type: 'guanti', name: "Guanti dell'Assassino" }, { type: 'stivali', name: "Calzari dell'Assassino" },
      { type: 'mantello', name: "Cappa dell'Assassino" }, { type: 'anello', name: "Anello dell'Assassino" },
    ],
    bonus2: [['dodge', 0.05], ['shadowPct', 0.2]],
    bonus4: { on: 'dodge', effect: { kind: 'burst', element: 'shadow', value: 2 } },
    bonus6: { rule: 'dodgeCrit', mods: [['critDmg', 0.6]] },
  },
  {
    id: 'pestilenza', name: 'Pestilenza', tags: ['veleno', 'sanguinamento'],
    pieces: [
      { type: 'arma', name: 'Falce della Pestilenza' }, { type: 'secondaria', name: 'Lanterna della Pestilenza' },
      { type: 'armatura', name: 'Tunica della Pestilenza' }, { type: 'guanti', name: 'Guanti della Pestilenza' },
      { type: 'cintura', name: 'Fascia della Pestilenza' }, { type: 'amuleto', name: 'Amuleto della Pestilenza' },
    ],
    bonus2: [['bleed', 0.08], ['atkPct', 0.1]],
    bonus4: { on: 'everyN', n: 3, effect: { kind: 'poison', value: 1.2 } },
    bonus6: { rule: 'endlessPoison', mods: [['bleed', 0.1]] },
  },
];

/** Probabilità che un drop sia un unico (da Leggendario in su) o un pezzo di set (da Epico in su). */
export const UNIQUE_CHANCE = 0.25;
export const UNIQUE_MIN_RARITY = 4;
export const SET_CHANCE = 0.08;
export const SET_MIN_RARITY = 3;
