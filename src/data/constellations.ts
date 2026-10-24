import type { StatKey } from './items';
import type { RuleId } from './uniques';

/**
 * Costellazioni: albero passivo generato da questi dati. Gli id dei nodi vanno nel salvataggio,
 * quindi le espansioni aggiungono rami/ammassi in coda senza rinominare quelli esistenti.
 */
export type StarKind = 'start' | 'small' | 'notable' | 'keystone';
type Mods = [StatKey, number][];

export interface StarNode {
  id: string;
  kind: StarKind;
  name: string;
  x: number;
  y: number;
  mods: Mods;
  rule?: RuleId;
  links: string[];
}

interface ClusterDef {
  name: string;
  /** Statistiche dei 6 nodi piccoli dell'anello (si alternano). */
  small: Mods[];
  notable: { name: string; mods: Mods; rule?: RuleId };
}

interface BranchDef {
  id: string;
  name: string;
  /** Direzione del ramo in gradi (0 = destra, -90 = su). */
  angle: number;
  /** Statistiche dei nodi della spina dorsale (si alternano). */
  spine: Mods[];
  /** 4 ammassi lungo la spina, alternati a sinistra e a destra. */
  clusters: ClusterDef[];
  keystone: { name: string; rule: RuleId };
}

interface BridgeDef {
  from: string;
  to: string;
  name: string;
  mods: Mods;
}

export const BRANCHES: BranchDef[] = [
  {
    id: 'offesa', name: 'Offesa', angle: -90,
    spine: [[['atkPct', 0.04]], [['crit', 0.01]], [['critDmg', 0.06]], [['speedPct', 0.02]]],
    clusters: [
      { name: 'Brace', small: [[['firePct', 0.06]], [['fuocoSkill', 0.05]]],
        notable: { name: 'Cuore di Brace', mods: [['firePct', 0.15], ['fuocoSkill', 0.15]] } },
      { name: 'Lama nel Buio', small: [[['crit', 0.01]], [['critDmg', 0.08]]],
        notable: { name: 'Ferita Profonda', mods: [['crit', 0.02]], rule: 'critBleed' } },
      { name: 'Tempesta', small: [[['lightningPct', 0.06]], [['fulmineSkill', 0.05]]],
        notable: { name: 'Cielo in Tempesta', mods: [['lightningPct', 0.15], ['fulmineSkill', 0.15]] } },
      { name: 'Boia', small: [[['atkPct', 0.04]], [['bossDmg', 0.05]]],
        notable: { name: 'Sentenza', mods: [['bossDmg', 0.1]], rule: 'execute' } },
    ],
    keystone: { name: 'Colpo Assoluto', rule: 'noCrit' },
  },
  {
    id: 'difesa', name: 'Difesa', angle: 30,
    spine: [[['hpPct', 0.04]], [['defPct', 0.04]], [['regenPct', 0.002]], [['dodge', 0.01]]],
    clusters: [
      { name: 'Roccia', small: [[['hpPct', 0.05]], [['regenPct', 0.002]]],
        notable: { name: 'Cuore di Pietra', mods: [['hpPct', 0.12], ['regenPct', 0.003]] } },
      { name: 'Baluardo', small: [[['defPct', 0.05]], [['scudoSkill', 0.06]]],
        notable: { name: 'Muro di Luce', mods: [['defPct', 0.12], ['scudoSkill', 0.2]] } },
      { name: 'Ombra Danzante', small: [[['dodge', 0.01]], [['speedPct', 0.02]]],
        notable: { name: "Passo d'Ombra", mods: [['dodge', 0.02]], rule: 'dodgeCrit' } },
      { name: 'Sangue', small: [[['lifeSteal', 0.003]], [['hpPct', 0.03]]],
        notable: { name: 'Furia del Ferito', mods: [['lifeSteal', 0.005]], rule: 'frenzy' } },
    ],
    keystone: { name: 'Martirio', rule: 'overhealHoly' },
  },
  {
    id: 'luce', name: 'Luce', angle: 150,
    spine: [[['holyPct', 0.05]], [['elemPct', 0.03]], [['magicFind', 0.05]], [['xpPct', 0.04]]],
    clusters: [
      { name: 'Salmo', small: [[['sacroSkill', 0.06]], [['holyPct', 0.06]]],
        notable: { name: 'Litania', mods: [['sacroSkill', 0.15], ['sacroCdr', 0.1]] } },
      { name: 'Fonte', small: [[['curaSkill', 0.06]], [['regenPct', 0.002]]],
        notable: { name: 'Mani Guaritrici', mods: [['curaSkill', 0.1]], rule: 'overhealShield' } },
      { name: 'Clessidra', small: [[['tempoSkill', 0.06]], [['tempoCdr', 0.03]]],
        notable: { name: 'Veleno Eterno', mods: [['tempoSkill', 0.1]], rule: 'endlessPoison' } },
      { name: 'Ritmo', small: [[['velocitaSkill', 0.06]], [['velocitaCdr', 0.03]]],
        notable: { name: 'Danza della Luce', mods: [['velocitaSkill', 0.1]], rule: 'hasteStacks' } },
    ],
    keystone: { name: 'Luce Perpetua', rule: 'freeSkills' },
  },
];

