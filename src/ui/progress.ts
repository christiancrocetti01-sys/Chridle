import type { GameState } from '../core/state';
import { FAMILIES, type Family } from '../data/enemies';
import { codexTier } from '../core/codex';
import { CODEX_DMG, CODEX_TIERS, CODEX_TIER_NAMES } from '../data/codex';
import { formatNum } from '../core/format';
import { reachedMilestones } from '../core/collection';
import {
  ASCENDED_BONUS_MULT, ASCENDED_DEPTH, ASCENDED_MILESTONES, ASCENDED_MULT, ASCENDED_RAID_LEVEL, COLLECTION_BONUS, COLLECTION_MILESTONES,
} from '../data/collection';
import { STAT_LABELS, type StatKey } from '../data/items';
import { UNIQUES } from '../data/uniques';
import { formatStat } from './gear';
import { trackSteps, trackValue } from '../core/achievements';
import { ROMAN, TRACKS } from '../data/achievements';
import { createExpander } from './list';
import { cardBack, familyCard, uniqueCard, zoneBossCard } from './art';
import { ZONES, ZONE_STAGES } from '../data/enemies';

type Rows = ReturnType<typeof createExpander>;

/** Scheda Codex: Bestiario, Collezione leggendari e Imprese, ognuno nella sua sotto-scheda. */
export function createProgressPanel(root: HTMLElement) {
  const li = createExpander(root);
  let key = '';
  return {
    update(state: GameState) {
      const k = JSON.stringify([codexKey(state), state.collection.length, state.ascended.length, state.achievements.length, Math.floor(state.stage.best / ZONE_STAGES)]);
      if (k === key) return;
      key = k;
      root.innerHTML = `
        <div data-sub="bestiario">
        <h2 class="section">Bestiario <span class="muted">· +${Math.round(CODEX_DMG * 100)}% danni per grado, per sempre</span></h2>
        ${gallery((Object.keys(FAMILIES) as Family[]).map((f) => familyCard(f, state.codex[f] > 0)))}
        ${bestiary(state, li)}
        <h2 class="section">Boss di zona <span class="muted">· svelati raggiungendo la loro zona</span></h2>
        ${gallery(ZONES.map((_, i) => zoneBossCard(i, maxStage(state) >= (i + 1) * ZONE_STAGES)))}
        </div>
        <div data-sub="collezione">
        <h2 class="section">Collezione leggendari <span class="muted">· ${state.collection.length}/${UNIQUES.length} unici trovati</span></h2>
        ${gallery(UNIQUES.flatMap((u, i) => (state.collection.includes(u.id) ? [uniqueCard(u, i + 1, true)] : []))
          .concat(state.collection.length < UNIQUES.length ? [cardBack(`${UNIQUES.length - state.collection.length} da trovare`)] : []))}
        ${collection(state, li)}
        ${state.collection.length >= UNIQUES.length / 2 || state.ascended.length ? ascendedCollection(state, li) : ''}
        </div>
        <div data-sub="imprese">
        <h2 class="section">Imprese <span class="muted">· ${state.achievements.length}/${TRACKS.reduce((s, t) => s + t.steps.length, 0)} completate</span></h2>
        ${achievements(state, li)}
        </div>`;
    },
  };
}

/** Griglia di carte-tarocco. */
const gallery = (cards: string[]) => `<div class="tarot-grid">${cards.join('')}</div>`;

/** Stage più lontano mai raggiunto: il record della partita o il gradino più alto delle imprese "stage" (che restano all'Ascensione). */
function maxStage(state: GameState): number {
  const track = TRACKS.find((t) => t.id === 'stage');
  const steps = track ? trackSteps(state.achievements, 'stage') : 0;
  return Math.max(state.stage.best, steps && track ? track.steps[steps - 1] : 0);
}

/** Il Bestiario si ridisegna solo a ogni 1% di avanzamento verso il grado successivo. */
const codexKey = (state: GameState) => (Object.values(state.codex) as number[]).map((n) => {
  const t = codexTier(n);
  return t >= CODEX_TIERS.length ? t : `${t}.${Math.floor((n / CODEX_TIERS[t]) * 100)}`;
}).join();

/** Codex: una riga per famiglia con grado e bonus, barra sottile verso il grado successivo. */
function bestiary(state: GameState, li: Rows): string {
  return (Object.keys(FAMILIES) as Family[]).map((f) => {
    const n = state.codex[f];
    const t = codexTier(n);
    const next = CODEX_TIERS[t];
    const pct = next ? Math.min(100, (n / next) * 100) : 100;
    return li.row(`be:${f}`, `<b>${FAMILIES[f].name}</b> <span class="muted">${CODEX_TIER_NAMES[t]}</span>`,
      t ? `+${Math.round(t * CODEX_DMG * 100)}% danni` : '—',
      `<span class="muted">${formatNum(n)} uccisi${next ? ` · prossimo grado a ${formatNum(next)}` : ' · grado massimo'}</span>`, t ? '' : 'dim',
      `<div class="bar"><div class="fill" style="width:${pct.toFixed(1)}%"></div></div>`);
  }).join('');
}

