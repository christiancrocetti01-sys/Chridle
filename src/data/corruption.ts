/** Purezza/Corruzione: valore fisso da −100 (Puro) a +100 (Corrotto), somma di oggetti, Costellazioni e Vie. */
export const CORRUPTION_MAX = 100;
/** Per punto di Corruzione: +danni, −difesa e cure. */
export const CORRUPT_DMG = 0.01;
export const CORRUPT_TANK = 0.005;
/** Per punto di Purezza: −danni, +difesa e cure. */
export const PURE_DMG = 0.005;
export const PURE_TANK = 0.01;
/** Soglia delle regole "Corrotto" (skill d'Ombra pagate con la vita) e "Puro" (cure in eccesso → scudo). */
export const CORRUPTION_THRESHOLD = 50;
/** Corrotto: vita spesa per punto di Luce (frazione della vita massima). */
export const CORRUPT_HP_PER_LIGHT = 0.001;
/** Eclissi (+100): danni ×2, niente cure. */
export const ECLIPSE_MULT = 2;
/** Santità (−100): sopravvive a un colpo mortale ogni tot secondi. */
export const SANCTITY_SECONDS = 30;

export type CorruptionState = 'eclissi' | 'corrotto' | 'neutro' | 'puro' | 'santo';

export function corruptionState(c: number): CorruptionState {
  if (c >= CORRUPTION_MAX) return 'eclissi';
  if (c >= CORRUPTION_THRESHOLD) return 'corrotto';
  if (c <= -CORRUPTION_MAX) return 'santo';
  if (c <= -CORRUPTION_THRESHOLD) return 'puro';
  return 'neutro';
}

export const CORRUPTION_NAMES: Record<CorruptionState, string> = {
  eclissi: 'Eclissi', corrotto: 'Corrotto', neutro: 'Neutro', puro: 'Puro', santo: 'Santità',
};
