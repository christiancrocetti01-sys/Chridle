import { abyssStage, abyssStart, canExpedition, dungeonLevel, dungeonReward, raidLevel, towerBonus, towerMilestones, towerStart } from '../core/modes';
import { abyssUnlocked } from '../core/endgame';
import { ABYSS_ASCENSIONS, ABYSS_ATK, ABYSS_GUARDIAN_XP, ABYSS_HP, ABYSS_WAVES } from '../data/endgame';
import type { GameState } from '../core/state';
import { FAMILIES, MECHANIC_TEXT, ZONE_KEY_EVERY, ZONE_STAGES, bossMechanics, signReward, zoneName, zoneOf, zoneSigns, type DamageType, type Family } from '../data/enemies';
import { DUNGEON_MODS, DUNGEON_WAVES, EXPEDITION_BATCH, RAID_KEYS, RAID_SECONDS, RAID_STAGE, TOWER_BACK, TOWER_GRAND_EVERY, TOWER_MILESTONE, TOWER_SECONDS } from '../data/modes';
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

const INFO_ICON = '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="7.5"/><path d="M9 8 V13 M9 5 V5.6"/></svg>';
const LOCK_ICON = '<svg width="16" height="18" viewBox="0 0 16 18" aria-hidden="true"><rect x="2" y="8" width="12" height="9" rx="1"/><path d="M5 8 V5 A3 3 0 0 1 11 5 V8"/></svg>';

interface ModeCard {
  id: string;
  name: string;
  /** Livello o record, accanto al nome. */
  tag?: string;
  /** Una riga: cosa si ottiene. */
  line: string;
  /** Pulsante (o lucchetto se la modalità è chiusa). */
  action: string;
  /** Righe in più sempre visibili (modificatori in corso, Spedizione). */
  extra?: string;
  /** Regole complete, dietro la (i). */
  info: string;
  on?: boolean;
  locked?: boolean;
}

