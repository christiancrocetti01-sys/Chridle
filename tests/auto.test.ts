import { describe, expect, it } from 'vitest';
import { PARAGON_ORDER, VIA_PARAGON, autoGold, autoParagon, autoPerks, autoSpend, autoStars } from '../src/core/auto';
import { gearPower } from '../src/core/autoequip';
import { canRefund, pointsLeft } from '../src/core/constellations';
import { chooseVia } from '../src/core/vie';
import { STAR_BY_ID } from '../src/data/constellations';
import { perkCost, perkLevel } from '../src/core/ascension';
import { upgradePrice } from '../src/core/combat';
import { paragonFree } from '../src/core/endgame';
import { newGame } from '../src/core/state';
import { ascend } from '../src/core/ascension';
import { deserialize } from '../src/core/save';
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

  it('con una Via il Paragon segue il suo ordine e usa tutti e 8 i bonus', () => {
    const s = newGame(0, 1);
    s.vie.main = 'inquisitore';
    s.paragon.level = VIA_PARAGON.inquisitore.length;
    autoParagon(s);
    expect(Object.keys(s.paragon.points)).toHaveLength(8);
    expect(s.paragon.points.elementi).toBe(3);
    for (const order of Object.values(VIA_PARAGON)) expect(new Set(order).size).toBe(8);
  });

  it('le Scintille comprano sempre il potenziamento più economico', () => {
    const s = newGame(0, 1);
    s.ascension.scintille = 1; // costa 1: si compra subito, niente accumulo
    expect(autoPerks(s)).toBe(1);
    expect(s.ascension.scintille).toBe(0);
    s.ascension.scintille = 1e6;
    autoPerks(s);
    const open = PERKS.filter((d) => d.max === undefined || perkLevel(s.ascension, d.id) < d.max);
    expect(s.ascension.scintille).toBeLessThan(Math.min(...open.map((d) => perkCost(s.ascension, d.id))));
    expect(perkLevel(s.ascension, 'secondaVia')).toBe(1);
    expect(s.vie.secondUnlocked).toBe(true);
    expect(perkLevel(s.ascension, 'slot')).toBe(2);
    expect(perkLevel(s.ascension, 'fiamma')).toBeGreaterThan(5);
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
  it("l'oro offline si conta dalle uccisioni: mai negativo anche se le spese automatiche lo usano", async () => {
    const { applyOffline } = await import('../src/core/offline');
    const s = newGame(0, 3);
    s.gold = 0;
    const r = applyOffline(s, 600)!;
    expect(r.gold).toBeGreaterThan(0);
    expect(s.gold).toBeGreaterThanOrEqual(0);
  });

  it("le Stelle si spendono tutte, collegate al centro, e alzano la potenza", () => {
    const s = newGame(0, 1);
    s.hero.level = 40;
    const before = gearPower(s);
    expect(autoStars(s)).toBe(39);
    expect(pointsLeft(s)).toBe(0);
    expect(new Set(s.stars).size).toBe(39);
    // l'albero resta collegato: c'è sempre almeno una foglia restituibile
    expect(s.stars.every((id) => STAR_BY_ID.has(id))).toBe(true);
    expect(s.stars.some((id) => canRefund(s, id))).toBe(true);
    expect(gearPower(s)).toBeGreaterThan(before);
    // deterministico
    const t = newGame(0, 1);
    t.hero.level = 40;
    autoStars(t);
    expect(t.stars).toEqual(s.stars);
    // salendo di livello si aggiunge una stella, le altre restano
    s.hero.level++;
    expect(autoStars(s)).toBe(1);
    expect(s.stars.slice(0, 39)).toEqual(t.stars);
  });

  it('guarda avanti: va verso le notevoli invece di sparpagliarsi', () => {
    const notables = (level: number) => {
      const s = newGame(0, 1);
      s.hero.level = level;
      autoStars(s);
      return s.stars.map((id) => STAR_BY_ID.get(id)!).filter((n) => n.kind === 'notable');
    };
    expect(notables(12).length).toBeGreaterThan(0);
    expect(notables(40).filter((n) => n.rule).length).toBeGreaterThanOrEqual(2);
  });

  it("le Ascensioni (anche dopo la Rinascita) danno punti stella", () => {
    const s = newGame(0, 1);
    s.stage.best = 60;
    for (let i = 0; i < 3; i++) {
      s.stage.best = 60;
      ascend(s);
    }
    expect(s.totals.ascensions).toBe(3);
    expect(pointsLeft(s)).toBe(1);
    expect(deserialize(JSON.stringify({ ...s, version: 22, totals: { ...s.totals, ascensions: undefined } }))!.totals.ascensions).toBe(s.ascension.count);
  });

  it("cambiando Via l'albero si rifà per la nuova Via", () => {
    const s = newGame(0, 1);
    s.hero.level = 60;
    chooseVia(s, 'paladino');
    autoSpend(s);
    expect(s.stars).toContain('paladino-s1');
    chooseVia(s, 'lama');
    expect(s.stars).toEqual([]);
    autoSpend(s);
    expect(pointsLeft(s)).toBe(0);
  });

  it('non prende regole annullate da una già attiva (niente critici ↔ critici che sanguinano)', () => {
    for (const level of [60, 90, 120]) {
      const s = newGame(0, 1);
      s.hero.level = level;
      autoStars(s);
      expect(s.stars.includes('offesa-k') && s.stars.includes('offesa-c1-n')).toBe(false);
      expect(s.stars.includes('offesa-k') && s.stars.includes('difesa-c2-n')).toBe(false);
    }
  });
});
