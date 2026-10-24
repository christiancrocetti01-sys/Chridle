import type { TriggerEffect } from './items';
import type { ViaId } from './vie';

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
  /** Skill propria di una Via: disponibile solo con quella Via (prima o seconda). */
  via?: ViaId;
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
  // lotto 3: skill di livello alto (si sceglie quali tenere nei 4 slot)
  { id: 'geloEterno', name: 'Gelo Eterno', level: 28, light: 50, cooldown: 7, effect: { kind: 'burst', element: 'cold', value: 5 }, tags: ['gelo'] },
  { id: 'lanciaSolare', name: 'Lancia Solare', level: 30, light: 80, cooldown: 10, effect: { kind: 'burst', element: 'holy', value: 8 }, tags: ['sacro'] },
  { id: 'catenaFulmini', name: 'Catena di Fulmini', level: 33, light: 50, cooldown: 5, effect: { kind: 'burst', element: 'lightning', value: 4 }, tags: ['fulmine'] },
  { id: 'piaga', name: 'Piaga', level: 35, light: 70, cooldown: 12, effect: { kind: 'poison', value: 7 }, tags: ['tempo'] },
  { id: 'corazzaLuce', name: 'Corazza di Luce', level: 36, light: 60, cooldown: 22, effect: { kind: 'shield', value: 0.5 }, tags: ['scudo', 'sacro'] },
  { id: 'emorragia', name: 'Emorragia', level: 38, light: 70, cooldown: 12, effect: { kind: 'bleed', value: 7 }, tags: ['fisico', 'tempo'] },
  { id: 'bufera', name: 'Bufera', level: 40, light: 100, cooldown: 18, effect: { kind: 'burst', element: 'cold', value: 12 }, tags: ['gelo'] },
  { id: 'furiaAlba', name: "Furia dell'Alba", level: 42, light: 50, cooldown: 16, effect: { kind: 'haste', value: 0.6, seconds: 6 }, tags: ['velocita'] },
  { id: 'rigenerazione', name: 'Rigenerazione', level: 45, light: 60, cooldown: 30, effect: { kind: 'heal', value: 0.5 }, tags: ['cura'] },
  { id: 'meteora', name: 'Meteora', level: 50, light: 100, cooldown: 22, effect: { kind: 'burst', element: 'fire', value: 15 }, tags: ['fuoco'] },
  { id: 'vortice', name: 'Vortice di Lame', level: 55, light: 90, cooldown: 18, effect: { kind: 'bleed', value: 12 }, tags: ['fisico', 'tempo'] },
  { id: 'sentenza', name: 'Sentenza Divina', level: 60, light: 100, cooldown: 30, effect: { kind: 'burst', element: 'holy', value: 20 }, tags: ['sacro'] },
  // skill delle Vie (livello minimo: quello in cui si sceglie la Via e oltre)
  { id: 'martelloSacro', name: 'Martello Sacro', level: 10, light: 50, cooldown: 7, effect: { kind: 'burst', element: 'holy', value: 4 }, tags: ['sacro'], via: 'paladino' },
  { id: 'baluardo', name: 'Baluardo', level: 22, light: 60, cooldown: 18, effect: { kind: 'shield', value: 0.6 }, tags: ['scudo'], via: 'paladino' },
  { id: 'danzaLame', name: 'Danza delle Lame', level: 10, light: 40, cooldown: 10, effect: { kind: 'haste', value: 0.8, seconds: 4 }, tags: ['velocita'], via: 'lama' },
  { id: 'milleTagli', name: 'Mille Tagli', level: 22, light: 50, cooldown: 7, effect: { kind: 'bleed', value: 4.5 }, tags: ['fisico', 'tempo'], via: 'lama' },
  { id: 'rogo', name: 'Rogo', level: 10, light: 50, cooldown: 9, effect: { kind: 'poison', value: 4.5 }, tags: ['fuoco', 'tempo'], via: 'inquisitore' },
  { id: 'condanna', name: 'Condanna', level: 22, light: 70, cooldown: 10, effect: { kind: 'burst', element: 'fire', value: 6 }, tags: ['fuoco'], via: 'inquisitore' },
  { id: 'pioggiaStellare', name: 'Pioggia Stellare', level: 10, light: 40, cooldown: 4, effect: { kind: 'burst', element: 'lightning', value: 2.5 }, tags: ['fulmine'], via: 'custode' },
  { id: 'benedizione', name: 'Benedizione delle Stelle', level: 22, light: 50, cooldown: 14, effect: { kind: 'heal', value: 0.35 }, tags: ['sacro', 'cura'], via: 'custode' },
  { id: 'lamaVuoto', name: 'Lama del Vuoto', level: 10, light: 60, cooldown: 8, effect: { kind: 'burst', element: 'shadow', value: 6 }, tags: ['ombra'], via: 'eclissiarca' },
  { id: 'eclissiTotale', name: 'Eclissi Totale', level: 22, light: 100, cooldown: 16, effect: { kind: 'burst', element: 'shadow', value: 14 }, tags: ['ombra'], via: 'eclissiarca' },
];

export const skillDef = (id: string) => SKILLS.find((s) => s.id === id);
