import type { DamageType } from '../data/enemies';
import type { ItemType } from '../data/items';
import { itemArt } from './art';

/** Icona di un oggetto in linea di luce, colorata con la rarità (currentColor); il bagliore cresce con la rarità. */
export const itemIcon = (type: ItemType, rarity = 0) => itemArt(type, rarity);

/** Nome di un elemento nel suo colore (il fisico resta bianco). */
export const elem = (type: DamageType, text: string) => (type === 'physical' ? text : `<span class="el-${type}">${text}</span>`);
