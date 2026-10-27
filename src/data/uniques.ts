import type { Element, ItemType, StatKey, Tag, TriggerDef } from './items';

/** Regole speciali: cambiano il funzionamento del combattimento (dagli unici e dai set completi). */
export type RuleId =
  | 'echoFire' | 'echoCold' | 'echoLightning' | 'echoHoly' | 'echoShadow'
  | 'endlessPoison' | 'dodgeCrit' | 'overhealShield' | 'execute' | 'critBleed'
  | 'frenzy' | 'quickTriggers' | 'hasteStacks'
  // chiavi di volta delle Costellazioni
  | 'noCrit' | 'freeSkills' | 'overhealHoly'
  // Vie
  | 'reflect' | 'doubleStrike' | 'burningHits' | 'starSpirit' | 'bloodPact'
  // chiavi di volta delle regioni delle Vie
  | 'oath' | 'twinStrike' | 'dotDouble' | 'spiritHost' | 'blackBlood'
  // Purezza/Corruzione (soglie)
  | 'corruptShadow' | 'eclipse' | 'sanctity'
  // lotto 5 (unici e set)
  | 'frostbite' | 'chainLightning' | 'soulHarvest' | 'lastStand' | 'firstStrike' | 'thornsAura' | 'luckyDrops'
  // regione «Oltre» delle Costellazioni (notevoli e chiavi di volta)
  | 'chainBolt' | 'battleBreath' | 'blazingShield' | 'reaper' | 'sunrise' | 'deepFreeze' | 'livingFlames' | 'riposte'
  | 'lightVampire' | 'lastPrayer' | 'armorBreak' | 'skillEcho' | 'judgeHammer' | 'ceaselessLight' | 'coldBlood'
  | 'supernova' | 'livingFortress' | 'timeStop';

