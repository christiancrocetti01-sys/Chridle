import { SKILL_TAGS, SKILL_TAG_LABELS, type SkillTag } from './skills';

/** Statistiche che gli oggetti possono modificare. I "Pct" e le probabilità sono frazioni (0.1 = +10%). */
export type StatKey =
  | 'atk' | 'def' | 'hp'
  | 'atkPct' | 'defPct' | 'hpPct'
  | 'speedPct' | 'crit' | 'critDmg' | 'regenPct'
  | Element | `${Element}Pct` | 'elemPct'
  | 'poison' | 'bleed' | 'lifeSteal' | 'dodge' | 'thorns'
  | 'goldPct' | 'xpPct' | 'magicFind' | 'bossDmg'
  | `${SkillTag}Skill` | `${SkillTag}Cdr`;

/** Elementi: danno aggiunto a ogni colpo, non ridotto dalla difesa. */
export const ELEMENTS = ['fire', 'cold', 'lightning', 'holy', 'shadow'] as const;
export type Element = (typeof ELEMENTS)[number];

export const STAT_LABELS: Record<StatKey, string> = {
  atk: 'Attacco', def: 'Difesa', hp: 'Vita',
  atkPct: 'Attacco', defPct: 'Difesa', hpPct: 'Vita',
  speedPct: "Velocità d'attacco", crit: 'Probabilità di critico', critDmg: 'Danno critico', regenPct: 'Rigenerazione',
  fire: 'Danno da fuoco', cold: 'Danno da gelo', lightning: 'Danno da fulmine', holy: 'Danno sacro', shadow: "Danno d'ombra",
  firePct: 'Danno da fuoco', coldPct: 'Danno da gelo', lightningPct: 'Danno da fulmine', holyPct: 'Danno sacro', shadowPct: "Danno d'ombra",
  elemPct: 'Danno elementale',
  poison: 'Veleno al secondo', bleed: 'Sanguinamento (del danno fisico)', lifeSteal: 'Rubavita', dodge: 'Schivata', thorns: 'Danno da spine',
  goldPct: 'Oro', xpPct: 'Esperienza', magicFind: 'Ritrovamento magico', bossDmg: 'Danno ai boss',
  ...(Object.fromEntries(SKILL_TAGS.flatMap((t) => [
    [`${t}Skill`, `Effetto delle skill ${SKILL_TAG_LABELS[t]}`],
    [`${t}Cdr`, `Riduzione ricarica delle skill ${SKILL_TAG_LABELS[t]}`],
  ])) as Record<`${SkillTag}Skill` | `${SkillTag}Cdr`, string>),
};

/** Statistiche piatte: crescono con il livello oggetto. Tutte le altre sono percentuali. */
export const FLAT_STATS: ReadonlySet<StatKey> = new Set<StatKey>(['atk', 'def', 'hp', ...ELEMENTS, 'poison', 'thorns']);
export const isPct = (stat: StatKey) => !FLAT_STATS.has(stat);

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
  /** Probabilità che uno degli affissi sia un effetto a scatto (trigger). */
  triggerChance: number;
}

/** In ordine crescente: l'indice è il "grado" della rarità. */
export const RARITIES: RarityDef[] = [
  { id: 'comune', name: 'Comune', color: '#c9c9c9', affixes: 0, power: 1, weight: 600, fragments: 1, triggerChance: 0 },
  { id: 'magico', name: 'Magico', color: '#5b8cff', affixes: 1, power: 1.1, weight: 250, fragments: 2, triggerChance: 0 },
  { id: 'raro', name: 'Raro', color: '#f2d24b', affixes: 2, power: 1.25, weight: 100, fragments: 5, triggerChance: 0 },
  { id: 'epico', name: 'Epico', color: '#b45cff', affixes: 3, power: 1.45, weight: 40, fragments: 12, triggerChance: 0.3 },
  { id: 'leggendario', name: 'Leggendario', color: '#ff8a1f', affixes: 4, power: 1.7, weight: 9, fragments: 30, triggerChance: 0.5 },
  { id: 'mitico', name: 'Mitico', color: '#ff3b4e', affixes: 5, power: 2, weight: 0.9, fragments: 80, triggerChance: 0.75 },
  { id: 'divino', name: 'Divino', color: '#fff6c8', affixes: 6, power: 2.5, weight: 0.1, fragments: 250, triggerChance: 1 },
];

