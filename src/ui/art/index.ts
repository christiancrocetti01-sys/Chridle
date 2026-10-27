import type { EnemyState } from '../../core/state';
import { FAMILIES, ZONES, type Family } from '../../data/enemies';
import type { ItemType } from '../../data/items';
import type { UniqueDef } from '../../data/uniques';
import { card, cardBack, lightIcon } from './render';
import { BOSS_ART, FAMILY_ART, HERO_ART, ITEM_ART } from './subjects';

export { cardBack, ensureArtDefs } from './render';

/** Cornici: bronzo i nemici comuni, oro campioni ed élite, rosso i boss di zona. */
const FRAME = { normal: '#8a7a55', champion: '#d4a63c', zone: '#d9434b' };

const FAMILY_ORDER = Object.keys(FAMILIES) as Family[];

/** Icona di un tipo di oggetto in linea di luce, colorata dal contenitore. */
export const itemArt = (type: ItemType, rarity = 0, cls?: string) => lightIcon(ITEM_ART[type], rarity, cls);

/** Il guerriero in linea di luce. */
export const heroArt = (cls = 'hero-art') => lightIcon(HERO_ART, 4, cls);

const enemySubject = (e: Pick<EnemyState, 'templateId' | 'family'>) => BOSS_ART[e.templateId] ?? FAMILY_ART[e.family];

/** Carta piccola (senza nome) del nemico in combattimento. */
export function enemyCard(e: EnemyState): string {
  const frame = e.zoneBoss ? FRAME.zone : e.boss || e.elite ? FRAME.champion : FRAME.normal;
  return card({ subject: enemySubject(e), frame, mark: !!e.elite });
}

/** Carta di una famiglia per il Bestiario (il dorso se non se n'è ancora ucciso nessuno). */
export const familyCard = (f: Family, known: boolean) =>
  known ? card({ subject: FAMILY_ART[f], title: FAMILIES[f].name, num: FAMILY_ORDER.indexOf(f) + 1, frame: FRAME.champion }) : cardBack();

/** Carta di un boss di zona (numero = zona). */
export const zoneBossCard = (i: number, known: boolean) => {
  const b = ZONES[i].boss;
  return known ? card({ subject: BOSS_ART[b.id] ?? FAMILY_ART[b.family], title: b.name, num: i + 1, frame: FRAME.zone }) : cardBack();
};

/** Carta di un leggendario unico della Collezione (cornice d'oro, come le altre carte del Codex). */
export const uniqueCard = (u: UniqueDef, num: number, found = true) =>
  found ? card({ subject: ITEM_ART[u.type], title: u.name, num, frame: FRAME.champion }) : cardBack();
