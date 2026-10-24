import { dungeonLevel, dungeonReward, towerBonus, towerMilestones } from '../core/modes';
import type { GameState } from '../core/state';
import { FAMILIES, MECHANIC_TEXT, ZONE_STAGES, zoneName, zoneOf, type DamageType, type Family } from '../data/enemies';
import { DUNGEON_MODS, DUNGEON_WAVES, RAID_KEYS, RAID_SECONDS, RAID_STAGE, TOWER_MILESTONE, TOWER_SECONDS } from '../data/modes';
import { TICK_RATE } from '../core/loop';

export interface WorldActions {
  enterDungeon(): void;
  enterTower(): void;
  enterRaid(): void;
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
      const k = JSON.stringify([state.stage.current, state.stage.best, state.keys, m.kind, m.kind === 'dungeon' ? m.mods : 0, state.tower.best]);
      if (k === key) return;
      key = k;
      const z = zoneOf(state.stage.current);
      const inMode = m.kind !== 'campaign';
      const zStart = z.index * ZONE_STAGES + 1;
      const lvl = dungeonLevel(state);
      const dz = zoneOf(lvl);
      root.innerHTML = `
        ${inMode ? `<div class="mode-banner"><span>${m.kind === 'dungeon' ? 'Dungeon in corso' : m.kind === 'tower' ? 'Torre in corso' : 'Raid in corso'}</span>
          <button class="btn sm" data-w="leaveMode">Abbandona</button></div>` : ''}
        <h2 class="section">Zona <span class="muted">· stage ${zStart}-${zStart + ZONE_STAGES - 1}</span></h2>
        <div class="skill-row">
          <div class="skill-head"><b>${zoneName(state.stage.current)}</b><span class="muted">${FAMILIES[z.zone.family].name}</span></div>
          <div class="skill-info muted">${z.zone.lore}</div>
          <div class="skill-info">${resText(z.zone.family)}</div>
          <div class="skill-info">Boss di zona (stage ${zStart + ZONE_STAGES - 1}): <b>${z.zone.boss.name}</b> — ${z.zone.mechanics.map((x) => MECHANIC_TEXT[x]).join('; ')}. Dà una chiave.</div>
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
          <div class="skill-info muted">Chiavi: dai boss di zona e, a volte, dalle élite.</div>
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
          <div class="skill-head"><span>${state.stage.best >= RAID_STAGE ? `Boss enorme in 3 fasi, livello ${state.stage.best}` : `Si sblocca allo stage ${RAID_STAGE}`}</span>
            <button class="btn sm" data-w="enterRaid"${state.stage.best >= RAID_STAGE && state.keys >= RAID_KEYS && !inMode ? '' : ' disabled'}>Entra · ${RAID_KEYS} chiavi</button></div>
          <div class="skill-info">${RAID_SECONDS} s per abbatterlo. Fase 2: evoca servitori e si scuda; fase 3: furia e rigenerazione.
            In premio un oggetto <b>Leggendario</b> garantito (a volte Mitico o Divino).</div>
        </div>`;
    },
  };
}

/** Testo del timer di Torre e Raid. */
export const modeTimer = (state: GameState) =>
  state.mode.kind === 'tower' || state.mode.kind === 'raid' ? `${Math.ceil(state.mode.ticksLeft / TICK_RATE)} s` : '';
