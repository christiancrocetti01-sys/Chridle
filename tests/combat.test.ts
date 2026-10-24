import { describe, expect, it } from 'vitest';
import { buyUpgrade, step, upgradePrice, type CombatEvent } from '../src/core/combat';
import { newGame, type GameState } from '../src/core/state';
import { equip, salvageUpTo } from '../src/core/items';
import { KILLS_PER_STAGE, elementalDamage, stateStats } from '../src/core/stats';
import { SLOTS } from '../src/data/items';
import { UPGRADES } from '../src/data/upgrades';

function run(state: GameState, ticks: number): CombatEvent[] {
  const events: CombatEvent[] = [];
  for (let i = 0; i < ticks; i++) step(state, events);
  return events;
}

/** Giocatore idle "ragionevole": compra sempre il potenziamento più economico. */
function autoBuy(state: GameState) {
  for (;;) {
    const cheapest = UPGRADES.map((u) => u.id).sort((a, b) => upgradePrice(state, a) - upgradePrice(state, b))[0];
    if (!buyUpgrade(state, cheapest)) return;
  }
}

/** Misura grezza di potenza: danno al secondo × resistenza. */
function power(state: GameState): number {
  const s = stateStats(state);
  const hit = (s.atk * (1 + s.bleed) + elementalDamage(s)) * (1 + s.critChance * (s.critMult - 1));
  const dps = hit * s.attackSpeed + s.poison;
  return dps * s.maxHp * (1 + s.def / 50) * (1 + s.lifeSteal * 10) / (1 - s.dodge);
}

/** Indossa ogni oggetto che aumenta la potenza, poi smantella il resto. */
function autoEquip(state: GameState) {
  for (const item of state.gear.inventory.slice()) {
    for (const slot of SLOTS.filter((x) => x.type === item.type)) {
      const before = power(state);
      const old = state.gear.equipped[slot.id];
      equip(state.gear, item.uid, slot.id);
      if (power(state) > before) break;
      if (old) equip(state.gear, old.uid, slot.id);
      else { state.gear.inventory.push(item); delete state.gear.equipped[slot.id]; }
    }
  }
  state.fragments += salvageUpTo(state.gear, 99);
}

describe('combattimento', () => {
  it('è deterministico a parità di seme', () => {
    const a = newGame(0, 42);
    const b = newGame(0, 42);
    run(a, 5000);
    run(b, 5000);
    expect(a).toEqual(b);
  });

  it('uccidere un nemico dà oro ed esperienza', () => {
    const s = newGame(0, 1);
    const ev = run(s, 200);
    expect(ev.some((e) => e.type === 'kill')).toBe(true);
    expect(s.gold).toBeGreaterThan(0);
    expect(s.hero.xp + s.hero.level).toBeGreaterThan(1);
  });

  it(`dopo ${KILLS_PER_STAGE} uccisioni arriva il boss, sconfiggerlo avanza di stage`, () => {
    const s = newGame(0, 3);
    s.stage.kills = KILLS_PER_STAGE;
    run(s, 10);
    expect(s.enemy?.boss).toBe(true);
    s.enemy!.hp = 1;
    const ev: CombatEvent[] = [];
    while (!ev.some((e) => e.type === 'stage')) step(s, ev);
    expect(ev).toContainEqual({ type: 'stage', stage: 2 });
    expect(s.stage.kills).toBe(0);
  });

  it('morendo si torna indietro e si farma finché non si sale di livello', () => {
    const s = newGame(0, 5);
    s.stage.current = s.stage.best = 40; // troppo difficile
    const ev = run(s, 600);
    expect(ev.some((e) => e.type === 'death')).toBe(true);
    expect(s.stage.current).toBeLessThan(40);
    expect(s.totals.deaths).toBeGreaterThan(0);
  });

  it("non si compra senza oro; comprando si scala il prezzo", () => {
    const s = newGame(0);
    expect(buyUpgrade(s, 'forza')).toBe(false);
    s.gold = 1000;
    const p0 = upgradePrice(s, 'forza');
    expect(buyUpgrade(s, 'forza')).toBe(true);
    expect(s.gold).toBe(1000 - p0);
    expect(upgradePrice(s, 'forza')).toBeGreaterThan(p0);
  });

  it.each([false, true])('bilanciamento (equip automatico: %s): progressi sensati in 10 minuti e in 2 ore', (gear) => {
    const s = newGame(0, 7);
    const checkpoints: Record<string, unknown> = {};
    for (let minute = 1; minute <= 120; minute++) {
      run(s, 600);
      autoBuy(s);
      if (gear) autoEquip(s);
      if (minute === 10 || minute === 120) {
        checkpoints[minute] = { stage: s.stage.current, best: s.stage.best, level: s.hero.level, deaths: s.totals.deaths };
      }
    }
    console.log('bilanciamento', gear ? 'con equip' : 'senza equip', JSON.stringify(checkpoints));
    const m10 = checkpoints[10] as { best: number };
    const m120 = checkpoints[120] as { best: number };
    // ritmo iniziale veloce, poi rallenta: i "muri" li romperanno equip e prestige (Fasi 2-5)
    expect(m10.best).toBeGreaterThanOrEqual(5);
    expect(m120.best).toBeGreaterThanOrEqual(m10.best * 1.5);
  });
});
