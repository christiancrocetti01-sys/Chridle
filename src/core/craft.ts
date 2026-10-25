import { AFFIX_TIERS } from '../data/items';
import { CRAFT_GROWTH, CRAFT_UPGRADE_COST } from '../data/craft';
import { salvageValue, type Item } from './items';
import type { GameState } from './state';

export const MAX_TIER = AFFIX_TIERS[AFFIX_TIERS.length - 1].tier;
const tierMult = (tier: number) => AFFIX_TIERS.find((t) => t.tier === tier)!.mult;

/** Unici e pezzi di set non si modificano. */
export const craftable = (it: Item) => !it.special;

export const upgradeCost = (it: Item, i: number) =>
  Math.ceil(salvageValue(it) * CRAFT_UPGRADE_COST * it.affixes[i].tier * Math.pow(CRAFT_GROWTH, it.crafts ?? 0));

export function canUpgrade(state: GameState, it: Item, i: number): boolean {
  return craftable(it) && !!it.affixes[i] && it.affixes[i].tier < MAX_TIER && state.fragments >= upgradeCost(it, i);
}

/** Alza di uno il tier dell'affisso `i`: i valori si scalano come tra i due tier. */
export function upgradeAffix(state: GameState, it: Item, i: number): boolean {
  if (!canUpgrade(state, it, i)) return false;
  state.fragments -= upgradeCost(it, i);
  it.crafts = (it.crafts ?? 0) + 1;
  const a = it.affixes[i];
  const k = tierMult(a.tier + 1) / tierMult(a.tier);
  a.tier++;
  for (const m of a.mods) m.value *= k;
  if (a.power) a.power *= k;
  return true;
}

/** Spende i Frammenti sugli oggetti indossati: sempre l'aumento di tier più economico. Restituisce quanti ne fa. */
export function autoCraft(state: GameState): number {
  let done = 0;
  for (let n = 0; n < 1000; n++) {
    let best: { it: Item; i: number; cost: number } | null = null;
    for (const it of Object.values(state.gear.equipped)) {
      if (!it || !craftable(it)) continue;
      it.affixes.forEach((a, i) => {
        if (a.tier >= MAX_TIER) return;
        const cost = upgradeCost(it, i);
        if (!best || cost < best.cost) best = { it, i, cost };
      });
    }
    const b = best as { it: Item; i: number; cost: number } | null;
    if (!b || b.cost > state.fragments || !upgradeAffix(state, b.it, b.i)) break;
    done++;
  }
  return done;
}
