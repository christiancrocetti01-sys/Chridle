import { describe, expect, it } from 'vitest';
import { formatNum } from '../src/core/format';
import { GLYPHS, GLYPH_H, GLYPH_W } from '../src/data/font';

describe('formatNum', () => {
  it.each([
    [0, '0'], [999.9, '999'], [1000, '1.00K'], [12345, '12.3K'], [999_999, '999K'],
    [1.5e6, '1.50M'], [2e12, '2.00T'], [3.2e15, '3.20e15'], [-1500, '-1.50K'],
  ])('%d → %s', (n, s) => expect(formatNum(n)).toBe(s));

  it('ogni carattere prodotto per i numeri ha un glifo', () => {
    for (const n of [0, 123, 4567, 8.9e6, 1e9, 2e12]) {
      for (const ch of formatNum(n)) expect(GLYPHS[ch], ch).toBeDefined();
    }
  });

  it('glifi 3×5', () => {
    for (const g of Object.values(GLYPHS)) {
      expect(g.length).toBe(GLYPH_H);
      for (const row of g) expect(row.length).toBe(GLYPH_W);
    }
  });
});
