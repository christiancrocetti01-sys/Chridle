import { describe, expect, it } from 'vitest';
import { step, type CombatEvent } from '../src/core/combat';
import { achievementId, achievementName, checkAchievements, trackSteps } from '../src/core/achievements';
import { ascend } from '../src/core/ascension';
import { applyOffline } from '../src/core/offline';
import { deserialize, serialize } from '../src/core/save';
import { STATE_VERSION, newGame, type GameState } from '../src/core/state';
import { stateStats } from '../src/core/stats';
import { TRACKS } from '../src/data/achievements';

describe('Imprese', () => {
  it('gradini crescenti e id unici', () => {
    for (const t of TRACKS) expect([...t.steps].sort((a, b) => a - b)).toEqual(t.steps);
    expect(new Set(TRACKS.map((t) => t.id)).size).toBe(TRACKS.length);
    expect(achievementName(achievementId('uccisioni', 2))).toBe('Sterminatore III');
  });

  it('si completano una volta sola, tutti i gradini raggiunti insieme', () => {
    const s = newGame(0, 1);
    s.totals.kills = 1_000;
    expect(checkAchievements(s)).toEqual(['uccisioni:0', 'uccisioni:1']);
    expect(checkAchievements(s)).toEqual([]);
  });

  it('il bonus entra nelle statistiche', () => {
    const s = newGame(0, 1);
    const before = stateStats(s).atk;
    s.achievements = ['uccisioni:0', 'uccisioni:1'];
    expect(stateStats(s).atk).toBeCloseTo(before * (1 + 2 * TRACKS[0].bonus[0][1]));
  });

  it('il combattimento le controlla e manda un evento', () => {
    const s = newGame(0, 2);
    const ev: CombatEvent[] = [];
    for (let i = 0; i < 6000; i++) step(s, ev);
    expect(trackSteps(s.achievements, 'uccisioni')).toBeGreaterThan(0);
    expect(ev.some((e) => e.type === 'achievement' && e.id === 'uccisioni:0')).toBe(true);
  });

  it("restano dopo l'Ascensione anche se il contatore riparte", () => {
    const s = newGame(0, 1);
    s.stage.best = 50;
    checkAchievements(s);
    const n = trackSteps(s.achievements, 'stage');
    ascend(s);
    checkAchievements(s);
    expect(trackSteps(s.achievements, 'stage')).toBe(n);
    expect(trackSteps(s.achievements, 'ascensioni')).toBe(1);
  });

  it('offline le controlla', () => {
    const s = newGame(0, 3);
    for (let i = 0; i < 300; i++) step(s);
    applyOffline(s, 8 * 3600);
    expect(trackSteps(s.achievements, 'uccisioni')).toBeGreaterThan(0);
  });

  it('migra da v17 dando subito quelle già raggiunte', () => {
    const s = newGame(0, 2);
    s.totals.kills = 150;
    const { achievements: _, ...old } = s;
    const back = deserialize(serialize({ ...old, version: 17 } as GameState))!;
    expect(back.version).toBe(STATE_VERSION);
    expect(back.achievements).toEqual(['uccisioni:0']);
  });
});
