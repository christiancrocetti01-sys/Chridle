import type { GameState } from '../core/state';
import { FAMILIES, type Family } from '../data/enemies';
import { codexTier } from '../core/codex';
import { CODEX_DMG, CODEX_TIERS, CODEX_TIER_NAMES } from '../data/codex';
import { formatNum } from '../core/format';
import { reachedMilestones } from '../core/collection';
import { COLLECTION_BONUS, COLLECTION_MILESTONES } from '../data/collection';
import { STAT_LABELS, type StatKey } from '../data/items';
import { UNIQUES } from '../data/uniques';
import { formatStat } from './gear';
import { trackSteps, trackValue } from '../core/achievements';
import { ROMAN, TRACKS } from '../data/achievements';

/** Scheda Progressi: Bestiario, Collezione leggendari e Imprese, ognuno nella sua sotto-scheda. */
export function createProgressPanel(root: HTMLElement) {
  let key = '';
  return {
    update(state: GameState) {
      const k = JSON.stringify([codexKey(state), state.collection.length, state.achievements.length]);
      if (k === key) return;
      key = k;
      root.innerHTML = `
        <div data-sub="bestiario">
        <h2 class="section">Bestiario <span class="muted">· +${Math.round(CODEX_DMG * 100)}% danni per grado, per sempre</span></h2>
        ${bestiary(state)}
        </div>
        <div data-sub="collezione">
        <h2 class="section">Collezione leggendari <span class="muted">· ${state.collection.length}/${UNIQUES.length} unici trovati</span></h2>
        ${collection(state)}
        </div>
        <div data-sub="imprese">
        <h2 class="section">Imprese <span class="muted">· ${state.achievements.length}/${TRACKS.reduce((s, t) => s + t.steps.length, 0)} completate</span></h2>
        ${achievements(state)}
        </div>`;
    },
  };
}

/** Il Bestiario si ridisegna solo a ogni 1% di avanzamento verso il grado successivo. */
const codexKey = (state: GameState) => (Object.values(state.codex) as number[]).map((n) => {
  const t = codexTier(n);
  return t >= CODEX_TIERS.length ? t : `${t}.${Math.floor((n / CODEX_TIERS[t]) * 100)}`;
}).join();

/** Codex: uccisioni, grado e bonus per famiglia. */
function bestiary(state: GameState): string {
  return (Object.keys(FAMILIES) as Family[]).map((f) => {
    const n = state.codex[f];
    const t = codexTier(n);
    const next = CODEX_TIERS[t];
    const pct = next ? Math.min(100, (n / next) * 100) : 100;
    return `<div class="skill-row">
      <div class="skill-head"><span><b>${FAMILIES[f].name}</b> <span class="muted">${CODEX_TIER_NAMES[t]}</span></span>
        <span>${t ? `+${Math.round(t * CODEX_DMG * 100)}% danni` : '<span class="muted">nessun bonus</span>'}</span></div>
      <div class="bar"><div class="fill" style="width:${pct.toFixed(1)}%"></div></div>
      <div class="skill-info muted">${formatNum(n)} uccisi${next ? ` · prossimo grado a ${formatNum(next)}` : ' · grado massimo'}</div>
    </div>`;
  }).join('');
}

const modsText = (mods: [StatKey, number][]) => mods.map(([k, v]) => `+${formatStat(k, v)} ${STAT_LABELS[k]}`).join(', ');

/** Collezione: premi di completamento e bonus di ogni unico (quelli mancanti senza nome). */
function collection(state: GameState): string {
  const reached = reachedMilestones(state.collection);
  const milestones = COLLECTION_MILESTONES.map((m) => `<div class="skill-info${reached.includes(m) ? '' : ' muted'}">
    ${Math.round(m.frac * 100)}% (${Math.ceil(m.frac * UNIQUES.length)} unici): ${modsText(m.mods)}${reached.includes(m) ? ' ✓' : ''}</div>`).join('');
  const rows = UNIQUES.map((u) => {
    const found = state.collection.includes(u.id);
    return `<div class="skill-info${found ? '' : ' muted'}">${found ? `<b>${u.name}</b>` : '???'} · ${modsText(COLLECTION_BONUS[u.id] ?? [])}</div>`;
  }).join('');
  return `<div class="skill-row">${milestones}</div><div class="skill-row">${rows}</div>`;
}

/** Imprese: gradino raggiunto, prossimo traguardo e bonus per traccia. */
function achievements(state: GameState): string {
  return TRACKS.map((t) => {
    const n = trackSteps(state.achievements, t.id);
    const next = t.steps[n];
    const v = trackValue(state, t.id);
    return `<div class="skill-info${n ? '' : ' muted'}"><b>${t.name}${n ? ` ${ROMAN[n - 1]}` : ''}</b> · ${n ? modsText(t.bonus.map(([k, x]) => [k, x * n])) : 'nessun bonus'}
      <span class="muted">· ${next !== undefined ? `prossimo: ${t.text.replace('{n}', formatNum(next))} (${formatNum(Math.min(v, next))})` : 'completata'}</span></div>`;
  }).join('');
}
