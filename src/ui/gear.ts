import { formatNum } from '../core/format';
import { INVENTORY_SIZE, itemMods, salvageValue, slotsFor, type GearState, type Item } from '../core/items';
import type { GameState } from '../core/state';
import { heroStats, type Stats } from '../core/stats';
import { DOLL_LEFT, DOLL_RIGHT, SILHOUETTE } from './doll';
import { ITEM_TYPES, PCT_STATS, RARITIES, SLOTS, STAT_LABELS, type SlotId, type StatKey } from '../data/items';

export interface GearActions {
  equip(uid: number, slot: SlotId): void;
  unequip(slot: SlotId): void;
  salvage(uid: number): void;
  salvageUpTo(rarity: number): void;
  setAutoSalvage(rarity: number): void;
}

type Selection = { kind: 'inv'; uid: number } | { kind: 'slot'; slot: SlotId } | null;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&${({ '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot' })[c]};`);

export function formatStat(stat: StatKey, v: number): string {
  if (PCT_STATS.has(stat)) return `${(v * 100).toFixed(v < 0.1 ? 1 : 0)}%`;
  return v < 10 ? v.toFixed(1) : formatNum(v);
}

function itemLabel(it: Item): string {
  return `<span class="rar-${it.rarity}" style="color:${RARITIES[it.rarity].color}">${esc(it.name)}</span>`;
}

function itemDetail(it: Item): string {
  const r = RARITIES[it.rarity];
  const type = ITEM_TYPES.find((t) => t.id === it.type)!;
  const lines = it.affixes.map((a) => `<li>+${formatStat(a.stat, a.value)} ${STAT_LABELS[a.stat]} <span class="muted">T${a.tier}</span></li>`);
  return `
    <div class="item-name">${itemLabel(it)}</div>
    <div class="muted">${r.name} · ${type.name} · Lv oggetto ${it.ilvl}</div>
    <div class="item-base">+${formatStat(it.base.stat, it.base.value)} ${STAT_LABELS[it.base.stat]}</div>
    <ul class="affixes">${lines.join('')}</ul>`;
}

const COMPARE: { key: keyof Stats; label: string; pct?: boolean }[] = [
  { key: 'atk', label: 'Attacco' },
  { key: 'def', label: 'Difesa' },
  { key: 'maxHp', label: 'Vita' },
  { key: 'attackSpeed', label: 'Velocità' },
  { key: 'critChance', label: 'Critico', pct: true },
  { key: 'critMult', label: 'Danno critico', pct: true },
  { key: 'regen', label: 'Rigenerazione' },
];

/** Differenze di statistiche se si indossasse `item` nello `slot`. */
function compare(state: GameState, item: Item | null, slot: SlotId): string {
  const now = heroStats(state.hero.level, state.upgrades, itemMods(Object.values(state.gear.equipped)));
  const after = { ...state.gear.equipped, [slot]: item ?? undefined };
  const then = heroStats(state.hero.level, state.upgrades, itemMods(Object.values(after)));
  const rows = COMPARE.map(({ key, label, pct }) => {
    const d = then[key] - now[key];
    if (Math.abs(d) < 1e-9) return '';
    const text = pct ? `${(d * 100).toFixed(1)}%` : Math.abs(d) < 10 ? d.toFixed(2) : formatNum(Math.abs(d));
    const sign = d > 0 ? '+' : pct || Math.abs(d) < 10 ? '' : '-';
    return `<span class="${d > 0 ? 'up' : 'down'}">${sign}${text} ${label}</span>`;
  }).filter(Boolean);
  return rows.length ? `<div class="compare">${rows.join('')}</div>` : '<div class="compare muted">Nessuna differenza</div>';
}

export function createGearPanel(root: HTMLElement, actions: GearActions) {
  root.innerHTML = `
    <h2 class="section">Equipaggiamento</h2>
    <div class="doll">
      <div class="doll-col" data-g="left"></div>
      <div class="doll-figure">${SILHOUETTE}</div>
      <div class="doll-col" data-g="right"></div>
    </div>
    <h2 class="section">Inventario <span class="muted" data-g="count"></span></h2>
    <div class="inv" data-g="inv"></div>
    <div class="detail" data-g="detail"></div>
    <div class="salvage-row">
      <label>Smantella in automatico
        <select data-g="auto">
          <option value="-1">nessuno</option>
          ${RARITIES.slice(0, -1).map((r, i) => `<option value="${i}">fino a ${r.name}</option>`).join('')}
        </select>
      </label>
      <button class="btn" data-g="bulk">Smantella ora</button>
      <span><b data-g="frag">0</b> <span class="muted">Frammenti</span></span>
    </div>`;

  const q = (k: string) => root.querySelector<HTMLElement>(`[data-g="${k}"]`)!;
  const refs = { left: q('left'), right: q('right'), inv: q('inv'), detail: q('detail'), count: q('count'), frag: q('frag') };
  const auto = q('auto') as HTMLSelectElement;
  let selected: Selection = null;
  let lastKey = '';
  let current: GameState | null = null;

  auto.addEventListener('change', () => actions.setAutoSalvage(Number(auto.value)));
  q('bulk').addEventListener('click', () => {
    const r = Number(auto.value);
    if (r >= 0) actions.salvageUpTo(r);
    lastKey = '';
  });

  root.addEventListener('click', (ev) => {
    const t = (ev.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!t) return;
    const { act, uid, slot } = t.dataset;
    if (act === 'pick-inv') selected = { kind: 'inv', uid: Number(uid) };
    else if (act === 'pick-slot') selected = current?.gear.equipped[slot as SlotId] ? { kind: 'slot', slot: slot as SlotId } : null;
    else if (act === 'equip') { actions.equip(Number(uid), slot as SlotId); selected = null; }
    else if (act === 'unequip') { actions.unequip(slot as SlotId); selected = null; }
    else if (act === 'salvage') { actions.salvage(Number(uid)); selected = null; }
    lastKey = '';
  });

  function renderDetail(state: GameState, gear: GearState): string {
    if (selected?.kind === 'slot') {
      const it = gear.equipped[selected.slot];
      if (!it) return '';
      const full = gear.inventory.length >= INVENTORY_SIZE;
      return `${itemDetail(it)}
        <div class="actions"><button class="btn" data-act="unequip" data-slot="${selected.slot}" ${full ? 'disabled' : ''}>Togli</button></div>`;
    }
    if (selected?.kind === 'inv') {
      const uid = selected.uid;
      const it = gear.inventory.find((x) => x.uid === uid);
      if (!it) return '';
      const slots = slotsFor(it.type);
      const cmp = slots.map((s) => {
        const name = slots.length > 1 ? `${SLOTS.find((x) => x.id === s)!.name} ${s.endsWith('1') ? 'sinistro' : 'destro'}` : 'Equipaggia';
        const worn = gear.equipped[s];
        return `<div class="cmp-block">
          <div class="muted">${worn ? `al posto di ${itemLabel(worn)}` : 'slot vuoto'}</div>
          ${compare(state, it, s)}
          <button class="btn" data-act="equip" data-uid="${uid}" data-slot="${s}">${name}</button>
        </div>`;
      }).join('');
      return `${itemDetail(it)}${cmp}
        <div class="actions"><button class="btn" data-act="salvage" data-uid="${uid}">Smantella (+${salvageValue(it)} Frammenti)</button></div>`;
    }
    return '<p class="muted">Tocca un oggetto per vederne i dettagli.</p>';
  }

  return {
    update(state: GameState) {
      current = state;
      const gear = state.gear;
      refs.frag.textContent = formatNum(state.fragments);
      // il resto del pannello si ridisegna solo quando cambia qualcosa
      const key = JSON.stringify([
        SLOTS.map((s) => gear.equipped[s.id]?.uid ?? 0),
        gear.inventory.map((i) => i.uid),
        selected,
        state.hero.level,
        state.upgrades,
      ]);
      if (key === lastKey) return;
      lastKey = key;
      if (auto.value !== String(gear.autoSalvage)) auto.value = String(gear.autoSalvage);

      const slotHtml = (id: SlotId) => {
        const it = gear.equipped[id];
        const name = SLOTS.find((s) => s.id === id)!.name;
        const sel = selected?.kind === 'slot' && selected.slot === id ? ' sel' : '';
        const border = it ? ` style="border-color:${RARITIES[it.rarity].color}"` : '';
        return `<button class="slot${sel}${it ? '' : ' empty'}" data-act="pick-slot" data-slot="${id}"${border}>
          <span class="muted">${name}</span>${it ? itemLabel(it) : '<span class="muted">—</span>'}</button>`;
      };
      refs.left.innerHTML = DOLL_LEFT.map(slotHtml).join('');
      refs.right.innerHTML = DOLL_RIGHT.map(slotHtml).join('');
      refs.count.textContent = `${gear.inventory.length} / ${INVENTORY_SIZE}`;
      refs.inv.innerHTML = gear.inventory.length
        ? gear.inventory.slice().sort((a, b) => b.rarity - a.rarity || b.ilvl - a.ilvl).map((it) => {
            const sel = selected?.kind === 'inv' && selected.uid === it.uid ? ' sel' : '';
            const type = ITEM_TYPES.find((t) => t.id === it.type)!.name;
            return `<button class="inv-item${sel}" data-act="pick-inv" data-uid="${it.uid}">${itemLabel(it)} <span class="muted">${type} · ${it.ilvl}</span></button>`;
          }).join('')
        : '<p class="muted">Vuoto: i nemici lasciano oggetti, i boss sempre.</p>';
      refs.detail.innerHTML = renderDetail(state, gear);
    },
  };
}
