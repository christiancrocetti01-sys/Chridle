import { SLOTS, type SlotId } from '../data/items';
import { equip, salvageUpTo, type Item } from './items';
import type { GameState } from './state';
import { elementalDamage, stateStats } from './stats';

/** Potenza indicativa del guerriero: danni al secondo × resistenza. Serve solo a confrontare due equipaggiamenti. */
export function gearPower(state: GameState): number {
  const s = stateStats(state);
  const hit = (s.atk * (1 + s.bleed) + elementalDamage(s)) * (1 + s.critChance * (s.critMult - 1));
  const dps = hit * s.attackSpeed + s.poison;
  return dps * s.maxHp * (1 + s.def / 50) * (1 + s.lifeSteal * 10) / (1 - Math.min(0.9, s.dodge));
}

/**
 * Equip automatico: indossa ogni oggetto dell'inventario che aumenta la potenza, finché non migliora più.
 * Restituisce quanti cambi ha fatto. Le regole speciali degli unici non entrano nel conto.
 */
export function equipBest(state: GameState): number {
  const gear = state.gear;
  let changes = 0;
  let power = gearPower(state);
  for (let again = true; again;) {
    again = false;
    for (const item of gear.inventory.slice().sort((a, b) => b.rarity - a.rarity || b.ilvl - a.ilvl)) {
      if (!gear.inventory.includes(item)) continue;
      for (const slot of SLOTS.filter((x) => x.type === item.type)) {
        const old = gear.equipped[slot.id];
        equip(gear, item.uid, slot.id);
        const p = gearPower(state);
        if (p > power * (1 + 1e-9)) {
          power = p;
          changes++;
          again = true;
          break;
        }
        // nessun miglioramento: si rimette com'era
        if (old) equip(gear, old.uid, slot.id);
        else { delete gear.equipped[slot.id]; gear.inventory.push(item); }
      }
    }
  }
  return changes;
}

/**
 * Bottino automatico: l'oggetto nuovo va nello slot dove alza di più la potenza (il vecchio viene smantellato),
 * altrimenti si smantella subito. La vita persa resta persa. Restituisce lo slot usato, se c'è.
 */
export function takeItem(state: GameState, item: Item): SlotId | undefined {
  const gear = state.gear;
  const hp0 = stateStats(state).maxHp;
  let power = gearPower(state);
  let best: SlotId | undefined;
  gear.inventory.push(item);
  for (const slot of SLOTS.filter((x) => x.type === item.type)) {
    const old = gear.equipped[slot.id];
    equip(gear, item.uid, slot.id);
    const p = gearPower(state);
    if (p > power * (1 + 1e-9)) { power = p; best = slot.id; }
    // si rimette com'era: si sceglie lo slot migliore alla fine
    if (old) equip(gear, old.uid, slot.id);
    else { delete gear.equipped[slot.id]; gear.inventory.push(item); }
  }
  if (best) equip(gear, item.uid, best);
  state.fragments += salvageUpTo(gear, Infinity);
  if (best) {
    const hp1 = stateStats(state).maxHp;
    state.hero.hp = Math.max(1, Math.min(hp1, state.hero.hp + hp1 - hp0));
  }
  return best;
}

/** Salvataggi di prima dell'automatico: indossa il meglio dell'inventario e smantella il resto. */
export function absorbInventory(state: GameState): number {
  if (!state.gear.inventory.length) return 0;
  const n = equipBest(state);
  state.fragments += salvageUpTo(state.gear, Infinity);
  return n;
}
