import { describe, expect, it } from 'vitest';
import { stepAccumulator } from '../src/core/loop';

describe('stepAccumulator', () => {
  it('a 60 fps esegue un tick ogni ~6 frame e accumula il resto', () => {
    let acc = 0;
    let ticks = 0;
    for (let i = 0; i < 60; i++) {
      const r = stepAccumulator(acc, 1000 / 60, 100);
      acc = r.acc;
      ticks += r.ticks;
    }
    expect(ticks).toBe(10);
  });

  it('alpha è la frazione verso il prossimo tick', () => {
    const r = stepAccumulator(0, 250, 100);
    expect(r.ticks).toBe(2);
    expect(r.alpha).toBeCloseTo(0.5);
  });

  it('limita i tick per frame e scarta il resto', () => {
    const r = stepAccumulator(0, 60_000, 100, 50);
    expect(r.ticks).toBe(50);
    expect(r.acc).toBe(0);
  });

  it('ignora delta negativi', () => {
    expect(stepAccumulator(30, -100, 100)).toEqual({ ticks: 0, acc: 30, alpha: 0.3 });
  });
});