/** Scheda Mondo: una carta per modalità (nome, una riga, un pulsante); le regole stanno dietro la (i). */
export function createWorldPanel(root: HTMLElement, actions: WorldActions) {
  let key = '';
  const open = new Set<string>();
  root.addEventListener('click', (ev) => {
    const info = (ev.target as HTMLElement).closest<HTMLElement>('[data-info]');
    if (info) {
      const id = info.dataset.info!;
      if (open.has(id)) open.delete(id);
      else open.add(id);
      key = '';
      return;
    }
    const t = (ev.target as HTMLElement).closest<HTMLElement>('[data-w]');
    if (!t) return;
    const a = t.dataset.w as keyof WorldActions;
    actions[a]();
    key = '';
  });

  const card = (c: ModeCard) => `
    <div class="mode${c.on ? ' on' : ''}${c.locked ? ' locked' : ''}">
      <div class="mode-head">
        <div class="mode-text"><span class="mode-name">${c.name}${c.tag ? ` <span class="muted">${c.tag}</span>` : ''}</span><span class="mode-line">${c.line}</span></div>
        <button class="icon-btn info" data-info="${c.id}" aria-label="Regole: ${c.name}" aria-expanded="${open.has(c.id)}">${INFO_ICON}</button>
        ${c.on ? '<span class="mode-on">IN CORSO</span>' : c.action}
      </div>
      ${c.extra ?? ''}
      ${open.has(c.id) ? `<div class="mode-info">${c.info}</div>` : ''}
    </div>`;

  return {
    update(state: GameState) {
      const m = state.mode;
      const k = JSON.stringify([state.stage.current, state.stage.best, state.keys, state.totals.dungeons > 0, m.kind, m.kind === 'dungeon' ? m.mods : 0, state.tower.best, state.abyss.best, state.ascension.count, state.rebirth.count, state.collection.length, [...open]]);
      if (k === key) return;
      key = k;
      const z = zoneOf(state.stage.current);
      const inMode = m.kind !== 'campaign';
      const zStart = z.index * ZONE_STAGES + 1;
      const signs = zoneSigns(state.stage.current);
      const signText = signs.length ? `<p>Segni del ciclo: ${signs.map((id) => { const d = DUNGEON_MODS.find((x) => x.id === id)!; return `<b>${d.name}</b> (${d.text})`; }).join(', ')} · oro, XP ed Essenza ×${signReward(signs).toFixed(2)}.</p>` : '';
      const lvl = dungeonLevel(state);
      const dz = zoneOf(lvl);
      const raidOpen = state.stage.best >= RAID_STAGE;
      const abyssOpen = abyssUnlocked(state);
      const lock = `<span class="mode-lock">${LOCK_ICON}</span>`;
      const cards: ModeCard[] = [
        {
          id: 'campaign', name: 'Campagna', line: `${zoneName(state.stage.current)} · record ${state.stage.best}`, action: '', on: !inMode,
          info: `<p><b>${zoneName(state.stage.current)}</b> · ${FAMILIES[z.zone.family].name} · stage ${zStart}-${zStart + ZONE_STAGES - 1}</p>
            <p class="muted">${z.zone.lore}</p><p>${resText(z.zone.family)}</p>${signText}
            <p>Boss di zona (stage ${zStart + ZONE_STAGES - 1}): <b>${z.zone.boss.name}</b> — ${bossMechanics(zStart).map((x) => MECHANIC_TEXT[x]).join('; ')}.${(zStart + ZONE_STAGES - 1) % ZONE_KEY_EVERY === 0 ? ' Al record dà una chiave.' : ''}</p>`,
        },
        {
          id: 'dungeon', name: 'Dungeon', tag: `liv. ${lvl}`, line: `${DUNGEON_WAVES} nemici + boss · pezzo di set garantito`, on: m.kind === 'dungeon',
          action: `<button class="btn fill" data-w="enterDungeon"${state.keys >= 1 && !inMode ? '' : ' disabled'}>Entra · 1</button>`,
          extra: `${m.kind === 'dungeon' ? `<p class="mode-sub rule">${m.mods.map((id) => DUNGEON_MODS.find((x) => x.id === id)!.name).join(', ')} · ricompense ×${dungeonReward(m.mods).toFixed(2)} · nemico ${Math.min(m.wave + 1, DUNGEON_WAVES + 1)}/${DUNGEON_WAVES + 1}</p>` : ''}
            <div class="mode-sub"><span>${state.totals.dungeons > 0 ? 'Spedizione: bottino subito, senza combattere' : 'Spedizione: dopo il primo Dungeon'}</span>
              <span class="mode-btns"><button class="btn sm" data-w="expeditionBatch"${canExpedition(state) && state.keys >= EXPEDITION_BATCH ? '' : ' disabled'}>Usa ${EXPEDITION_BATCH}</button>
              <button class="btn sm" data-w="expeditionAll"${canExpedition(state) ? '' : ' disabled'}>Tutte</button></span></div>`,
          info: `<p>${DUNGEON_WAVES} nemici e il boss ${dz.zone.boss.name} (${zoneName(lvl)}), 2 modificatori a caso che alzano le ricompense.
            In premio: Frammenti, Essenza e un <b>pezzo di set</b> garantito. Se cadi la chiave è persa.</p>
            ${m.kind === 'dungeon' ? `<p>${m.mods.map((id) => { const d = DUNGEON_MODS.find((x) => x.id === id)!; return `${d.name}: ${d.text}`; }).join(' · ')}</p>` : ''}
            <p><b>Spedizione</b>: ogni chiave dà subito Frammenti, Essenza e un pezzo di set, come un Dungeon senza modificatori (meno ricco che giocarlo). Si sblocca dopo il primo Dungeon completato.</p>`,
        },
        {
          id: 'tower', name: "Torre dell'Alba", tag: `record ${state.tower.best}`, on: m.kind === 'tower',
          line: `${TOWER_SECONDS} s a piano · bonus +${Math.round(towerBonus(state.tower.best) * 100)}% per sempre`,
          action: `<button class="btn" data-w="enterTower"${inMode ? ' disabled' : ''}>Sali</button>`,
          info: `<p>Un nemico per piano, ${TOWER_SECONDS} s per batterlo. Ogni ${TOWER_MILESTONE} piani di record: +3% attacco e vita per sempre
            (prossimo traguardo: piano ${(towerMilestones(state.tower.best) + 1) * TOWER_MILESTONE}); ogni ${TOWER_GRAND_EVERY} un oggetto <b>Mitico</b>.
            Gratis, Essenza a ogni piano. Si riparte ${TOWER_BACK} piani sotto il record (piano ${towerStart(state.tower.best)}).</p>`,
        },
        {
          id: 'raid', name: 'Raid', tag: raidOpen ? `liv. ${raidLevel(state)}` : '', on: m.kind === 'raid', locked: !raidOpen,
          line: raidOpen ? `boss leggendario in 3 fasi · ${RAID_KEYS} chiavi` : `si apre allo stage ${RAID_STAGE}`,
          action: raidOpen ? `<button class="btn" data-w="enterRaid"${state.keys >= RAID_KEYS && !inMode ? '' : ' disabled'}>Sfida</button>` : lock,
          info: `<p>${RAID_SECONDS} s per abbatterlo. Fase 2: evoca servitori e si scuda; fase 3: furia e rigenerazione.
            In premio un oggetto <b>Leggendario</b> garantito (a volte Mitico o Divino); ${Math.round(RAID_UNIQUE_CHANCE * 100)}% di probabilità che sia l'unico proprio del boss:</p>
            <p>${UNIQUES.filter((u) => u.raid).map((u) => `${u.raid} → <b>${u.name}</b>${state.collection.includes(u.id) ? ' ✓' : ''}`).join(' · ')}.</p>`,
        },
        {
          id: 'abyss', name: 'Abisso', tag: abyssOpen ? `record ${state.abyss.best}` : '', on: m.kind === 'abyss', locked: !abyssOpen,
          line: abyssOpen ? `da profondità ${abyssStart(state.abyss.best)} · esperienza Paragon` : `si apre dopo ${ABYSS_ASCENSIONS} Ascensioni`,
          action: abyssOpen ? `<button class="btn" data-w="enterAbyss"${inMode ? ' disabled' : ''}>Scendi</button>` : lock,
          info: `<p>Profondità infinite: ${ABYSS_WAVES} nemici (molte élite) e un Guardiano, poi si scende ancora finché non cadi.
            Nemici con vita ×${ABYSS_HP} e attacco ×${ABYSS_ATK}${abyssOpen ? ` (dalla profondità ${abyssStart(state.abyss.best)}: nemici da stage ${abyssStage(abyssStart(state.abyss.best))})` : ''}.
            Ogni uccisione dà esperienza <b>Paragon</b> pari alla profondità (il Guardiano ×${ABYSS_GUARDIAN_XP}), oltre al bottino normale. Gratis.</p>`,
        },
      ];
      root.innerHTML = `<div class="modes">${cards.map(card).join('')}</div>
        <p class="hint">Chiavi (${state.keys}): boss di zona ogni ${ZONE_KEY_EVERY} stage al record, Torre, élite.</p>`;
    },
  };
}

/** Testo del timer di Torre e Raid. */
export const modeTimer = (state: GameState) =>
  state.mode.kind === 'tower' || state.mode.kind === 'raid' ? `${Math.ceil(state.mode.ticksLeft / TICK_RATE)} s` : '';
