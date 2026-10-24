import type { Element } from './items';

export type Family = 'nonmorti' | 'demoni' | 'bestie' | 'culto' | 'vuoto';
/** Tipi di danno a cui un nemico resiste: il fisico più gli elementi. */
export type DamageType = 'physical' | Element;

export interface FamilyDef {
  id: Family;
  name: string;
  /** Resistenze: 0,3 = −30% danni subiti; negative = debolezza (−0,5 = +50%). Mancanti = 0. */
  res: Partial<Record<DamageType, number>>;
}

export const FAMILIES: Record<Family, FamilyDef> = {
  nonmorti: { id: 'nonmorti', name: 'Non-morti', res: { holy: -0.5, shadow: 0.5, cold: 0.25 } },
  bestie: { id: 'bestie', name: 'Bestie corrotte', res: { fire: -0.3, physical: 0.15, cold: 0.2 } },
  culto: { id: 'culto', name: "Culto dell'Eclissi", res: { holy: 0.3, shadow: 0.3, lightning: -0.3 } },
  demoni: { id: 'demoni', name: 'Demoni', res: { fire: 0.5, holy: -0.3, cold: -0.3 } },
  vuoto: { id: 'vuoto', name: 'Creature del Vuoto', res: { fire: 0.2, cold: 0.2, lightning: 0.2, shadow: 0.5, holy: -0.25, physical: -0.15 } },
};

export interface EnemyTemplate {
  id: string;
  name: string;
  family: Family;
  /** Moltiplicatori rispetto al nemico base dello stage. */
  hp: number;
  atk: number;
  attackSpeed: number;
  def?: number;
}

const e = (id: string, name: string, family: Family, hp: number, atk: number, attackSpeed: number, def = 1): EnemyTemplate =>
  ({ id, name, family, hp, atk, attackSpeed, def });

/** Nemici normali: 3 per famiglia (robusto, veloce, corazzato). */
export const ENEMIES: EnemyTemplate[] = [
  e('ghoul', 'Ghoul', 'nonmorti', 1, 1, 0.8),
  e('scheletro', 'Scheletro', 'nonmorti', 0.8, 0.9, 1.1, 1.5),
  e('spettro', 'Spettro', 'nonmorti', 0.7, 1.2, 1),
  e('lupo', 'Lupo Corrotto', 'bestie', 0.8, 0.9, 1.3),
  e('orso', 'Orso Putrido', 'bestie', 1.4, 1.1, 0.6),
  e('ragno', 'Ragno della Notte', 'bestie', 0.9, 1, 1),
  e('accolito', 'Accolito', 'culto', 0.9, 1, 0.9),
  e('fanatico', 'Fanatico', 'culto', 0.8, 1.3, 1),
  e('templare', 'Templare Caduto', 'culto', 1.2, 0.9, 0.8, 2),
  e('imp', 'Imp', 'demoni', 0.7, 1, 1.4),
  e('cerbero', 'Segugio Infernale', 'demoni', 1, 1.2, 1),
  e('bruto', 'Bruto Abissale', 'demoni', 1.5, 1.2, 0.6, 1.5),
  e('larva', 'Larva del Vuoto', 'vuoto', 1, 0.8, 1),
  e('occhio', 'Occhio Senza Palpebre', 'vuoto', 0.8, 1.3, 0.9),
  e('divoratore', 'Divoratore', 'vuoto', 1.3, 1.1, 0.8, 1.5),
];

/** Boss di fine stage: un campione per famiglia. */
export const CHAMPIONS: Record<Family, EnemyTemplate> = {
  nonmorti: e('lich', 'Lich Minore', 'nonmorti', 6, 1.6, 0.7),
  bestie: e('alfa', 'Alfa del Branco', 'bestie', 6, 1.5, 0.9),
  culto: e('araldo', "Araldo dell'Eclissi", 'culto', 6, 1.6, 0.7),
  demoni: e('signore', 'Signore delle Fiamme', 'demoni', 6, 1.7, 0.7),
  vuoto: e('aberrazione', 'Aberrazione', 'vuoto', 6, 1.6, 0.8),
};

/** Meccaniche dei boss di zona e dei raid. */
export type Mechanic = 'enrage' | 'shield' | 'summon' | 'regen';
export const MECHANIC_TEXT: Record<Mechanic, string> = {
  enrage: 'si infuria col tempo (+50% attacco ogni 10 s)',
  shield: 'a metà vita si avvolge in uno scudo (25% della vita)',
  summon: 'evoca servitori che colpiscono ogni 3 s (40% del suo attacco)',
  regen: 'si rigenera (1,5% della vita al secondo)',
};
export const ENRAGE_EVERY_S = 10;
export const ENRAGE_STEP = 0.5;
export const BOSS_SHIELD = 0.25;
export const SUMMON_EVERY_S = 3;
export const SUMMON_ATK = 0.4;
export const BOSS_REGEN = 0.015;

