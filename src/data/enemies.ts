export interface EnemyTemplate {
  id: string;
  name: string;
  family: 'nonmorti' | 'demoni' | 'bestie' | 'culto' | 'vuoto';
  /** Moltiplicatori rispetto al nemico base dello stage. */
  hp: number;
  atk: number;
  attackSpeed: number;
}

export const ENEMIES: EnemyTemplate[] = [
  { id: 'ghoul', name: 'Ghoul', family: 'nonmorti', hp: 1, atk: 1, attackSpeed: 0.8 },
];

export const BOSSES: EnemyTemplate[] = [
  { id: 'araldo', name: "Araldo dell'Eclissi", family: 'culto', hp: 6, atk: 1.6, attackSpeed: 0.7 },
];
