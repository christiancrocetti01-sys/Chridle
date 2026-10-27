/** Endgame (GDD §10 e §12): Abisso, Paragon, Rinascita Solare. */
import type { StatKey } from './items';

type Mods = [StatKey, number][];

// ── Abisso: profondità infinite, ogni profondità 10 nemici e un Guardiano ──
/** Si sblocca dopo questo numero di Ascensioni (o con la prima Rinascita). */
export const ABYSS_ASCENSIONS = 3;
export const ABYSS_WAVES = 10;
/** La profondità d ha i nemici dello stage ABYSS_BASE + d × ABYSS_STEP, più forti del normale. */
export const ABYSS_BASE = 40;
export const ABYSS_STEP = 3;
export const ABYSS_HP = 2;
export const ABYSS_ATK = 1.5;
export const ABYSS_ELITE = 0.25;
/** Si riparte da (record − ABYSS_BACK) per non rifare le profondità facili. */
export const ABYSS_BACK = 4;
/** Esperienza Paragon per uccisione = profondità (il Guardiano vale ×ABYSS_GUARDIAN_XP). */
export const ABYSS_GUARDIAN_XP = 10;

// ── Paragon: livelli infiniti guadagnati nell'Abisso, un punto per livello ──
export type ParagonId = 'forza' | 'vigore' | 'tempra' | 'celerita' | 'precisione' | 'elementi' | 'fortuna' | 'ricchezza';

export interface ParagonDef {
  id: ParagonId;
  name: string;
  /** Bonus per punto (solo percentuali). */
  mods: Mods;
}

export const PARAGON: ParagonDef[] = [
  { id: 'forza', name: 'Forza', mods: [['atkPct', 0.02]] },
  { id: 'vigore', name: 'Vigore', mods: [['hpPct', 0.02]] },
  { id: 'tempra', name: 'Tempra', mods: [['defPct', 0.02]] },
  { id: 'celerita', name: 'Celerità', mods: [['speedPct', 0.005]] },
  { id: 'precisione', name: 'Precisione', mods: [['critDmg', 0.02]] },
  { id: 'elementi', name: 'Elementi', mods: [['elemPct', 0.02]] },
  { id: 'fortuna', name: 'Fortuna', mods: [['magicFind', 0.01]] },
  { id: 'ricchezza', name: 'Ricchezza', mods: [['goldPct', 0.03], ['xpPct', 0.02]] },
];

/** Esperienza Paragon per passare dal livello l al successivo. */
export const paragonCost = (l: number) => Math.round(100 * Math.pow(l + 1, 1.5));

// ── Rinascita Solare: meta-prestige, si azzerano le Ascensioni per i Soli ──
/** Scintille guadagnate nel ciclo per poter rinascere (la prima volta). */
export const REBIRTH_SCINTILLE = 400;
/** Ogni Rinascita fatta alza la soglia di questa frazione: la Rinascita resta un traguardo, non una routine. */
export const REBIRTH_GROWTH = 0.15;
export const rebirthThreshold = (count = 0) => Math.round(REBIRTH_SCINTILLE * (1 + REBIRTH_GROWTH * count));
/** Soli ottenuti con le Scintille del ciclo (`count` = Rinascite già fatte). */
export const soliFor = (scintille: number, count = 0) => (scintille < rebirthThreshold(count) ? 0 : Math.floor(Math.sqrt(scintille / 100)));
/** Per ogni Sole: attacco, vita e difesa ×(1 + n × POWER); oro, XP ed Essenza ×(1 + n × LOOT); Scintille ×(1 + n × SPARK). */
export const SOLE_POWER = 1;
export const SOLE_LOOT = 0.5;
export const SOLE_SPARK = 0.25;
