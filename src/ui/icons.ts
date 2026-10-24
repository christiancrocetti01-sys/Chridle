import type { ItemType } from '../data/items';

/** Icone minimali degli oggetti: tratti SVG 24×24 colorati con la rarità (currentColor). */
const PATHS: Record<ItemType, string> = {
  arma: 'M19 3l-9 9M14 3h5v5M7 13l4 4M5 19l3-3M4 16l4 4',
  secondaria: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z',
  elmo: 'M5 14a7 7 0 0114 0v5H5zM9 14h6M12 7V4',
  armatura: 'M8 4l4 2 4-2 4 4-3 3v9H7v-9L4 8z',
  guanti: 'M7 21v-8l-2-4 2-1 2 3V5h2v6V4h2v7V5h2v8l2-2 1 1-3 5v4z',
  stivali: 'M8 3h5v10l6 3v4H6v-4l2-2z',
  cintura: 'M3 10h18v4H3zM10 9h4v6h-4z',
  mantello: 'M8 3h8l3 18-7-3-7 3z',
  anello: 'M12 9a6 6 0 110 12 6 6 0 010-12zM10 3h4l1 3-3 3-3-3z',
  amuleto: 'M7 3l5 8 5-8M12 11a5 5 0 110 10 5 5 0 010-10z',
  reliquia: 'M12 2v20M7 7h10M9 22h6M8 12l4 3 4-3',
};

export const itemIcon = (type: ItemType) =>
  `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${PATHS[type]}"/></svg>`;
