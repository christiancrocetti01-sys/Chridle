import { abyssStage, abyssStart, canExpedition, dungeonLevel, dungeonReward, towerBonus, towerMilestones, towerStart } from '../core/modes';
import { abyssUnlocked } from '../core/endgame';
import { ABYSS_ASCENSIONS, ABYSS_ATK, ABYSS_GUARDIAN_XP, ABYSS_HP, ABYSS_WAVES } from '../data/endgame';
import type { GameState } from '../core/state';
import { FAMILIES, MECHANIC_TEXT, ZONE_KEY_EVERY, ZONE_STAGES, zoneName, zoneOf, type DamageType, type Family } from '../data/enemies';
import { DUNGEON_MODS, DUNGEON_WAVES, EXPEDITION_BATCH, RAID_KEYS, RAID_SECONDS, RAID_LEVEL_OFFSET, RAID_STAGE, TOWER_BACK, TOWER_GRAND_EVERY, TOWER_MILESTONE, TOWER_SECONDS } from '../data/modes';
import { TICK_RATE } from '../core/loop';
import { RAID_UNIQUE_CHANCE, UNIQUES } from '../data/uniques';
import { elem } from './icons';

export interface WorldActions {
  enterDungeon(): void;
  enterTower(): void;
  enterRaid(): void;
  enterAbyss(): void;
  expeditionBatch(): void;
  expeditionAll(): void;
  leaveMode(): void;
}

const TYPE_TEXT: Record<DamageType, string> = {
  physical: 'Fisico', fire: 'Fuoco', cold: 'Gelo', lightning: 'Fulmine', holy: 'Sacro', shadow: 'Ombra',
};

/** "debole a Sacro (+50%) · resiste a Ombra (−50%)". */
export function resText(family: Family): string {
  const res = Object.entries(FAMILIES[family].res) as [DamageType, number][];
  const weak = res.filter(([, v]) => v < 0).map(([t, v]) => `${elem(t, TYPE_TEXT[t])} +${Math.round(-v * 100)}%`);
  const strong = res.filter(([, v]) => v > 0).map(([t, v]) => `${elem(t, TYPE_TEXT[t])} −${Math.round(v * 100)}%`);
  return [weak.length ? `debole: ${weak.join(', ')}` : '', strong.length ? `resiste: ${strong.join(', ')}` : ''].filter(Boolean).join(' · ');
}

