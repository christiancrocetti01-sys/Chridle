/** Modalità oltre la Campagna: Dungeon, Torre dell'Alba, Raid (GDD §10). */

// ── Dungeon: run con chiave e modificatori casuali, boss finale ──
export const DUNGEON_WAVES = 8;
export const DUNGEON_MODS_COUNT = 2;
export type DungeonModId = 'orda' | 'furia' | 'tenebra' | 'rapidi' | 'corazzati' | 'elite';
export interface DungeonMod {
  id: DungeonModId;
  name: string;
  text: string;
  /** Bonus alle ricompense finali. */
  reward: number;
}
export const DUNGEON_MODS: DungeonMod[] = [
  { id: 'orda', name: 'Orda', text: 'nemici con +50% vita', reward: 0.25 },
  { id: 'furia', name: 'Furia', text: 'nemici con +40% attacco', reward: 0.25 },
  { id: 'tenebra', name: 'Tenebra', text: 'niente rigenerazione', reward: 0.2 },
  { id: 'rapidi', name: 'Frenesia', text: 'nemici +30% più veloci', reward: 0.2 },
  { id: 'corazzati', name: 'Bastioni', text: 'nemici con difesa ×2', reward: 0.2 },
  { id: 'elite', name: 'Prescelti', text: 'tutti i nemici sono élite', reward: 0.4 },
];
/** Ricompense del boss del dungeon (prima dei modificatori): Frammenti e Essenza per livello del dungeon. */
export const DUNGEON_FRAGMENTS = 8;
export const DUNGEON_ESSENCE = 4;
/** Il dungeon è al livello dello stage record meno questo scarto. */
export const DUNGEON_LEVEL_OFFSET = 3;

// ── Torre dell'Alba: piani infiniti, record personale, bonus permanenti ai traguardi ──
export const TOWER_SECONDS = 30;
/** Il piano f ha il nemico dello stage TOWER_BASE + f × TOWER_STEP, con vita moltiplicata. */
export const TOWER_BASE = 3;
export const TOWER_STEP = 2;
export const TOWER_HP = 4;
export const TOWER_ATK = 1.3;
/** Ogni TOWER_MILESTONE piani di record: +x% attacco e vita per sempre. */
export const TOWER_MILESTONE = 5;
export const TOWER_BONUS = 0.03;
/** Ogni TOWER_KEY_EVERY piani di record: una chiave. */
export const TOWER_KEY_EVERY = 10;
/** Essenza per piano superato (× numero del piano). */
export const TOWER_ESSENCE = 2;

// ── Raid: boss enorme in 3 fasi con timer ──
export const RAID_STAGE = 50;
export const RAID_KEYS = 3;
export const RAID_SECONDS = 120;
export const RAID_HP = 40;
export const RAID_ATK = 2;
/** Soglie di vita delle fasi 2 e 3. */
export const RAID_PHASES = [0.66, 0.33];
/** Rarità minima garantita del bottino (Leggendario) e probabilità di salire a Mitico e Divino. */
export const RAID_MIN_RARITY = 4;
export const RAID_MYTHIC = 0.15;
export const RAID_DIVINE = 0.02;
export const RAID_BOSSES = ['Colosso dell’Eclissi', 'Drago d’Ossidiana', 'Madre del Vuoto', 'Titano Incatenato'];