export interface ZoneDef {
  name: string;
  family: Family;
  boss: EnemyTemplate;
  mechanics: Mechanic[];
  lore: string;
}

/** Stage per zona: l'ultimo stage della zona ha il boss di zona al posto del campione. */
export const ZONE_STAGES = 10;
export const ZONE_BOSS_HP = 2;

const boss = (id: string, name: string, family: Family) => e(id, name, family, 8, 1.8, 0.75);

export const ZONES: ZoneDef[] = [
  { name: 'Cimitero dei Caduti', family: 'nonmorti', boss: boss('custodeTombe', 'Custode delle Tombe', 'nonmorti'), mechanics: ['regen'],
    lore: 'Qui riposavano gli ultimi paladini. L’Eclissi li ha svegliati.' },
  { name: 'Foresta Corrotta', family: 'bestie', boss: boss('madreLupi', 'Madre dei Lupi', 'bestie'), mechanics: ['summon'],
    lore: 'Gli alberi non vedono il sole da cento anni e hanno dimenticato la luce.' },
  { name: 'Cripte del Culto', family: 'culto', boss: boss('gerofante', 'Gran Gerofante', 'culto'), mechanics: ['shield'],
    lore: 'Il Culto prega l’Eclissi perché non finisca mai.' },
  { name: 'Fornaci Infernali', family: 'demoni', boss: boss('forgiatore', 'Forgiatore di Catene', 'demoni'), mechanics: ['enrage'],
    lore: 'Le fiamme qui non fanno luce: la divorano.' },
  { name: 'Soglia del Vuoto', family: 'vuoto', boss: boss('guardiano', 'Guardiano della Soglia', 'vuoto'), mechanics: ['shield', 'regen'],
    lore: 'Oltre la Soglia il mondo smette di avere forma.' },
  { name: 'Ossario Profondo', family: 'nonmorti', boss: boss('reOssa', 'Re delle Ossa', 'nonmorti'), mechanics: ['summon', 'regen'],
    lore: 'Un trono di ossa per un re che non ricorda il suo nome.' },
  { name: 'Paludi della Peste', family: 'bestie', boss: boss('idra', 'Idra Pestilente', 'bestie'), mechanics: ['regen', 'enrage'],
    lore: 'L’acqua è nera e respira.' },
  { name: 'Cattedrale Profanata', family: 'culto', boss: boss('profeta', "Profeta dell'Eclissi", 'culto'), mechanics: ['shield', 'summon'],
    lore: 'Le vetrate un tempo mostravano il Sole. Ora mostrano solo il buio.' },
  { name: 'Abisso di Fiamma', family: 'demoni', boss: boss('arcidemone', 'Arcidemone', 'demoni'), mechanics: ['enrage', 'summon'],
    lore: 'Il calore dell’abisso è l’ultimo ricordo distorto del Sole.' },
  { name: "Cuore dell'Eclissi", family: 'vuoto', boss: boss('eclissi', "Avatar dell'Eclissi", 'vuoto'), mechanics: ['enrage', 'shield', 'regen'],
    lore: 'Il Sole è qui, prigioniero. Batte ancora, debole.' },
];

/** Zona dello stage (dopo l'ultima si ricomincia, "Eclissi II", "III"…). */
export function zoneOf(stage: number): { zone: ZoneDef; index: number; cycle: number; zoneBoss: boolean } {
  const i = Math.floor((stage - 1) / ZONE_STAGES);
  return { zone: ZONES[i % ZONES.length], index: i, cycle: Math.floor(i / ZONES.length) + 1, zoneBoss: stage % ZONE_STAGES === 0 };
}

export const zoneName = (stage: number) => {
  const z = zoneOf(stage);
  return z.cycle > 1 ? `${z.zone.name} ${roman(z.cycle)}` : z.zone.name;
};

const roman = (n: number) => {
  const r: [number, string][] = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '';
  for (const [v, s] of r) while (n >= v) { out += s; n -= v; }
  return out;
};

/** Élite: nemici normali potenziati con un affisso; più forti, ricompense e bottino migliori. */
export type EliteId = 'veloce' | 'corazzato' | 'vampirico' | 'robusto' | 'furioso';
export const ELITES: { id: EliteId; name: string; text: string }[] = [
  { id: 'veloce', name: 'Veloce', text: '+50% velocità' },
  { id: 'corazzato', name: 'Corazzato', text: 'difesa ×3' },
  { id: 'vampirico', name: 'Vampirico', text: 'si cura del 50% del danno inflitto' },
  { id: 'robusto', name: 'Robusto', text: 'vita ×2' },
  { id: 'furioso', name: 'Furioso', text: '+50% attacco' },
];
export const ELITE_CHANCE = 0.08;
export const ELITE_FROM_STAGE = 5;
export const ELITE_HP = 2;
export const ELITE_REWARD = 3;
export const ELITE_DROP = 0.5;
export const ELITE_KEY_CHANCE = 0.05;
export const VAMPIRIC_SHARE = 0.5;
