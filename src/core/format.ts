/** Suffissi fino ai decilioni (1e33), poi notazione esponenziale fino a 1e308. */
const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

/** 999 → "999", 12345 → "12.3K", 1e15 → "1.00Qa"; oltre i decilioni "1.23e40". */
export function formatNum(n: number): string {
  if (!Number.isFinite(n)) return '∞';
  const sign = n < 0 ? '-' : '';
  n = Math.abs(n);
  if (n < 1000) return sign + Math.floor(n).toString();
  const tier = Math.floor(Math.log10(n) / 3);
  if (tier >= SUFFIXES.length) return sign + n.toExponential(2).replace('+', '');
  const scaled = n / Math.pow(1000, tier);
  const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  const text = (Math.floor(scaled * 10 ** digits) / 10 ** digits).toFixed(digits);
  return sign + text + SUFFIXES[tier];
}
