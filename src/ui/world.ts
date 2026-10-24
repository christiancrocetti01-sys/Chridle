import { abyssStage, abyssStart, dungeonLevel, dungeonReward, towerBonus, towerMilestones } from '../core/modes';
import { abyssUnlocked } from '../core/endgame';
import { ABYSS_ASCENSIONS, ABYSS_ATK, ABYSS_GUARDIAN_XP, ABYSS_HP, ABYSS_WAVES } from '../data/endgame';
import type { GameState } from '../core/state';
import { FAMILIES, MECHANIC_TEXT, ZONE_KEY_EVERY, ZONE_STAGES, zoneName, zoneOf, type DamageType, type Family } from '../data/enemies';
import { DUNGEON_MODS, DUNGEON_WAVES, RAID_KEYS, RAID_SECONDS, RAID_LEVEL_OFFSET, RAID_STAGE, TOWER_MILESTONE, TOWER_SECONDS } from '../data/modes';
import { TICK_RATE } from '../core/loop';
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

export interface WorldActions {
  enterDungeon(): void;
  enterTower(): void;
  enterRaid(): void;
  enterAbyss(): void;
  leaveMode(): void;
}

const TYPE_TEXT: Record<DamageType, string> = {
  physical: 'Fisico', fire: 'Fuoco', cold: 'Gelo', lightning: 'Fulmine', holy: 'Sacro', shadow: 'Ombra',
};

/** "debole a Sacro (+50%) · resiste a Ombra (−50%)". */
export function resText(family: Family): string {
  const res = Object.entries(FAMILIES[family].res) as [DamageType, number][];
  const weak = res.filter(([, v]) => v < 0).map(([t, v]) => `${TYPE_TEXT[t]} +${Math.round(-v * 100)}%`);
  const strong = res.filter(([, v]) => v > 0).map(([t, v]) => `${TYPE_TEXT[t]} −${Math.round(v * 100)}%`);
  return [weak.length ? `debole: ${weak.join(', ')}` : '', strong.length ? `resiste: ${strong.join(', ')}` : ''].filter(Boolean).join(' · ');
}

