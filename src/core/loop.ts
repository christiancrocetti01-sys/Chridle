/** Logica a passo fisso: il rendering può andare a qualsiasi fps, la simulazione no. */
export const TICK_RATE = 10;
export const TICK_MS = 1000 / TICK_RATE;
/** Oltre questo numero di tick per frame si scarta il resto (tab in background, lag). */
export const MAX_TICKS_PER_FRAME = 50;

export interface AccumulatorStep {
  /** Quanti tick di logica eseguire in questo frame. */
  ticks: number;
  /** Tempo residuo da portare al frame successivo (ms). */
  acc: number;
  /** Frazione [0,1) tra l'ultimo tick e il prossimo, per interpolare il rendering. */
  alpha: number;
}

export function stepAccumulator(
  acc: number,
  dtMs: number,
  tickMs = TICK_MS,
  maxTicks = MAX_TICKS_PER_FRAME,
): AccumulatorStep {
  let total = acc + Math.max(0, dtMs);
  let ticks = Math.floor(total / tickMs);
  if (ticks > maxTicks) {
    ticks = maxTicks;
    total = ticks * tickMs;
  }
  const rest = total - ticks * tickMs;
  return { ticks, acc: rest, alpha: rest / tickMs };
}