export const RULE_TEXT: Record<RuleId, string> = {
  echoFire: 'Le esplosioni di fuoco colpiscono due volte',
  echoCold: 'Le esplosioni di gelo colpiscono due volte',
  echoLightning: 'Le esplosioni di fulmine colpiscono due volte',
  echoHoly: 'Le esplosioni di luce sacra colpiscono due volte',
  echoShadow: "Le esplosioni d'ombra colpiscono due volte",
  endlessPoison: 'Il veleno sul nemico non si esaurisce più',
  dodgeCrit: 'Dopo una schivata il colpo successivo è sempre critico',
  overhealShield: 'Le cure in eccesso diventano scudo',
  corruptShadow: 'Le skill di danno costano vita invece di Luce',
  eclipse: 'Eclissi: danni ×2, ma nessuna cura',
  sanctity: 'Santità: sopravvivi a un colpo mortale ogni 30 s',
  execute: 'Danno doppio ai nemici sotto il 25% della vita',
  critBleed: 'Ogni critico fa sanguinare per il 100% del danno del colpo',
  frenzy: "Sotto il 50% della vita: +50% velocità d'attacco",
  quickTriggers: 'Gli effetti "ogni N colpi" scattano un colpo prima',
  hasteStacks: 'La velocità a tempo si accumula invece di rinnovarsi',
  noCrit: 'Niente più critici, ma ogni colpo fa +80% di danno',
  freeSkills: 'Le skill non costano Luce, ma la ricarica raddoppia',
  overhealHoly: 'Le cure in eccesso diventano danno sacro al nemico',
  reflect: 'Restituisce al nemico il 30% del danno subito (prima dello scudo)',
  doubleStrike: 'Ogni attacco ha il 25% di probabilità di colpire due volte',
  burningHits: 'Ogni colpo brucia il nemico per il 25% del danno inflitto (nel tempo)',
  starSpirit: "Uno spirito stellare colpisce ogni secondo per il 50% dell'attacco (sacro)",
  bloodPact: 'Più vita manca, più danni: fino a +100% a vita quasi zero',
  oath: "Il 50% della difesa si aggiunge all'attacco, ma la velocità d'attacco scende del 20%",
  twinStrike: 'Ogni attacco colpisce due volte, ma l’attacco scende del 40%',
  dotDouble: 'Veleno e sanguinamento fanno il doppio del danno, ma il danno elementale dei colpi si dimezza',
  spiritHost: "Due spiriti stellari in più (ognuno colpisce ogni secondo per il 50% dell'attacco), ma −25% vita",
  blackBlood: 'Tutti i danni +50%, ma la vita massima si dimezza',
  frostbite: 'Il gelo intorpidisce: il nemico attacca il 30% più lentamente',
  chainLightning: "Ogni critico scarica un fulmine pari al 100% dell'attacco",
  soulHarvest: 'Ogni uccisione cura il 20% della vita',
  lastStand: 'Sotto il 30% della vita: difesa ×2 e +5% rubavita',
  firstStrike: 'Il primo colpo su ogni nemico fa danno ×4',
  thornsAura: 'Spine ×3, e feriscono anche quando schivi',
  luckyDrops: 'Il bottino ha il 15% di probabilità di salire di una rarità',
  chainBolt: "Ogni 5° colpo scarica un fulmine pari al 150% dell'attacco",
  battleBreath: 'Uccidere un’élite o un boss ricarica subito la skill più lontana dall’essere pronta',
  blazingShield: 'Quando lo scudo si rompe esplode: danno di fuoco pari al 30% della vita massima',
  reaper: 'Ogni uccisione dà +10% danni per 5 s (fino a +30%)',
  sunrise: 'Ogni 10 s il colpo successivo fa danno ×5',
  deepFreeze: 'Con danno da gelo, ogni colpo ha il 10% di probabilità di congelare il nemico per 1 s',
  livingFlames: 'Il veleno e le bruciature rimasti passano al nemico successivo',
  riposte: 'Dopo una schivata colpisci subito',
  lightVampire: 'Il rubavita in eccesso diventa scudo',
  lastPrayer: 'Sotto il 20% della vita la Preghiera si lancia da sola (ogni 20 s)',
  armorBreak: 'Ogni critico toglie il 10% della difesa del nemico (fino a −50%)',
  skillEcho: 'Le skill hanno il 20% di probabilità di lanciarsi due volte',
  judgeHammer: 'Contro i boss ogni colpo fa +0,5% di danno in più del precedente (fino a +150%)',
  ceaselessLight: 'Ogni skill lanciata restituisce 25 Luce',
  coldBlood: 'A vita piena: +20% danni',
  supernova: 'Le skill di danno aspettano la Luce piena e fanno ×3, ma la Luce sale a metà velocità',
  livingFortress: 'Niente più schivata, ma ogni colpo subito è ridotto del 40%',
  timeStop: "Ogni 30 s il nemico si blocca per 3 s, ma −30% velocità d'attacco",
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
  // lotto 2: la meccanica di una Via su un oggetto (per gli ibridi e per chi segue un'altra Via)
  { id: 'soleNascente', name: 'Martello del Sole Nascente', type: 'arma', tags: ['sacro', 'difesa'], mods: [['holyPct', 0.2], ['defPct', 0.1]], rule: 'reflect' },
  { id: 'albaGemella', name: "Lama dell'Alba Gemella", type: 'secondaria', tags: ['velocita', 'critico'], mods: [['speedPct', 0.1], ['crit', 0.03]], rule: 'doubleStrike' },
  { id: 'torcia', name: "Torcia dell'Inquisitore", type: 'reliquia', tags: ['fuoco'], mods: [['fire', 3], ['firePct', 0.15]], rule: 'burningHits' },
  { id: 'astrolabio', name: 'Astrolabio del Custode', type: 'amuleto', tags: ['sacro', 'fulmine'], mods: [['holyPct', 0.15], ['lightningPct', 0.15]], rule: 'starSpirit' },
  { id: 'coronaNera', name: "Corona dell'Eclissi Nera", type: 'elmo', tags: ['ombra'], mods: [['shadow', 3], ['shadowPct', 0.2]], rule: 'bloodPact' },
  // lotto 5: regole nuove e varianti di quelle esistenti su altri slot
  { id: 'zannaInverno', name: "Zanna dell'Inverno", type: 'arma', tags: ['gelo'], mods: [['cold', 3], ['coldPct', 0.15]], rule: 'frostbite' },
  { id: 'catenaFolgore', name: 'Catena della Folgore', type: 'anello', tags: ['fulmine', 'critico'], mods: [['lightning', 1.5], ['crit', 0.03]], rule: 'chainLightning' },
  { id: 'mietitore', name: 'Falce del Mietitore', type: 'arma', tags: ['ombra', 'rubavita'], mods: [['shadowPct', 0.15], ['lifeSteal', 0.01]], rule: 'soulHarvest' },
  { id: 'baluardo', name: "Scudo dell'Ultimo Baluardo", type: 'secondaria', tags: ['difesa', 'vita'], mods: [['defPct', 0.2], ['hpPct', 0.08]], rule: 'lastStand' },
  { id: 'primoRaggio', name: 'Guanti del Primo Raggio', type: 'guanti', tags: ['fisico', 'critico'], mods: [['atkPct', 0.1], ['critDmg', 0.2]], rule: 'firstStrike' },
  { id: 'rovi', name: 'Corazza dei Rovi Sacri', type: 'armatura', tags: ['difesa', 'sacro'], mods: [['thorns', 3], ['defPct', 0.1]], rule: 'thornsAura' },
  { id: 'viandante', name: 'Fede del Viandante', type: 'anello', tags: ['fortuna'], mods: [['magicFind', 0.15], ['goldPct', 0.2]], rule: 'luckyDrops' },
  { id: 'brina', name: 'Manto della Brina Perenne', type: 'mantello', tags: ['gelo', 'difesa'], mods: [['cold', 2], ['dodge', 0.03]], rule: 'echoCold' },
  { id: 'titano', name: 'Cintura del Titano', type: 'cintura', tags: ['difesa', 'vita'], mods: [['hp', 25], ['hpPct', 0.12]], rule: 'oath' },
  { id: 'lampo', name: 'Stivali del Lampo', type: 'stivali', tags: ['fulmine', 'velocita'], mods: [['lightningPct', 0.15], ['speedPct', 0.06]], rule: 'echoLightning' },
  { id: 'occhioAbisso', name: "Occhio dell'Abisso", type: 'amuleto', tags: ['ombra', 'veleno'], mods: [['poison', 2], ['shadowPct', 0.1]], rule: 'dotDouble' },
  { id: 'aurora', name: "Reliquia dell'Aurora", type: 'reliquia', tags: ['sacro', 'vita'], mods: [['holy', 2], ['regenPct', 0.004]], rule: 'overhealHoly' },
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
  {
    id: 'sentinella', name: 'Sentinella del Gelo', tags: ['gelo', 'difesa'],
    pieces: [
      { type: 'arma', name: 'Ascia della Sentinella' }, { type: 'elmo', name: 'Elmo della Sentinella' },
      { type: 'armatura', name: 'Corazza della Sentinella' }, { type: 'stivali', name: 'Schinieri della Sentinella' },
      { type: 'mantello', name: 'Mantello della Sentinella' }, { type: 'amuleto', name: 'Amuleto della Sentinella' },
    ],
    bonus2: [['coldPct', 0.25], ['defPct', 0.1]],
    bonus4: { on: 'struck', effect: { kind: 'burst', element: 'cold', value: 1.5 } },
    bonus6: { rule: 'frostbite', mods: [['hpPct', 0.2]] },
  },
  {
    id: 'tempesta', name: 'Tempesta', tags: ['fulmine', 'velocita'],
    pieces: [
      { type: 'arma', name: 'Lancia della Tempesta' }, { type: 'elmo', name: 'Corona della Tempesta' },
      { type: 'guanti', name: 'Bracciali della Tempesta' }, { type: 'stivali', name: 'Calzari della Tempesta' },
      { type: 'cintura', name: 'Fascia della Tempesta' }, { type: 'anello', name: 'Anello della Tempesta' },
    ],
    bonus2: [['lightningPct', 0.25], ['speedPct', 0.05]],
    bonus4: { on: 'everyN', n: 4, effect: { kind: 'burst', element: 'lightning', value: 1.2 } },
    bonus6: { rule: 'chainLightning', mods: [['crit', 0.05]] },
  },
  {
    id: 'sangue', name: 'Signore del Sangue', tags: ['rubavita', 'vita'],
    pieces: [
      { type: 'arma', name: 'Spadone del Signore del Sangue' }, { type: 'secondaria', name: 'Calice del Signore del Sangue' },
      { type: 'armatura', name: 'Usbergo del Signore del Sangue' }, { type: 'cintura', name: 'Cinghia del Signore del Sangue' },
      { type: 'mantello', name: 'Cappa del Signore del Sangue' }, { type: 'reliquia', name: 'Icona del Signore del Sangue' },
    ],
    bonus2: [['lifeSteal', 0.015], ['hpPct', 0.1]],
    bonus4: { on: 'kill', effect: { kind: 'heal', value: 0.08 } },
    bonus6: { rule: 'soulHarvest', mods: [['atkPct', 0.25]] },
  },
  {
    id: 'pellegrino', name: 'Pellegrino Fortunato', tags: ['fortuna', 'velocita'],
    pieces: [
      { type: 'elmo', name: 'Cappuccio del Pellegrino' }, { type: 'guanti', name: 'Guanti del Pellegrino' },
      { type: 'stivali', name: 'Stivali del Pellegrino' }, { type: 'cintura', name: 'Cintura del Pellegrino' },
      { type: 'anello', name: 'Fede del Pellegrino' }, { type: 'amuleto', name: 'Medaglione del Pellegrino' },
    ],
    bonus2: [['magicFind', 0.2], ['goldPct', 0.25]],
    bonus4: { on: 'kill', effect: { kind: 'haste', value: 0.2, seconds: 5 } },
    bonus6: { rule: 'luckyDrops', mods: [['xpPct', 0.3]] },
  },
];