/** Scheda Mondo: zona attuale (sotto-scheda «zona») e modalità: Dungeon, Torre, Raid, Abisso («modi»). */
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
      const k = JSON.stringify([state.stage.current, state.stage.best, state.keys, state.totals.dungeons > 0, m.kind, m.kind === 'dungeon' ? m.mods : 0, state.tower.best, state.abyss.best, state.ascension.count, state.rebirth.count, state.collection.length]);
      if (k === key) return;
      key = k;
      const z = zoneOf(state.stage.current);
      const inMode = m.kind !== 'campaign';
      const zStart = z.index * ZONE_STAGES + 1;
      const lvl = dungeonLevel(state);
      const dz = zoneOf(lvl);
      root.innerHTML = `
        <div data-sub="zona">
        <h2 class="section">Zona <span class="muted">· stage ${zStart}-${zStart + ZONE_STAGES - 1}</span></h2>
        <div class="skill-row">
          <div class="skill-head"><b>${zoneName(state.stage.current)}</b><span class="muted">${FAMILIES[z.zone.family].name}</span></div>
          <div class="skill-info muted">${z.zone.lore}</div>
          <div class="skill-info">${resText(z.zone.family)}</div>
          <div class="skill-info">Boss di zona (stage ${zStart + ZONE_STAGES - 1}): <b>${z.zone.boss.name}</b> — ${z.zone.mechanics.map((x) => MECHANIC_TEXT[x]).join('; ')}.${(zStart + ZONE_STAGES - 1) % ZONE_KEY_EVERY === 0 ? ' Al record dà una chiave.' : ''}</div>
        </div>
        </div>
        <div data-sub="modi">
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
          <div class="skill-head"><span>Spedizione</span><span>
            <button class="btn sm" data-w="expeditionBatch"${canExpedition(state) && state.keys >= EXPEDITION_BATCH ? '' : ' disabled'}>${EXPEDITION_BATCH} chiavi</button>
            <button class="btn sm" data-w="expeditionAll"${canExpedition(state) ? '' : ' disabled'}>Tutte</button></span></div>
          <div class="skill-info">Senza combattere: ogni chiave dà subito Frammenti, Essenza e un pezzo di set, come un Dungeon
            senza modificatori (meno ricco che giocarlo).${state.totals.dungeons > 0 ? '' : ' <span class="muted">Si sblocca dopo il primo Dungeon completato.</span>'}</div>
          <div class="skill-info muted">Chiavi: dai boss di zona ogni ${ZONE_KEY_EVERY} stage (al record), dalla Torre e, a volte, dalle élite.</div>
        </div>
        <h2 class="section">Torre dell'Alba <span class="muted">· record piano ${state.tower.best}</span></h2>
        <div class="skill-row">
          <div class="skill-head"><span>Bonus permanente: <b>+${Math.round(towerBonus(state.tower.best) * 100)}%</b> attacco e vita</span>
            <button class="btn sm" data-w="enterTower"${inMode ? ' disabled' : ''}>Sali</button></div>
          <div class="skill-info">Un nemico per piano, ${TOWER_SECONDS} s per batterlo. Ogni ${TOWER_MILESTONE} piani di record: +3% attacco e vita per sempre
            (prossimo traguardo: piano ${(towerMilestones(state.tower.best) + 1) * TOWER_MILESTONE}); ogni ${TOWER_GRAND_EVERY} un oggetto <b>Mitico</b>. Gratis, Essenza a ogni piano.
            Si riparte ${TOWER_BACK} piani sotto il record (piano ${towerStart(state.tower.best)}).</div>
        </div>
        <h2 class="section">Raid</h2>
        <div class="skill-row${state.stage.best >= RAID_STAGE ? '' : ' locked'}">
          <div class="skill-head"><span>${state.stage.best >= RAID_STAGE ? `Boss enorme in 3 fasi, livello ${state.stage.best - RAID_LEVEL_OFFSET}` : `Si sblocca allo stage ${RAID_STAGE}`}</span>
            <button class="btn sm" data-w="enterRaid"${state.stage.best >= RAID_STAGE && state.keys >= RAID_KEYS && !inMode ? '' : ' disabled'}>Entra · ${RAID_KEYS} chiavi</button></div>
          <div class="skill-info">${RAID_SECONDS} s per abbatterlo. Fase 2: evoca servitori e si scuda; fase 3: furia e rigenerazione.
            In premio un oggetto <b>Leggendario</b> garantito (a volte Mitico o Divino); ${Math.round(RAID_UNIQUE_CHANCE * 100)}% di probabilità che sia l'unico proprio del boss:
            ${UNIQUES.filter((u) => u.raid).map((u) => `${u.raid} → <b>${u.name}</b>${state.collection.includes(u.id) ? ' ✓' : ''}`).join(' · ')}.</div>
        </div>
        <h2 class="section">Abisso <span class="muted">· record profondità ${state.abyss.best}</span></h2>
        <div class="skill-row${abyssUnlocked(state) ? '' : ' locked'}">
          <div class="skill-head"><span>${abyssUnlocked(state) ? `Si scende dalla profondità <b>${abyssStart(state.abyss.best)}</b> (nemici da stage ${abyssStage(abyssStart(state.abyss.best))})` : `Si sblocca dopo ${ABYSS_ASCENSIONS} Ascensioni`}</span>
            <button class="btn sm" data-w="enterAbyss"${abyssUnlocked(state) && !inMode ? '' : ' disabled'}>Scendi</button></div>
          <div class="skill-info">Profondità infinite: ${ABYSS_WAVES} nemici (molte élite) e un Guardiano, poi si scende ancora finché non cadi.
            Nemici con vita ×${ABYSS_HP} e attacco ×${ABYSS_ATK}. Ogni uccisione dà esperienza <b>Paragon</b> pari alla profondità
            (il Guardiano ×${ABYSS_GUARDIAN_XP}), oltre al bottino normale. Gratis.</div>
        </div>
        </div>`;
    },
  };
}

/** Testo del timer di Torre e Raid. */
export const modeTimer = (state: GameState) =>
  state.mode.kind === 'tower' || state.mode.kind === 'raid' ? `${Math.ceil(state.mode.ticksLeft / TICK_RATE)} s` : '';
