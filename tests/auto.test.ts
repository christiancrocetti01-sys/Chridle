import { describe, expect, it } from 'vitest';
import { PARAGON_ORDER, PERK_FIRST, autoGold, autoParagon, autoPerks, autoSpend } from '../src/core/auto';
import { perkCost, perkLevel } from '../src/core/ascension';
import { upgradePrice } from '../src/core/combat';
import { paragonFree } from '../src/core/endgame';
import { newGame } from '../src/core/state';
import { PERKS } from '../src/data/ascension';
import { UPGRADES } from '../src/data/upgrades';

describe('spese automatiche', () => {
  it("l'oro compra sempre il Potenziamento più economico", () => {
    const s = newGame(0, 1);
    s.gold = 1e5;
    const n = autoGold(s);
    expect(n).toBeGreaterThan(3);
    const cheapest = Math.min(...UPGRADES.map((u) => upgradePrice(s, u.id)));
    expect(s.gold).toBeLessThan(cheapest);
    // nessun potenziamento resta indietro di molto: si compra a rotazione per prezzo
    const lv = UPGRADES.map((u) => s.upgrades[u.id]);
    expect(Math.min(...lv)).toBeGreaterThan(0);
  });

  it('il Paragon spende i punti a giro nell’ordine fisso', () => {
    const s = newGame(0, 1);
    s.paragon.level = 12;
    autoParagon(s);
    expect(paragonFree(s.paragon)).toBe(0);
    const want: Record<string, number> = {};
    for (let i = 0; i < 12; i++) want[PARAGON_ORDER[i % PARAGON_ORDER.length]] = (want[PARAGON_ORDER[i % PARAGON_ORDER.length]] ?? 0) + 1;
    expect(s.paragon.points).toEqual(want);
    s.paragon.level = 13; // il punto nuovo continua il giro
    autoParagon(s);
    expect(s.paragon.points.forza).toBe(want.forza + 1);
  });

  it("le Scintille vanno prima a Doppia Via e Quinto Sole, poi al potenziamento più economico", () => {
    const s = newGame(0, 1);
    s.ascension.scintille = 4; // Doppia Via costa 5: si aspetta
    expect(autoPerks(s)).toBe(0);
    s.ascension.scintille = 5;
    autoPerks(s);
    expect(perkLevel(s.ascension, 'secondaVia')).toBe(1);
    expect(s.vie.secondUnlocked).toBe(true);
    s.ascension.scintille = 1e6;
    autoPerks(s);
    for (const id of PERK_FIRST) expect(perkLevel(s.ascension, id)).toBe(PERKS.find((d) => d.id === id)!.max);
    const open = PERKS.filter((d) => d.max === undefined || perkLevel(s.ascension, d.id) < d.max);
    expect(s.ascension.scintille).toBeLessThan(Math.min(...open.map((d) => perkCost(s.ascension, d.id))));
    expect(perkLevel(s.ascension, 'fiamma')).toBeGreaterThan(5);
    expect(perkLevel(s.ascension, 'balzo')).toBeGreaterThan(0);
  });

  it('autoSpend non lascia niente da spendere e non rompe lo stato', () => {
    const s = newGame(0, 1);
    s.gold = 1e6;
    s.essence = 1e6;
    s.paragon.level = 3;
    autoSpend(s);
    expect(paragonFree(s.paragon)).toBe(0);
    expect(s.gold).toBeLessThan(Math.min(...UPGRADES.map((u) => upgradePrice(s, u.id))));
    expect(Number.isFinite(s.hero.hp)).toBe(true);
  });
});

describe('offline con le spese automatiche', () => {
  it("l'oro offline si conta dalle uccisioni: mai negativo anche se il campione lo spende", async () => {
    const { applyOffline } = await import('../src/core/offline');
    const s = newGame(0, 3);
    s.gold = 0;
    const r = applyOffline(s, 3600)!;
    expect(r.gold).toBeGreaterThan(0);
    expect(s.gold).toBeGreaterThanOrEqual(0);
  });
});