/** Ponti tra le punte dei rami: statistiche ibride. */
export const BRIDGES: BridgeDef[] = [
  { from: 'offesa', to: 'difesa', name: 'Crociato', mods: [['atkPct', 0.02], ['hpPct', 0.02]] },
  { from: 'difesa', to: 'luce', name: 'Paladino', mods: [['hpPct', 0.02], ['holyPct', 0.03]] },
  { from: 'luce', to: 'offesa', name: 'Arcano', mods: [['crit', 0.005], ['elemPct', 0.02]] },
];

interface ViaRegionDef {
  /** Id della Via (anche prefisso degli id dei nodi). */
  id: string;
  name: string;
  /** Nodo dei ponti da cui parte la regione, verso l'esterno. */
  attach: string;
  spine: Mods[];
  /** 2 ammassi, a sinistra e a destra della spina. */
  clusters: ClusterDef[];
  keystone: { name: string; rule: RuleId };
}

/** Lotto 2: regioni delle Vie, fuori dall'anello dei ponti (aperte a tutti, a tema con la Via). */
export const VIA_REGIONS: ViaRegionDef[] = [
  {
    id: 'paladino', name: 'Paladino del Sole', attach: 'ponte-offesa-5',
    spine: [[['defPct', 0.05]], [['hpPct', 0.04]], [['holyPct', 0.05]]],
    clusters: [
      { name: 'Scudo del Sole', small: [[['defPct', 0.05]], [['scudoSkill', 0.06]]],
        notable: { name: 'Bastione Solare', mods: [['defPct', 0.15], ['scudoSkill', 0.15]] } },
      { name: 'Aura Consacrata', small: [[['holyPct', 0.06]], [['hpPct', 0.04]]],
        notable: { name: 'Aura del Sole', mods: [['hpPct', 0.1], ['holyPct', 0.15], ['purity', 15]] } },
    ],
    keystone: { name: 'Giuramento', rule: 'oath' },
  },
  {
    id: 'lama', name: "Lama dell'Alba", attach: 'ponte-offesa-2',
    spine: [[['speedPct', 0.02]], [['crit', 0.01]], [['critDmg', 0.06]]],
    clusters: [
      { name: "Filo dell'Alba", small: [[['crit', 0.01]], [['critDmg', 0.08]]],
        notable: { name: "Filo dell'Alba", mods: [['crit', 0.03], ['critDmg', 0.2]] } },
      { name: "Vento d'Acciaio", small: [[['speedPct', 0.03]], [['velocitaSkill', 0.06]]],
        notable: { name: "Vento d'Acciaio", mods: [['speedPct', 0.08], ['velocitaSkill', 0.15]] } },
    ],
    keystone: { name: 'Mille Soli', rule: 'twinStrike' },
  },
  {
    id: 'inquisitore', name: 'Inquisitore', attach: 'ponte-luce-5',
    spine: [[['firePct', 0.05]], [['tempoSkill', 0.05]], [['fire', 1]]],
    clusters: [
      { name: 'Fuoco Purificatore', small: [[['firePct', 0.06]], [['fuocoSkill', 0.06]]],
        notable: { name: 'Fuoco Purificatore', mods: [['firePct', 0.2], ['fuocoSkill', 0.15], ['purity', 10]] } },
      { name: 'Cenere', small: [[['tempoSkill', 0.06]], [['tempoCdr', 0.03]]],
        notable: { name: 'Cenere e Penitenza', mods: [['tempoSkill', 0.2], ['tempoCdr', 0.08]] } },
    ],
    keystone: { name: 'Rogo Eterno', rule: 'dotDouble' },
  },
  {
    id: 'custode', name: 'Custode Stellare', attach: 'ponte-difesa-5',
    spine: [[['lightningPct', 0.05]], [['holyPct', 0.05]], [['sacroCdr', 0.02]]],
    clusters: [
      { name: 'Firmamento', small: [[['lightningPct', 0.06]], [['fulmineSkill', 0.06]]],
        notable: { name: 'Firmamento', mods: [['lightningPct', 0.2], ['fulmineSkill', 0.15]] } },
      { name: 'Luce Guida', small: [[['curaSkill', 0.06]], [['sacroCdr', 0.03]]],
        notable: { name: 'Luce Guida', mods: [['curaSkill', 0.15], ['sacroCdr', 0.08]] } },
    ],
    keystone: { name: 'Costellazione Vivente', rule: 'spiritHost' },
  },
  {
    id: 'eclissiarca', name: 'Eclissiarca', attach: 'ponte-luce-2',
    spine: [[['shadowPct', 0.06]], [['atkPct', 0.04]], [['shadow', 1]]],
    clusters: [
      { name: 'Patto Oscuro', small: [[['shadowPct', 0.06]], [['ombraSkill', 0.06]]],
        notable: { name: 'Patto Oscuro', mods: [['shadowPct', 0.25], ['ombraSkill', 0.15], ['corruption', 15]] } },
      { name: 'Fame del Vuoto', small: [[['lifeSteal', 0.003]], [['atkPct', 0.04]]],
        notable: { name: 'Fame del Vuoto', mods: [['lifeSteal', 0.008], ['atkPct', 0.1], ['corruption', 10]] } },
    ],
    keystone: { name: 'Sangue Nero', rule: 'blackBlood' },
  },
];

