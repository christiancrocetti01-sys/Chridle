/** Collezione leggendari (GDD §14): ogni unico trovato almeno una volta dà un piccolo bonus permanente. */
import type { StatKey } from './items';

type Mods = [StatKey, number][];

/** Bonus per unico trovato, a tema con l'unico (solo percentuali: non crescono con il livello). */
export const COLLECTION_BONUS: Record<string, Mods> = {
  crepuscolo: [['critDmg', 0.05]],
  boia: [['bossDmg', 0.04]],
  brace: [['firePct', 0.04]],
  tuono: [['lightningPct', 0.04]],
  geloEterno: [['coldPct', 0.04]],
  martire: [['holyPct', 0.04]],
  vuoto: [['shadowPct', 0.04]],
  eclissi: [['dodge', 0.01]],
  peste: [['bleed', 0.01]],
  calice: [['regenPct', 0.001]],
  berserker: [['lifeSteal', 0.002]],
  eco: [['elemPct', 0.02]],
  tormenta: [['speedPct', 0.02]],
  soleNascente: [['defPct', 0.03]],
  albaGemella: [['crit', 0.01]],
  torcia: [['firePct', 0.02], ['holyPct', 0.02]],
  astrolabio: [['magicFind', 0.03]],
  coronaNera: [['hpPct', 0.03]],
  zannaInverno: [['coldPct', 0.03]],
  catenaFolgore: [['lightningPct', 0.03]],
  mietitore: [['lifeSteal', 0.002]],
  baluardo: [['defPct', 0.03]],
  primoRaggio: [['critDmg', 0.04]],
  rovi: [['holyPct', 0.03]],
  viandante: [['goldPct', 0.05]],
  brina: [['dodge', 0.01]],
  titano: [['hpPct', 0.03]],
  lampo: [['speedPct', 0.02]],
  occhioAbisso: [['shadowPct', 0.03]],
  aurora: [['regenPct', 0.001]],
};

/** Premi di completamento (si sommano): frazione della collezione → bonus. */
export const COLLECTION_MILESTONES: { frac: number; mods: Mods }[] = [
  { frac: 0.25, mods: [['atkPct', 0.05], ['hpPct', 0.05]] },
  { frac: 0.5, mods: [['atkPct', 0.1], ['hpPct', 0.1]] },
  { frac: 1, mods: [['atkPct', 0.15], ['hpPct', 0.15], ['magicFind', 0.1]] },
];