/** Probabilità che un drop sia un unico (da Leggendario in su) o un pezzo di set (da Epico in su). */
export const UNIQUE_CHANCE = 0.25;
export const UNIQUE_MIN_RARITY = 4;
export const SET_CHANCE = 0.08;
export const SET_MIN_RARITY = 3;

// ── regole del lotto 5 ──
/** Gelo che intorpidisce: velocità d'attacco del nemico. */
export const FROSTBITE_SPEED = 0.7;
/** Fulmine a catena: frazione dell'attacco a ogni critico (danno da fulmine). */
export const CHAIN_LIGHTNING_ATK = 1;
/** Raccolto delle anime: vita curata a ogni uccisione. */
export const SOUL_HARVEST_HEAL = 0.2;
/** Ultimo baluardo: soglia di vita, moltiplicatore della difesa e rubavita in più. */
export const LAST_STAND_HP = 0.3;
export const LAST_STAND_DEF = 2;
export const LAST_STAND_LEECH = 0.05;
/** Primo colpo su ogni nemico. */
export const FIRST_STRIKE_MULT = 4;
export const THORNS_AURA_MULT = 3;
/** Bottino fortunato: probabilità di salire di una rarità. */
// ── regole della regione «Oltre» ──
export const CHAIN_BOLT_EVERY = 5;
export const CHAIN_BOLT_ATK = 1.5;
export const BLAZING_SHIELD_HP = 0.3;
export const REAPER_STEP = 0.1;
export const REAPER_MAX = 0.3;
export const REAPER_SECONDS = 5;
export const SUNRISE_SECONDS = 10;
export const SUNRISE_MULT = 5;
export const DEEP_FREEZE_CHANCE = 0.1;
export const DEEP_FREEZE_SECONDS = 1;
export const LAST_PRAYER_HP = 0.2;
export const LAST_PRAYER_SECONDS = 20;
export const ARMOR_BREAK_STEP = 0.1;
export const ARMOR_BREAK_MAX = 0.5;
export const SKILL_ECHO_CHANCE = 0.2;
export const JUDGE_HAMMER_STEP = 0.005;
export const JUDGE_HAMMER_MAX = 1.5;
export const CEASELESS_LIGHT = 25;
export const COLD_BLOOD_MULT = 1.2;
export const SUPERNOVA_MULT = 3;
export const SUPERNOVA_LIGHT = 0.5;
export const LIVING_FORTRESS_TAKEN = 0.6;
export const TIME_STOP_EVERY_S = 30;
export const TIME_STOP_SECONDS = 3;
export const TIME_STOP_SPEED = 0.7;
export const LUCKY_DROP_CHANCE = 0.15;