/** Scheda Mondo: zona attuale, Dungeon, Torre dell'Alba e Raid. */
export function createWorldPanel(root: HTMLElement, actions: WorldActions) {
  let key = '';
  root.addEventListener('click', (ev) => {
    const t = (ev.target as HTMLElement).closest<HTMLElement>('[data-w]');
    if (!t) return;
    const a = t.dataset.w as keyof WorldActions;
    actions[a]();
    key = '';
  });
  return {
    update(state: GameState) {
      const m = state.mode;
      const k = JSON.stringify([state.stage.current, state.stage.best, state.keys, m.kind, m.kind === 'dungeon' ? m.mods : 0, state.tower.best, state.abyss.best, state.ascension.count, state.rebirth.count, codexKey(state), state.collection.length, state.achievements.length]);
      if (k === key) return;
      key = k;
      const z = zoneOf(state.stage.current);
      const inMode = m.kind !== 'campaign';
      const zStart = z.index * ZONE_STAGES + 1;
      const lvl = dungeonLevel(state);
      const dz = zoneOf(lvl);
      root.innerHTML = `
        ${inMode ? `<div class="mode-banner"><span>${m.kind === 'dungeon' ? 'Dungeon in corso' : m.kind === 'tower' ? 'Torre in corso' : m.kind === 'abyss' ? 'Abisso in corso' : 'Raid in corso'}</span>
          <button class="btn sm" data-w="leaveMode">Abbandona</button></div>` : ''}
        <h2 class="section">Zona <span class="muted">· stage ${zStart}-${zStart + ZONE_STAGES - 1}</span></h2>
        <div class="skill-row">
          <div class="skill-head"><b>${zoneName(state.stage.current)}</b><span class="muted">${FAMILIES[z.zone.family].name}</span></div>
          <div class="skill-info muted">${z.zone.lore}</div>
          <div class="skill-info">${resText(z.zone.family)}</div>
          <div class="skill-info">Boss di zona (stage ${zStart + ZONE_STAGES - 1}): <b>${z.zone.boss.name}</b> — ${z.zone.mechanics.map((x) => MECHANIC_TEXT[x]).join('; ')}.${(zStart + ZONE_STAGES - 1) % ZONE_KEY_EVERY === 0 ? ' Al record dà una chiave.' : ''}</div>
        </div>
        <h2 class="section">Dungeon <span class="muted">· ${state.keys} chiavi</span></h2>
        <div class="skill-row">
          <div class="skill-head"><span><b>${zoneName(lvl)}</b> <span class="muted">livello ${lvl}</span></span>
            <button class="btn sm" data-w="enterDungeon"${state.keys >= 1 && !inMode ? '' : ' disabled'}>Entra · 1 chiave</button></div>
          <div class="skill-info">${DUNGEON_WAVES} nemici e il boss ${dz.zone.boss.name}, 2 modificatori a caso che alzano le ricompense.
            In premio: Frammenti, Essenza e un <b>pezzo di set</b> garantito. Se cadi la chiave è persa.</div>
          ${m.kind === 'dungeon' ? `<div class="skill-info rule">Modificatori: ${m.mods.map((id) => {
            const d = DUNGEON_MODS.find((x) => x.id === id)!;
            return `${d.name} (${d.text})`;
          }).join(', ')} · ricompense ×${dungeonReward(m.mods).toFixed(2)} · nemico ${Math.min(m.wave + 1, DUNGEON_WAVES + 1)}/${DUNGEON_WAVES + 1}</div>` : ''}
          <div class="skill-info muted">Chiavi: dai boss di zona ogni ${ZONE_KEY_EVERY} stage (al record), dalla Torre e, a volte, dalle élite.</div>
        </div>
        <h2 class="section">Torre dell'Alba <span class="muted">· record piano ${state.tower.best}</span></h2>
        <div class="skill-row">
          <div class="skill-head"><span>Bonus permanente: <b>+${Math.round(towerBonus(state.tower.best) * 100)}%</b> attacco e vita</span>
            <button class="btn sm" data-w="enterTower"${inMode ? ' disabled' : ''}>Sali</button></div>
          <div class="skill-info">Un nemico per piano, ${TOWER_SECONDS} s per batterlo. Ogni ${TOWER_MILESTONE} piani di record: +3% attacco e vita per sempre
            (prossimo traguardo: piano ${(towerMilestones(state.tower.best) + 1) * TOWER_MILESTONE}). Gratis, Essenza a ogni piano.</div>
        </div>
        <h2 class="section">Raid</h2>
        <div class="skill-row${state.stage.best >= RAID_STAGE ? '' : ' locked'}">
          <div class="skill-head"><span>${state.stage.best >= RAID_STAGE ? `Boss enorme in 3 fasi, livello ${state.stage.best - RAID_LEVEL_OFFSET}` : `Si sblocca allo stage ${RAID_STAGE}`}</span>
            <button class="btn sm" data-w="enterRaid"${state.stage.best >= RAID_STAGE && state.keys >= RAID_KEYS && !inMode ? '' : ' disabled'}>Entra · ${RAID_KEYS} chiavi</button></div>
          <div class="skill-info">${RAID_SECONDS} s per abbatterlo. Fase 2: evoca servitori e si scuda; fase 3: furia e rigenerazione.
            In premio un oggetto <b>Leggendario</b> garantito (a volte Mitico o Divino).</div>
        </div>
        <h2 class="section">Abisso <span class="muted">· record profondità ${state.abyss.best}</span></h2>
        <div class="skill-row${abyssUnlocked(state) ? '' : ' locked'}">
          <div class="skill-head"><span>${abyssUnlocked(state) ? `Si scende dalla profondità <b>${abyssStart(state.abyss.best)}</b> (nemici da stage ${abyssStage(abyssStart(state.abyss.best))})` : `Si sblocca dopo ${ABYSS_ASCENSIONS} Ascensioni`}</span>
            <button class="btn sm" data-w="enterAbyss"${abyssUnlocked(state) && !inMode ? '' : ' disabled'}>Scendi</button></div>
          <div class="skill-info">Profondità infinite: ${ABYSS_WAVES} nemici (molte élite) e un Guardiano, poi si scende ancora finché non cadi.
            Nemici con vita ×${ABYSS_HP} e attacco ×${ABYSS_ATK}. Ogni uccisione dà esperienza <b>Paragon</b> pari alla profondità
            (il Guardiano ×${ABYSS_GUARDIAN_XP}), oltre al bottino normale. Gratis.</div>
        </div>
        <h2 class="section">Bestiario <span class="muted">· +${Math.round(CODEX_DMG * 100)}% danni per grado, per sempre</span></h2>
        ${bestiary(state)}
        <h2 class="section">Collezione leggendari <span class="muted">· ${state.collection.length}/${UNIQUES.length} unici trovati</span></h2>
        ${collection(state)}
        <h2 class="section">Imprese <span class="muted">· ${state.achievements.length}/${TRACKS.reduce((s, t) => s + t.steps.length, 0)} completate</span></h2>
        ${achievements(state)}`;
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

/** Testo del timer di Torre e Raid. */
export const modeTimer = (state: GameState) =>
  state.mode.kind === 'tower' || state.mode.kind === 'raid' ? `${Math.ceil(state.mode.ticksLeft / TICK_RATE)} s` : '';