const modsText = (mods: [StatKey, number][]) => mods.map(([k, v]) => `+${formatStat(k, v)} ${STAT_LABELS[k]}`).join(', ');

/** Collezione: prossimo premio in una riga, unici trovati uno per riga, i mancanti riassunti. */
function collection(state: GameState, li: Rows): string {
  const reached = reachedMilestones(state.collection);
  const label = (m: (typeof COLLECTION_MILESTONES)[number]) => `${Math.round(m.frac * 100)}% (${Math.ceil(m.frac * UNIQUES.length)} unici)`;
  const next = COLLECTION_MILESTONES.find((m) => !reached.includes(m));
  const prizes = li.row('co:premi', '<b>Premi di completamento</b>', next ? `prossimo: ${label(next)}` : 'tutti',
    COLLECTION_MILESTONES.map((m) => `<div${reached.includes(m) ? '' : ' class="muted"'}>${label(m)}: ${modsText(m.mods)}${reached.includes(m) ? ' ✓' : ''}</div>`).join(''));
  const found = UNIQUES.filter((u) => state.collection.includes(u.id));
  const missing = UNIQUES.filter((u) => !state.collection.includes(u.id));
  const rows = found.map((u) => li.row(`co:${u.id}`, `<b>${u.name}</b>`, '', modsText(COLLECTION_BONUS[u.id] ?? []))).join('');
  const rest = missing.length ? li.row('co:mancanti', `<span class="muted">${missing.length} da trovare</span>`, '',
    missing.map((u) => `<div class="muted">??? · ${modsText(COLLECTION_BONUS[u.id] ?? [])}</div>`).join(''), 'dim') : '';
  return prizes + rows + rest;
}

/** Collezione Ascesa: la seconda caccia, aperta da metà collezione. */
function ascendedCollection(state: GameState, li: Rows): string {
  const reached = reachedMilestones(state.ascended, ASCENDED_MILESTONES);
  const label = (m: (typeof ASCENDED_MILESTONES)[number]) => `${Math.round(m.frac * 100)}% (${Math.ceil(m.frac * UNIQUES.length)} Ascesi)`;
  const next = ASCENDED_MILESTONES.find((m) => !reached.includes(m));
  const head = `<h2 class="section">Collezione Ascesa <span class="muted">· ${state.ascended.length}/${UNIQUES.length} unici Ascesi</span></h2>
    <p class="muted small">Un unico già trovato può cadere Asceso ✦ (statistiche fisse ×${ASCENDED_MULT}, almeno Mitico): dai Guardiani dell'Abisso
    dalla profondità ${ASCENDED_DEPTH} e dai Raid di livello ${ASCENDED_RAID_LEVEL}+. Ognuno ridà il suo bonus di collezione ×${ASCENDED_BONUS_MULT}.</p>`;
  const prizes = li.row('ca:premi', '<b>Premi della Collezione Ascesa</b>', next ? `prossimo: ${label(next)}` : 'tutti',
    ASCENDED_MILESTONES.map((m) => `<div${reached.includes(m) ? '' : ' class="muted"'}>${label(m)}: ${modsText(m.mods)}${reached.includes(m) ? ' ✓' : ''}</div>`).join(''));
  const rows = UNIQUES.filter((u) => state.ascended.includes(u.id))
    .map((u) => li.row(`ca:${u.id}`, `<b>${u.name} ✦</b>`, '', modsText((COLLECTION_BONUS[u.id] ?? []).map(([k, v]) => [k, v * ASCENDED_BONUS_MULT])))).join('');
  return head + prizes + rows;
}

/** Imprese: una riga per traccia con gradino e avanzamento; bonus e prossimo traguardo al tocco. */
function achievements(state: GameState, li: Rows): string {
  return TRACKS.map((t) => {
    const n = trackSteps(state.achievements, t.id);
    const next = t.steps[n];
    const v = trackValue(state, t.id);
    return li.row(`im:${t.id}`, `<b>${t.name}${n ? ` ${ROMAN[n - 1]}` : ''}</b>`,
      next !== undefined ? `${formatNum(Math.min(v, next))} / ${formatNum(next)}` : 'completata ✓',
      `<div>${n ? modsText(t.bonus.map(([k, x]) => [k, x * n])) : '<span class="muted">nessun bonus</span>'}</div>
      ${next !== undefined ? `<span class="muted">prossimo: ${t.text.replace('{n}', formatNum(next))}</span>` : ''}`, n ? '' : 'dim');
  }).join('');
}