/** Tag delle sinergie: oggi descrittivi, poi useranno trigger, set e leggendari. */
export type Tag =
  | 'fisico' | 'sacro' | 'fuoco' | 'gelo' | 'fulmine' | 'ombra'
  | 'critico' | 'sanguinamento' | 'veleno' | 'difesa' | 'rubavita'
  | 'vita' | 'velocita' | 'fortuna';

export const TAG_LABELS: Record<Tag, string> = {
  fisico: 'Fisico', sacro: 'Sacro', fuoco: 'Fuoco', gelo: 'Gelo', fulmine: 'Fulmine', ombra: 'Ombra',
  critico: 'Critico', sanguinamento: 'Sanguinamento', veleno: 'Veleno', difesa: 'Difesa', rubavita: 'Rubavita',
  vita: 'Vita', velocita: 'Velocità', fortuna: 'Fortuna',
};

export interface AffixDef {
  id: string;
  /** Suffisso usato nel nome dell'oggetto. */
  name: string;
  tags: Tag[];
  /** Tipi di oggetto su cui può comparire. */
  types: ItemType[];
  /** Valori al tier 1 (le statistiche piatte: a livello oggetto 1). Gli ibridi hanno due statistiche più deboli. */
  mods: { stat: StatKey; value: number }[];
}

type T = ItemType;
const OFFENSE: T[] = ['arma', 'guanti', 'anello', 'amuleto'];
const ARMOR: T[] = ['secondaria', 'elmo', 'armatura', 'guanti', 'stivali', 'cintura', 'mantello'];
const BODY: T[] = ['elmo', 'armatura', 'cintura', 'mantello'];
const FOCUS: T[] = ['arma', 'secondaria', 'anello', 'amuleto', 'reliquia'];
const CDR: T[] = ['elmo', 'guanti', 'mantello', 'reliquia'];

const affix = (id: string, name: string, tags: Tag[], types: T[], ...mods: [StatKey, number][]): AffixDef =>
  ({ id, name, tags, types, mods: mods.map(([stat, value]) => ({ stat, value })) });

