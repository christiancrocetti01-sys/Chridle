import { describe, expect, it } from 'vitest';
import { step } from '../src/core/combat';
import { codexTier, familyMult, newCodex } from '../src/core/codex';
import { applyOffline } from '../src/core/offline';
import { ascend } from '../src/core/ascension';
import { deserialize, serialize } from '../src/core/save';
import { STATE_VERSION, newGame, type GameState } from '../src/core/state';
import { stateStats } from '../src/core/stats';
import { damageMult } from '../src/core/triggers';
import { spawnEnemy } from '../src/core/enemies';
import { CODEX_DMG, CODEX_TIERS } from '../src/data/codex';
import { FAMILIES, zoneOf } from '../src/data/enemies';

describe('Codex/Bestiario', () => {
  it('gradi alle soglie di uccisioni', () => {
    expect(codexTier(0)).toBe(0);
    expect(codexTier(CODEX_TIERS[0] - 1)).toBe(0);
    expect(codexTier(CODEX_TIERS[0])).toBe(1);
    expect(codexTier(CODEX_TIERS[CODEX_TIERS.length - 1] * 10)).toBe(CODEX_TIERS.length);
  });

  it('ogni uccisione conta per la famiglia del nemico', () => {
    const s = newGame(0, 1);
    for (let i = 0; i < 3000; i++) step(s);
    const total = Object.values(s.codex).reduce((a, b) => a + b, 0);
    expect(total).toBe(s.totals.kills);
    expect(s.codex[zoneOf(1).zone.family]).toBeGreaterThan(0);
  });

  it('il grado dà danno in più solo contro quella famiglia', () => {
    const s = newGame(0, 1);
    const e = spawnEnemy(s);
    const other = (Object.keys(FAMILIES) as (keyof typeof FAMILIES)[]).find((f) => f !== e.family)!;
    const before = damageMult(stateStats(s), e);
    s.codex[e.family] = CODEX_TIERS[1];
    expect(damageMult(stateStats(s), e)).toBeCloseTo(before * (1 + 2 * CODEX_DMG));
    expect(familyMult(s.codex)[other]).toBe(1);
  });

  it("resta dopo l'Ascensione", () => {
    const s = newGame(0, 1);
    s.codex.bestie = 500;
    s.stage.best = 40;
    ascend(s);
    expect(s.codex.bestie).toBe(500);
  });

  it('offline conta le uccisioni per famiglia', () => {
    const s = newGame(0, 3);
    for (let i = 0; i < 2000; i++) step(s);
    const before = { ...s.codex };
    const r = applyOffline(s, 3600)!;
    const gained = Object.keys(s.codex).reduce((sum, f) => sum + s.codex[f as keyof typeof s.codex] - before[f as keyof typeof before], 0);
    expect(gained).toBeGreaterThan(0);
    expect(gained).toBeLessThanOrEqual(r.kills);
  });

  it('migra da v15 con il Codex vuoto', () => {
    const s = newGame(0, 2);
    const { codex: _, ...old } = s;
    const back = deserialize(serialize({ ...old, version: 15 } as GameState))!;
    expect(back.version).toBe(STATE_VERSION);
    expect(back.codex).toEqual(newCodex());
  });
});
