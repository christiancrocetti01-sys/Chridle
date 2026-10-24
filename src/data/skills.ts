import type { TriggerEffect } from './items';

/** Luce: si accumula colpendo e si spende per lanciare le skill attive. */
export const LIGHT_PER_HIT = 10;
export const MAX_LIGHT = 100;
/** Luce in più al secondo mentre si combatte: le skill costose non restano a secco. */
export const LIGHT_PER_SECOND = 10;
/** Soglie automatiche: la cura parte sotto questa frazione di vita, lo scudo se è sotto questa frazione. */
export const HEAL_BELOW = 0.5;
export const SHIELD_BELOW = 0.1;

export const SKILL_TAGS = ['sacro', 'cura', 'velocita', 'fuoco', 'tempo', 'scudo', 'fisico', 'fulmine', 'ombra', 'gelo'] as const;
export type SkillTag = (typeof SKILL_TAGS)[number];

export const SKILL_TAG_LABELS: Record<SkillTag, string> = {
  sacro: 'Sacro', cura: 'Cura', velocita: 'Velocità', fuoco: 'Fuoco', tempo: 'Nel tempo', scudo: 'Scudo',
  fisico: 'Fisico', fulmine: 'Fulmine', ombra: 'Ombra', gelo: 'Gelo',
};

export interface SkillDef {
  id: string;
  name: string;
  /** Livello dell'eroe che la sblocca. */
  level: number;
  /** Luce consumata al lancio. */
  light: number;
  /** Ricarica in secondi. */
  cooldown: number;
  /** Stessi effetti dei trigger degli oggetti: i danni sono frazioni dell'attacco, cura e scudo della vita. */
  effect: TriggerEffect;
  tags: SkillTag[];
}

/**
 * Le 6 skill fisse, nell'ordine di priorità di lancio (prima le difese, che hanno soglie automatiche).
 * Le esplosioni prendono da sole l'elemento a cui il nemico è più debole.
 */
export const SKILLS: SkillDef[] = [
  { id: 'preghiera', name: 'Preghiera', level: 5, light: 40, cooldown: 10, effect: { kind: 'heal', value: 0.25 }, tags: ['sacro', 'cura'] },
  { id: 'egida', name: 'Egida', level: 20, light: 50, cooldown: 15, effect: { kind: 'shield', value: 0.35 }, tags: ['scudo'] },
  { id: 'lamaRapida', name: 'Lama Rapida', level: 30, light: 30, cooldown: 10, effect: { kind: 'haste', value: 0.5, seconds: 5 }, tags: ['velocita'] },
  { id: 'giudizio', name: 'Giudizio', level: 45, light: 100, cooldown: 20, effect: { kind: 'burst', element: 'holy', value: 14 }, tags: ['sacro'] },
  { id: 'squarcio', name: 'Squarcio', level: 12, light: 40, cooldown: 6, effect: { kind: 'bleed', value: 3.5 }, tags: ['fisico', 'tempo'] },
  { id: 'colpoSacro', name: 'Colpo Sacro', level: 1, light: 30, cooldown: 3, effect: { kind: 'burst', element: 'holy', value: 3 }, tags: ['sacro'] },
];

/** Livelli delle skill: si comprano da soli con l'Essenza; ogni livello oltre il primo dà +10% all'effetto. */
export const SKILL_LEVEL_BONUS = 0.1;
export const SKILL_LEVEL_BASE = 25;
export const SKILL_LEVEL_GROWTH = 1.4;

export const skillDef = (id: string) => SKILLS.find((s) => s.id === id);