export const AFFIXES: AffixDef[] = [
  // fisico
  affix('atk', 'del Falco', ['fisico'], OFFENSE, ['atk', 2]),
  affix('atkHeavy', 'del Massacro', ['fisico'], ['arma'], ['atk', 3.5]),
  affix('atkPct', 'della Furia', ['fisico'], [...OFFENSE, 'reliquia'], ['atkPct', 0.03]),
  affix('atkPctHeavy', 'del Carnefice', ['fisico'], ['arma'], ['atkPct', 0.06]),
  affix('speedPct', "dell'Alba", ['velocita'], [...OFFENSE, 'stivali'], ['speedPct', 0.02]),
  // critico
  affix('crit', 'del Lampo', ['critico'], [...OFFENSE, 'elmo'], ['crit', 0.01]),
  affix('critHeavy', 'del Colpo Preciso', ['critico'], ['arma'], ['crit', 0.02]),
  affix('critDmg', 'della Lama Nera', ['critico'], OFFENSE, ['critDmg', 0.06]),
  // difesa e vita
  affix('def', 'della Torre', ['difesa'], ARMOR, ['def', 1.2]),
  affix('defPct', 'del Bastione', ['difesa'], [...ARMOR, 'reliquia'], ['defPct', 0.03]),
  affix('defPctHeavy', 'della Muraglia', ['difesa'], ['secondaria'], ['defPct', 0.06]),
  affix('hp', "dell'Orso", ['vita'], [...ARMOR, 'amuleto'], ['hp', 10]),
  affix('hpPct', 'della Vita', ['vita'], [...BODY, 'amuleto'], ['hpPct', 0.03]),
  affix('regenPct', 'del Sole', ['vita'], ['elmo', 'armatura', 'cintura', 'amuleto', 'reliquia'], ['regenPct', 0.002]),
  affix('dodge', "dell'Ombra Danzante", ['difesa'], ['guanti', 'stivali', 'mantello', 'anello'], ['dodge', 0.01]),
  affix('thorns', 'del Rovo', ['difesa'], ['secondaria', 'elmo', 'armatura', 'cintura'], ['thorns', 2]),
  // elementi: danno piatto
  affix('fire', 'della Brace', ['fuoco'], OFFENSE, ['fire', 1.5]),
  affix('cold', 'della Brina', ['gelo'], OFFENSE, ['cold', 1.5]),
  affix('lightning', 'della Tempesta', ['fulmine'], OFFENSE, ['lightning', 1.5]),
  affix('holy', 'della Luce', ['sacro'], OFFENSE, ['holy', 1.5]),
  affix('shadow', "dell'Eclissi", ['ombra'], OFFENSE, ['shadow', 1.5]),
  // elementi: percentuali
  affix('firePct', "dell'Inferno", ['fuoco'], FOCUS, ['firePct', 0.05]),
  affix('coldPct', "dell'Inverno", ['gelo'], FOCUS, ['coldPct', 0.05]),
  affix('lightningPct', 'del Tuono', ['fulmine'], FOCUS, ['lightningPct', 0.05]),
  affix('holyPct', 'dei Santi', ['sacro'], FOCUS, ['holyPct', 0.05]),
  affix('shadowPct', 'del Vuoto', ['ombra'], FOCUS, ['shadowPct', 0.05]),
  affix('elemPct', "dell'Arcano", ['fuoco', 'gelo', 'fulmine', 'sacro', 'ombra'], ['anello', 'amuleto', 'reliquia'], ['elemPct', 0.03]),
  // sanguinamento, veleno, rubavita
  affix('bleed', 'del Macellaio', ['sanguinamento'], ['arma', 'guanti'], ['bleed', 0.04]),
  affix('bleedJewel', 'della Ferita Aperta', ['sanguinamento'], ['anello', 'amuleto', 'reliquia'], ['bleed', 0.02]),
  affix('poison', 'della Vipera', ['veleno'], ['arma', 'guanti', 'anello'], ['poison', 1]),
  affix('poisonFocus', 'della Palude', ['veleno'], ['secondaria', 'amuleto', 'reliquia'], ['poison', 0.7]),
  affix('lifeSteal', 'del Vampiro', ['rubavita'], ['arma', 'anello', 'amuleto'], ['lifeSteal', 0.005]),
  // fortuna e boss
  affix('goldPct', "dell'Avaro", ['fortuna'], ['guanti', 'cintura', 'elmo', 'anello', 'amuleto'], ['goldPct', 0.05]),
  affix('xpPct', 'del Saggio', ['fortuna'], ['elmo', 'anello', 'amuleto', 'reliquia'], ['xpPct', 0.04]),
  affix('magicFind', 'del Cercatore', ['fortuna'], ['elmo', 'stivali', 'mantello', 'anello', 'amuleto'], ['magicFind', 0.05]),
  affix('bossDmg', 'dello Sterminatore', ['fisico'], ['arma', 'amuleto', 'reliquia'], ['bossDmg', 0.05]),
  // ibridi: due statistiche, ognuna più debole
  affix('crusader', 'del Crociato', ['sacro', 'difesa'], ['arma', 'secondaria', 'armatura'], ['holy', 1.1], ['def', 0.8]),
  affix('paladin', 'del Paladino', ['sacro', 'vita'], ['elmo', 'armatura', 'reliquia'], ['holyPct', 0.04], ['hp', 7]),
  affix('temple', 'del Tempio', ['sacro', 'vita'], ['amuleto', 'reliquia'], ['holy', 1], ['regenPct', 0.0015]),
  affix('phoenix', 'della Fenice', ['fuoco', 'vita'], ['mantello', 'amuleto', 'reliquia'], ['fire', 1.1], ['regenPct', 0.0015]),
  affix('glacier', 'del Ghiacciaio', ['gelo', 'difesa'], ['secondaria', 'armatura', 'anello'], ['cold', 1.1], ['defPct', 0.02]),
  affix('stormRunner', 'del Fulmine Rapido', ['fulmine', 'velocita'], ['arma', 'guanti', 'stivali'], ['lightning', 1.1], ['speedPct', 0.015]),
  affix('assassin', 'del Sicario', ['ombra', 'critico'], ['arma', 'guanti', 'mantello'], ['shadow', 1.1], ['crit', 0.008]),
  affix('warlock', 'dello Stregone', ['ombra'], ['secondaria', 'amuleto'], ['shadowPct', 0.03], ['elemPct', 0.02]),
  affix('venomBlade', 'della Lama Avvelenata', ['veleno', 'fisico'], ['arma'], ['poison', 0.7], ['atk', 1.4]),
  affix('venomThorn', 'della Spina Velenosa', ['veleno', 'difesa'], ['secondaria', 'armatura', 'mantello'], ['thorns', 1.4], ['poison', 0.5]),
  affix('berserker', 'del Berserker', ['fisico', 'rubavita'], ['arma', 'cintura'], ['atkPct', 0.04], ['lifeSteal', 0.003]),
  affix('leech', 'della Sanguisuga', ['sanguinamento', 'rubavita'], ['guanti', 'anello'], ['bleed', 0.03], ['lifeSteal', 0.003]),
  affix('duelist', 'del Duellante', ['critico', 'difesa'], ['guanti', 'stivali', 'anello'], ['crit', 0.008], ['dodge', 0.008]),
  affix('kingslayer', 'del Cacciatore di Re', ['critico'], ['arma', 'guanti'], ['bossDmg', 0.04], ['critDmg', 0.04]),
  affix('giant', 'del Gigante', ['vita'], ['armatura', 'cintura'], ['hp', 7], ['hpPct', 0.02]),
  affix('merchant', 'del Mercante', ['fortuna'], ['cintura', 'anello'], ['goldPct', 0.04], ['magicFind', 0.04]),
  // sinergie per tag delle skill: effetto (danno, cura, scudo, velocità) e ricarica
  affix('sacroSkill', 'del Salmo', ['sacro'], FOCUS, ['sacroSkill', 0.1]),
  affix('curaSkill', 'del Guaritore', ['vita'], FOCUS, ['curaSkill', 0.1]),
  affix('velocitaSkill', 'del Vento', ['velocita'], FOCUS, ['velocitaSkill', 0.1]),
  affix('fuocoSkill', 'del Rogo', ['fuoco'], FOCUS, ['fuocoSkill', 0.1]),
  affix('tempoSkill', 'della Clessidra', ['veleno', 'sanguinamento'], FOCUS, ['tempoSkill', 0.1]),
  affix('scudoSkill', 'del Custode', ['difesa'], FOCUS, ['scudoSkill', 0.1]),
  affix('fisicoSkill', 'del Gladiatore', ['fisico'], FOCUS, ['fisicoSkill', 0.1]),
  affix('fulmineSkill', 'della Folgore', ['fulmine'], FOCUS, ['fulmineSkill', 0.1]),
  affix('ombraSkill', 'del Crepuscolo', ['ombra'], FOCUS, ['ombraSkill', 0.1]),
  affix('sacroCdr', 'del Vespro', ['sacro'], CDR, ['sacroCdr', 0.05]),
  affix('curaCdr', 'della Fonte', ['vita'], CDR, ['curaCdr', 0.05]),
  affix('velocitaCdr', 'del Ritmo', ['velocita'], CDR, ['velocitaCdr', 0.05]),
  affix('fuocoCdr', 'della Fiamma Eterna', ['fuoco'], CDR, ['fuocoCdr', 0.05]),
  affix('tempoCdr', "dell'Attesa", ['veleno', 'sanguinamento'], CDR, ['tempoCdr', 0.05]),
  affix('scudoCdr', 'del Baluardo', ['difesa'], CDR, ['scudoCdr', 0.05]),
  affix('fisicoCdr', 'del Veterano', ['fisico'], CDR, ['fisicoCdr', 0.05]),
  affix('fulmineCdr', 'del Temporale', ['fulmine'], CDR, ['fulmineCdr', 0.05]),
  affix('ombraCdr', "dell'Ombra Lunga", ['ombra'], CDR, ['ombraCdr', 0.05]),
];

