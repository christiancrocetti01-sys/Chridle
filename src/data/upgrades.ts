export type UpgradeId = 'forza' | 'corazza' | 'rapidita';

export interface Upgrade {
  id: UpgradeId;
  name: string;
  description: string;
  baseCost: number;
  costGrowth: number;
}

export const UPGRADES: Upgrade[] = [
  { id: 'forza', name: 'Forza della Luce', description: '+10% attacco', baseCost: 10, costGrowth: 1.15 },
  { id: 'corazza', name: 'Corazza Consacrata', description: '+10% vita e difesa', baseCost: 15, costGrowth: 1.17 },
  { id: 'rapidita', name: "Passo dell'Alba", description: '+4% velocità d\'attacco', baseCost: 40, costGrowth: 1.3 },
];
