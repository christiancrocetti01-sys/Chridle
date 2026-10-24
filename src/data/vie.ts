import type { StatKey } from './items';
import type { RuleId } from './uniques';

/** Vie (sottoclassi): si sceglie la prima al livello VIA_LEVEL, la seconda (ibrido) è un traguardo di endgame. */
export const VIA_IDS = ['paladino', 'lama', 'inquisitore', 'custode', 'eclissiarca'] as const;
export type ViaId = (typeof VIA_IDS)[number];

export const VIA_LEVEL = 10;
/** La seconda Via dà questa frazione delle statistiche (la regola invece è intera). */
export const SECOND_VIA_SHARE = 0.5;

export interface ViaDef {
  id: ViaId;
  name: string;
  fantasy: string;
  mods: [StatKey, number][];
  /** Meccanica propria della Via. */
  rule: RuleId;
  /** Ramo delle Costellazioni più affine (solo indicazione per ora). */
  branch: 'offesa' | 'difesa' | 'luce';
}

export const VIE: ViaDef[] = [
  { id: 'paladino', name: 'Paladino del Sole', fantasy: 'Scudo e martello sacro: resiste a tutto e restituisce i colpi.',
    mods: [['hpPct', 0.25], ['defPct', 0.25], ['scudoSkill', 0.3], ['holyPct', 0.15], ['purity', 30]], rule: 'reflect', branch: 'difesa' },
  { id: 'lama', name: "Lama dell'Alba", fantasy: 'Spada rapida e colpi di luce: velocità, critici, colpi multipli.',
    mods: [['speedPct', 0.15], ['crit', 0.05], ['critDmg', 0.3], ['velocitaSkill', 0.3]], rule: 'doubleStrike', branch: 'offesa' },
  { id: 'inquisitore', name: 'Inquisitore', fantasy: 'Fiamma sacra purificatrice: bruciature che consumano il nemico.',
    mods: [['firePct', 0.3], ['fire', 3], ['fuocoSkill', 0.3], ['tempoSkill', 0.2]], rule: 'burningHits', branch: 'offesa' },
  { id: 'custode', name: 'Custode Stellare', fantasy: 'Luce stellare e spiriti evocati che combattono al suo fianco.',
    mods: [['lightningPct', 0.2], ['holyPct', 0.2], ['fulmineSkill', 0.3], ['sacroCdr', 0.1]], rule: 'starSpirit', branch: 'luce' },
  { id: 'eclissiarca', name: 'Eclissiarca', fantasy: "Luce corrotta dall'ombra: sacrifica la vita per danni enormi.",
    mods: [['atkPct', 0.3], ['shadowPct', 0.4], ['shadow', 3], ['hpPct', -0.15], ['corruption', 30]], rule: 'bloodPact', branch: 'luce' },
];

export const viaDef = (id: string | null | undefined) => VIE.find((v) => v.id === id);

/** Valori delle regole delle Vie. */
export const REFLECT_SHARE = 0.3;
export const DOUBLE_STRIKE_CHANCE = 0.25;
export const BURNING_SHARE = 0.25;
/** Spirito stellare: un colpo sacro al secondo pari a questa frazione dell'attacco. */
export const SPIRIT_ATK = 0.5;
/** Patto di sangue: danno in più a vita zero (lineare con la vita mancante). */
export const BLOOD_PACT_MAX = 1;
