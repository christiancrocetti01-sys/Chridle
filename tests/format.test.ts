import { describe, expect, it } from 'vitest';
import { formatNum } from '../src/core/format';

describe('formatNum', () => {
  it.each([
    [0, '0'], [999.9, '999'], [1000, '1.00K'], [12345, '12.3K'], [999_999, '999K'],
    [1.5e6, '1.50M'], [2e12, '2.00T'], [3.2e15, '3.20e15'], [-1500, '-1.50K'],
  ])('%d → %s', (n, s) => expect(formatNum(n)).toBe(s));

});