export const START_ID = 'centro';
const SPINE = 14;
const STEP = 60;
/** Posizioni lungo la spina dove si attaccano gli ammassi. */
const CLUSTER_AT = [2, 5, 8, 11];
const CLUSTER_OFFSET = 130;
const RING = 6;
const RING_R = 50;
const BRIDGE_NODES = 6;
const VIA_SPINE = 6;
const VIA_CLUSTER_AT = [2, 5];

const r2 = (v: number) => Math.round(v * 10) / 10;

/** Costruisce l'albero (posizioni e collegamenti) dai dati. Deterministico. */
export function buildConstellations(): StarNode[] {
  const nodes = new Map<string, StarNode>();
  /** Due anelli + notevole attorno a un punto della spina (lato sgn = ±1). */
  const cluster = (prefix: string, c: ClusterDef, spineId: string, side: number[], sgn: number) => {
    const spine = nodes.get(spineId)!;
    const cx = spine.x + side[0] * CLUSTER_OFFSET * sgn;
    const cy = spine.y + side[1] * CLUSTER_OFFSET * sgn;
    // anello: il nodo 0 guarda verso la spina, il nodo opposto porta al notevole al centro
    const base = Math.atan2(spine.y - cy, spine.x - cx);
    for (let k = 0; k < RING; k++) {
      const t = base + (2 * Math.PI * k) / RING;
      add({ id: `${prefix}-${k}`, kind: 'small', name: c.name, mods: c.small[k % c.small.length] },
        cx + Math.cos(t) * RING_R, cy + Math.sin(t) * RING_R);
      if (k) link(`${prefix}-${k - 1}`, `${prefix}-${k}`);
    }
    link(`${prefix}-${RING - 1}`, `${prefix}-0`);
    link(spine.id, `${prefix}-0`);
    add({ id: `${prefix}-n`, kind: 'notable', name: c.notable.name, mods: c.notable.mods, rule: c.notable.rule }, cx, cy);
    link(`${prefix}-${RING / 2}`, `${prefix}-n`);
  };
  const add = (n: Omit<StarNode, 'links' | 'x' | 'y'>, x: number, y: number) =>
    nodes.set(n.id, { ...n, x: r2(x), y: r2(y), links: [] });
  const link = (a: string, b: string) => {
    nodes.get(a)!.links.push(b);
    nodes.get(b)!.links.push(a);
  };
  add({ id: START_ID, kind: 'start', name: 'Scintilla', mods: [] }, 0, 0);

  for (const b of BRANCHES) {
    const a = (b.angle * Math.PI) / 180;
    const dir = [Math.cos(a), Math.sin(a)];
    const side = [-dir[1], dir[0]];
    let prev = START_ID;
    for (let i = 1; i <= SPINE; i++) {
      const id = `${b.id}-s${i}`;
      add({ id, kind: 'small', name: b.name, mods: b.spine[(i - 1) % b.spine.length] }, dir[0] * STEP * i, dir[1] * STEP * i);
      link(prev, id);
      prev = id;
    }
    const tip = nodes.get(prev)!;
    add({ id: `${b.id}-k`, kind: 'keystone', name: b.keystone.name, mods: [], rule: b.keystone.rule },
      tip.x + dir[0] * STEP * 1.6, tip.y + dir[1] * STEP * 1.6);
    link(prev, `${b.id}-k`);

    b.clusters.forEach((c, j) => cluster(`${b.id}-c${j}`, c, `${b.id}-s${CLUSTER_AT[j]}`, side, j % 2 ? 1 : -1));
  }

  // ponti: arco tra le punte di due rami, alla stessa distanza dal centro
  const R = STEP * SPINE;
  for (const br of BRIDGES) {
    const a0 = BRANCHES.find((b) => b.id === br.from)!.angle;
    let a1 = BRANCHES.find((b) => b.id === br.to)!.angle;
    if (a1 < a0) a1 += 360;
    let prev = `${br.from}-s${SPINE}`;
    for (let k = 1; k <= BRIDGE_NODES; k++) {
      const t = ((a0 + ((a1 - a0) * k) / (BRIDGE_NODES + 1)) * Math.PI) / 180;
      const id = `ponte-${br.from}-${k}`;
      add({ id, kind: 'small', name: br.name, mods: br.mods }, Math.cos(t) * R, Math.sin(t) * R);
      link(prev, id);
      prev = id;
    }
    link(prev, `${br.to}-s${SPINE}`);
  }

  // regioni delle Vie: dal nodo di aggancio sui ponti, verso l'esterno
  for (const v of VIA_REGIONS) {
    const at = nodes.get(v.attach)!;
    const a = Math.atan2(at.y, at.x);
    const dir = [Math.cos(a), Math.sin(a)];
    const side = [-dir[1], dir[0]];
    let prev = v.attach;
    for (let i = 1; i <= VIA_SPINE; i++) {
      const id = `${v.id}-s${i}`;
      add({ id, kind: 'small', name: v.name, mods: v.spine[(i - 1) % v.spine.length] }, at.x + dir[0] * STEP * i, at.y + dir[1] * STEP * i);
      link(prev, id);
      prev = id;
    }
    const tip = nodes.get(prev)!;
    add({ id: `${v.id}-k`, kind: 'keystone', name: v.keystone.name, mods: [], rule: v.keystone.rule },
      tip.x + dir[0] * STEP * 1.6, tip.y + dir[1] * STEP * 1.6);
    link(prev, `${v.id}-k`);
    v.clusters.forEach((c, j) => cluster(`${v.id}-c${j}`, c, `${v.id}-s${VIA_CLUSTER_AT[j]}`, side, j % 2 ? 1 : -1));
  }
  return [...nodes.values()];
}

export const STARS: StarNode[] = buildConstellations();
export const STAR_BY_ID: ReadonlyMap<string, StarNode> = new Map(STARS.map((n) => [n.id, n]));