/** Quando scatta un effetto. */
export type TriggerOn = 'crit' | 'everyN' | 'kill' | 'struck' | 'dodge';

/**
 * Effetto a scatto. `value` è al tier 1 ed è moltiplicato dal tier:
 * burst/bleed/poison = frazione dell'attacco, heal/shield = frazione della vita massima, haste = velocità in più.
 */
export type TriggerEffect =
  | { kind: 'burst'; element: Element; value: number }
  | { kind: 'bleed' | 'poison' | 'heal' | 'shield'; value: number }
  | { kind: 'haste'; value: number; seconds: number };

export interface TriggerDef {
  id: string;
  name: string;
  tags: Tag[];
  types: ItemType[];
  on: TriggerOn;
  /** Per `everyN`: ogni quanti colpi. */
  n?: number;
  effect: TriggerEffect;
}

const trig = (id: string, name: string, tags: Tag[], types: T[], on: TriggerOn, effect: TriggerEffect, n?: number): TriggerDef =>
  ({ id, name, tags, types, on, effect, ...(n ? { n } : {}) });

/** Effetti a scatto: solo da Epico in su, al massimo uno per oggetto. Effetti uguali su più oggetti si sommano. */
export const TRIGGER_AFFIXES: TriggerDef[] = [
  // al critico
  trig('critFire', "dell'Incendio", ['fuoco', 'critico'], ['arma', 'guanti', 'anello', 'amuleto'], 'crit', { kind: 'burst', element: 'fire', value: 0.5 }),
  trig('critHoly', 'del Giudizio', ['sacro', 'critico'], ['arma', 'amuleto', 'reliquia'], 'crit', { kind: 'burst', element: 'holy', value: 0.5 }),
  trig('critBleed', 'dello Squartatore', ['sanguinamento', 'critico'], ['arma', 'guanti'], 'crit', { kind: 'bleed', value: 0.6 }),
  trig('critHaste', 'del Fervore', ['velocita', 'critico'], ['guanti', 'stivali', 'anello'], 'crit', { kind: 'haste', value: 0.15, seconds: 3 }),
  // ogni N colpi
  trig('nLightning', 'della Folgore', ['fulmine'], ['arma', 'guanti', 'anello'], 'everyN', { kind: 'burst', element: 'lightning', value: 0.9 }, 4),
  trig('nShadow', "dell'Abisso", ['ombra'], ['arma', 'mantello', 'amuleto'], 'everyN', { kind: 'burst', element: 'shadow', value: 1.1 }, 5),
  trig('nCold', 'della Valanga', ['gelo'], ['secondaria', 'anello', 'amuleto'], 'everyN', { kind: 'burst', element: 'cold', value: 0.9 }, 4),
  trig('nPoison', 'della Pestilenza', ['veleno'], ['arma', 'guanti', 'secondaria'], 'everyN', { kind: 'poison', value: 0.8 }, 3),
  // all'uccisione
  trig('killHeal', 'del Martire', ['vita'], ['elmo', 'armatura', 'amuleto', 'reliquia'], 'kill', { kind: 'heal', value: 0.04 }),
  trig('killHaste', 'della Carneficina', ['velocita'], ['arma', 'stivali', 'cintura'], 'kill', { kind: 'haste', value: 0.2, seconds: 5 }),
  trig('killShield', 'del Custode', ['difesa'], ['secondaria', 'armatura', 'mantello'], 'kill', { kind: 'shield', value: 0.06 }),
  // quando si viene colpiti
  trig('struckShield', 'della Fede', ['sacro', 'difesa'], ['secondaria', 'elmo', 'armatura', 'cintura'], 'struck', { kind: 'shield', value: 0.03 }),
  trig('struckFire', 'della Vendetta', ['fuoco', 'difesa'], ['armatura', 'cintura', 'mantello'], 'struck', { kind: 'burst', element: 'fire', value: 0.4 }),
  trig('struckHeal', 'della Grazia', ['sacro', 'vita'], ['elmo', 'cintura', 'reliquia'], 'struck', { kind: 'heal', value: 0.015 }),
  // alla schivata
  trig('dodgeShadow', "dell'Ombra Vendicativa", ['ombra', 'difesa'], ['guanti', 'stivali', 'mantello'], 'dodge', { kind: 'burst', element: 'shadow', value: 0.8 }),
  trig('dodgeHaste', 'del Vento', ['velocita', 'difesa'], ['stivali', 'mantello'], 'dodge', { kind: 'haste', value: 0.15, seconds: 3 }),
];

export function triggersFor(type: ItemType): TriggerDef[] {
  return TRIGGER_AFFIXES.filter((a) => a.types.includes(type));
}

/** Definizione di un affisso (normale o a scatto) dal suo id. */
export function affixDef(id: string): AffixDef | TriggerDef | undefined {
  return AFFIXES.find((a) => a.id === id) ?? TRIGGER_AFFIXES.find((a) => a.id === id);
}

/** Affissi che possono comparire su un tipo di oggetto. */
export function affixesFor(type: ItemType): AffixDef[] {
  return AFFIXES.filter((a) => a.types.includes(type));
}

/** Tier degli affissi: T1 comune … T5 raro. Il valore è moltiplicato per `mult`. */
export const AFFIX_TIERS = [
  { tier: 1, weight: 50, mult: 1 },
  { tier: 2, weight: 28, mult: 1.5 },
  { tier: 3, weight: 14, mult: 2 },
  { tier: 4, weight: 6, mult: 2.7 },
  { tier: 5, weight: 2, mult: 3.5 },
];
