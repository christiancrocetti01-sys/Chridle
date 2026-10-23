import { describe, expect, it } from 'vitest';
import { GHOUL, HERO, breathFrame, validateSprite } from '../src/data/sprites';
import { pixelPerfectSize } from '../src/render/scale';

describe('sprite', () => {
  it.each([['HERO', HERO], ['GHOUL', GHOUL]])('%s è ben formato', (_, sprite) => {
    expect(validateSprite(sprite)).toEqual([]);
  });

  it('il frame di respiro mantiene le dimensioni', () => {
    const f = breathFrame(HERO, 13);
    expect(f.rows.length).toBe(HERO.rows.length);
    expect(validateSprite(f)).toEqual([]);
  });
});

describe('pixelPerfectSize', () => {
  it('telefono 390px css, dpr 3 → scala ×3 in pixel fisici', () => {
    expect(pixelPerfectSize(390, 220, 3, 320, 180)).toEqual({ scale: 3, cssWidth: 320, cssHeight: 180 });
  });

  it('mai sotto ×1', () => {
    expect(pixelPerfectSize(100, 50, 1, 320, 180).scale).toBe(1);
  });
});
