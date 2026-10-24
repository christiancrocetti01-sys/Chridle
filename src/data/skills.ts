import type { TriggerEffect } from './items';

/** Luce: si accumula colpendo e si spende per lanciare le skill attive. */
export const LIGHT_PER_HIT = 10;
export const MAX_LIGHT = 100;
/** Luce in più al secondo mentre si combatte: le skill costose non restano a secco. */
export const LIGHT_PER_SECOND = 10;
/** Soglie automatiche: la cura parte sotto questa frazione di vita, lo scudo se è sotto questa frazione. */
export const HEAL_BELOW = 0.5;
export const SHIELD_BELOW = 0.1;
/** Slot delle skill attive; l'ordine degli slot è la priorità di lancio. */
export const SKILL_SLOTS = 4;

export const SKILL_TAGS = ['sacro', 'cura', 'velocita', 'fuoco', 'tempo', 'scudo', 'fisico', 'fulmine'] as const;
export type SkillTag = (typeof SKILL_TAGS)[number];

export const SKILL_TAG_LABELS: Record<SkillTag, string> = {
  sacro: 'Sacro', cura: 'Cura', velocita: 'Velocità', fuoco: 'Fuoco', tempo: 'Nel tempo', scudo: 'Scudo',
  fisico: 'Fisico', fulmine: 'Fulmine',
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

export const SKILLS: SkillDef[] = [
  { id: 'colpoSacro', name: 'Colpo Sacro', level: 1, light: 30, cooldown: 3, effect: { kind: 'burst', element: 'holy', value: 2.5 }, tags: ['sacro'] },
  { id: 'preghiera', name: 'Preghiera', level: 3, light: 40, cooldown: 10, effect: { kind: 'heal', value: 0.2 }, tags: ['sacro', 'cura'] },
  { id: 'lamaRapida', name: 'Lama Rapida', level: 5, light: 30, cooldown: 8, effect: { kind: 'haste', value: 0.4, seconds: 4 }, tags: ['velocita'] },
  { id: 'fiammaPurificatrice', name: 'Fiamma Purificatrice', level: 8, light: 50, cooldown: 6, effect: { kind: 'poison', value: 2 }, tags: ['fuoco', 'tempo'] },
  { id: 'egida', name: 'Egida', level: 12, light: 50, cooldown: 15, effect: { kind: 'shield', value: 0.3 }, tags: ['scudo'] },
  { id: 'squarcio', name: 'Squarcio', level: 16, light: 40, cooldown: 6, effect: { kind: 'bleed', value: 2.5 }, tags: ['fisico', 'tempo'] },
  { id: 'giudizio', name: 'Giudizio', level: 20, light: 80, cooldown: 12, effect: { kind: 'burst', element: 'holy', value: 6 }, tags: ['sacro'] },
  { id: 'stellaCadente', name: 'Stella Cadente', level: 25, light: 100, cooldown: 20, effect: { kind: 'burst', element: 'lightning', value: 10 }, tags: ['fulmine'] },
];

export const skillDef = (id: string) => SKILLS.find((s) => s.id === id);
