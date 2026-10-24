import type { SlotId } from '../data/items';

/** Slot a sinistra e a destra della sagoma, dall'alto in basso. */
export const DOLL_LEFT: SlotId[] = ['elmo', 'amuleto', 'mantello', 'armatura', 'cintura', 'stivali'];
export const DOLL_RIGHT: SlotId[] = ['arma', 'secondaria', 'guanti', 'anello1', 'anello2', 'reliquia'];

/** Sagoma del guerriero: volutamente sobria, la parte importante sono gli slot attorno. */
export const SILHOUETTE = `
<svg class="silhouette" viewBox="0 0 100 200" aria-hidden="true">
  <path class="cape" d="M31 46 L14 172 L50 162 L86 172 L69 46 Z"/>
  <g class="body">
    <path d="M37 24 a13 14 0 0 1 26 0 v6 q0 9 -13 11 q-13 -2 -13 -11 Z"/>
    <path d="M30 46 Q50 38 70 46 L76 60 L71 100 L29 100 L24 60 Z"/>
    <path d="M24 50 L14 90 L17 112 L24 111 L26 92 L33 66 Z"/>
    <path d="M76 50 L86 90 L83 112 L76 111 L74 92 L67 66 Z"/>
    <path d="M34 106 L32 150 L30 188 L46 188 L48 150 L50 112 Z"/>
    <path d="M66 106 L68 150 L70 188 L54 188 L52 150 L50 112 Z"/>
  </g>
  <rect class="belt" x="29" y="100" width="42" height="7"/>
  <path class="visor" d="M41 25 h18"/>
  <g class="sword">
    <rect x="83" y="42" width="3" height="72"/>
    <rect x="77" y="104" width="15" height="3"/>
    <rect x="83" y="107" width="3" height="10"/>
  </g>
</svg>`;
