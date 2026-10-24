import { CODEX_DMG, CODEX_TIERS } from '../data/codex';
import { FAMILIES, type Family } from '../data/enemies';

/** Uccisioni per famiglia: non si azzerano con l'Ascensione. */
export type CodexState = Record<Family, number>;

export const newCodex = (): CodexState =>
  Object.fromEntries(Object.keys(FAMILIES).map((f) => [f, 0])) as CodexState;

/** Grado raggiunto (0 = nessuno) con queste uccisioni. */
export const codexTier = (kills: number) => CODEX_TIERS.filter((n) => kills >= n).length;

/** Moltiplicatore del danno contro ogni famiglia. */
export function familyMult(codex: CodexState | undefined): Record<Family, number> {
  return Object.fromEntries(Object.keys(FAMILIES).map((f) =>
    [f, 1 + CODEX_DMG * codexTier(codex?.[f as Family] ?? 0)])) as Record<Family, number>;
}
