import type { Layer, Subject } from './subjects';

/** Colori della xilografia: carta antica, inchiostro, oro. */
const PAPER = '#efe6cf';
const INK = '#15110c';
const GOLD = '#d4a63c';

const ROMAN: [number, string][] = [[100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
export function roman(n: number): string {
  let out = '';
  for (const [v, s] of ROMAN) while (n >= v) { out += s; n -= v; }
  return out;
}

const rays = Array.from({ length: 36 }, (_, i) => {
  const a = (i / 36) * Math.PI * 2;
  return `<path d="M50 50L${(50 + 75 * Math.cos(a)).toFixed(1)} ${(50 + 75 * Math.sin(a)).toFixed(1)}" stroke-width="${i % 2 ? 0.7 : 0.3}"/>`;
}).join('');

/** Definizioni comuni (tratteggi, carta col sole), messe una volta sola nella pagina. */
export function ensureArtDefs() {
  if (document.getElementById('art-defs')) return;
  const div = document.createElement('div');
  div.innerHTML = `<svg id="art-defs" width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <pattern id="art-h1" width="2.6" height="2.6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="2.6" stroke="${INK}" stroke-width="0.9"/></pattern>
    <radialGradient id="art-vig" r="0.75"><stop offset="0.55" stop-color="${INK}" stop-opacity="0"/><stop offset="1" stop-color="${INK}" stop-opacity="0.45"/></radialGradient>
    <symbol id="art-paper" viewBox="0 0 100 100"><rect width="100" height="100" fill="${PAPER}"/>
      <g stroke="${INK}" opacity="0.28">${rays}</g><circle cx="50" cy="50" r="30" fill="${PAPER}" opacity="0.8"/><rect width="100" height="100" fill="url(#art-vig)"/></symbol>
  </defs></svg>`;
  document.body.prepend(div.firstElementChild!);
}

/** Uno strato in xilografia: carta, tratteggio, inchiostro, oro. */
function woodLayer([kind, d]: Layer): string {
  switch (kind) {
    case 'fill': return `<path d="${d}" fill="${PAPER}" stroke="${INK}" stroke-width="1.6"/>`;
    case 'shade': return `<path d="${d}" fill="url(#art-h1)"/>`;
    case 'ink': return `<path d="${d}" fill="${INK}"/>`;
    case 'line': return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="1"/>`;
    case 'gold': return `<path d="${d}" fill="${GOLD}" stroke="${INK}" stroke-width="1.1"/>`;
    case 'eye': return `<path d="${d}" fill="${GOLD}"/>`;
  }
}

/** Uno strato in linea di luce: solo contorni, gli occhi pieni. Il colore è currentColor. */
function lightLayer([kind, d]: Layer): string {
  switch (kind) {
    case 'shade': return '';
    case 'line': return `<path d="${d}" stroke-width="2.4" opacity="0.65"/>`;
    case 'eye': return `<path d="${d}" fill="currentColor" stroke="none"/>`;
    default: return `<path d="${d}"/>`;
  }
}

const woodcut = (s: Subject) => `<g fill-rule="evenodd" stroke-linejoin="round" stroke-linecap="round">${s.map(woodLayer).join('')}</g>`;

/**
 * Icona in linea di luce (oggetti, eroe): tratto del colore corrente, bagliore che cresce con la rarità.
 * `glow` 0-6 (indice di rarità); la classe `lic gN` regola l'alone in CSS.
 */
export const lightIcon = (s: Subject, glow = 0, cls = 'icon') =>
  `<svg class="${cls} lic g${glow}" viewBox="0 0 100 100" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round" stroke-linecap="round" fill-rule="evenodd">${s.map(lightLayer).join('')}</g></svg>`;

export interface CardOpts {
  subject: Subject;
  /** Nome sotto l'illustrazione (assente nelle carte piccole). */
  title?: string;
  /** Numero romano in alto. */
  num?: number;
  /** Colore della cornice (oro di default; rarità per i leggendari). */
  frame?: string;
  /** Segno dell'élite nell'angolo. */
  mark?: boolean;
}

/** Carta-tarocco: cornice scura, numero romano, xilografia su carta col sole, nome. */
export function card({ subject, title, num, frame = GOLD, mark }: CardOpts): string {
  const h = title ? 140 : 112;
  const top = num ? 18 : 8;
  const name = title ? title.toUpperCase() : '';
  const fit = name.length > 15 ? ` textLength="84" lengthAdjust="spacingAndGlyphs"` : '';
  return `<svg class="tarot" viewBox="0 0 100 ${h}" role="img"${title ? ` aria-label="${title}"` : ''}>
    <rect x="1" y="1" width="98" height="${h - 2}" rx="5" fill="#0d0b08" stroke="${frame}" stroke-width="1.6"/>
    <rect x="4.5" y="4.5" width="91" height="${h - 9}" rx="3" fill="none" stroke="${frame}" stroke-width="0.5"/>
    ${num ? `<text x="50" y="14" text-anchor="middle" font-family="Cinzel, serif" font-size="9" fill="${frame}">${roman(num)}</text>` : ''}
    <svg x="8" y="${top}" width="84" height="84" viewBox="0 0 100 100"><use href="#art-paper"/>${woodcut(subject)}</svg>
    <rect x="8" y="${top}" width="84" height="84" fill="none" stroke="${frame}" stroke-width="1"/>
    ${mark ? `<path d="M85 ${top + 4}l2 4.5 4.5 2-4.5 2-2 4.5-2-4.5-4.5-2 4.5-2z" fill="${frame}" stroke="${INK}" stroke-width="0.6"/>` : ''}
    ${title ? `<path d="M8 113H92" stroke="${frame}" stroke-width="0.5"/>
    <text x="50" y="125" text-anchor="middle" font-family="Cinzel, serif" font-size="7.5" letter-spacing="0.8" fill="#efe6cf"${fit}>${name}</text>
    <path d="M36 132h28" stroke="${frame}" stroke-width="0.5"/><circle cx="50" cy="132" r="1.4" fill="${frame}"/>` : ''}
  </svg>`;
}

/** Dorso della carta, per ciò che non è ancora stato scoperto. */
export function cardBack(title = '???'): string {
  return `<svg class="tarot back" viewBox="0 0 100 140" role="img" aria-label="${title}">
    <rect x="1" y="1" width="98" height="138" rx="5" fill="#0d0b08" stroke="#474747" stroke-width="1.6"/>
    <rect x="4.5" y="4.5" width="91" height="131" rx="3" fill="none" stroke="#474747" stroke-width="0.5"/>
    <g fill="none" stroke="#474747" stroke-width="0.8"><circle cx="50" cy="62" r="22"/><circle cx="55" cy="60" r="18" fill="#0d0b08"/>
    <path d="M50 30V36M50 88V94M18 62H24M76 62H82"/></g>
    <text x="50" y="125" text-anchor="middle" font-family="Cinzel, serif" font-size="8" fill="#6a6a6a">${title}</text></svg>`;
}
