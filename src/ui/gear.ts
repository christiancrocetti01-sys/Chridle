import {
  MAX_TIER, canFuse, canReroll, canTransfer, canUpgrade, craftable, fuseCost, fusePartners, rerollCost,
  transferCost, upgradeCost,
} from '../core/craft';
import { formatNum } from '../core/format';
import { setCounts, type Affix, type GearState, type Item } from '../core/items';
import type { GameState } from '../core/state';
import { RULE_TEXT, SETS, SET_PIECES, UNIQUES } from '../data/uniques';
import { FUSE_COUNT, FUSE_MAX_RARITY } from '../data/craft';
import { elem, itemIcon } from './icons';
import { ITEM_TYPES, TRIGGER_AFFIXES, affixDef, type TriggerDef, type TriggerEffect, RARITIES, SLOTS, STAT_LABELS, TAG_LABELS, POINT_STATS, isPct, type SlotId, type StatKey } from '../data/items';

export interface GearActions {
  reroll(uid: number, i: number): void;
  upgrade(uid: number, i: number): void;
  transfer(uid: number, i: number, donorUid: number, j: number): void;
  fuse(uids: number[]): void;
}

type Selection = { kind: 'slot'; slot: SlotId } | null;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&${({ '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot' })[c]};`);

export function formatStat(stat: StatKey, v: number): string {
  if (isPct(stat)) return `${(v * 100).toFixed(v < 0.1 ? 1 : 0)}%`;
  if (POINT_STATS.has(stat)) return String(Math.round(v));
  return v < 10 ? v.toFixed(1) : formatNum(v);
}

const UNIQUE_COLOR = '#e6b85c';
const SET_COLOR = '#3ecf8e';

function itemLabel(it: Item): string {
  const color = it.special?.kind === 'unique' ? UNIQUE_COLOR : it.special?.kind === 'set' ? SET_COLOR : RARITIES[it.rarity].color;
  return `<span class="rar-${it.rarity}" style="color:${color}">${esc(it.name)}</span>`;
}

/** Effetto fisso di un unico, oppure bonus del set con i pezzi indossati (attivi evidenziati). */
function specialDetail(it: Item, equipped: Item[]): string {
  const sp = it.special;
  if (!sp) return '';
  const mods = sp.mods.map((m) => `<li>+${formatStat(m.stat, m.value)} ${STAT_LABELS[m.stat]}</li>`).join('');
  if (sp.kind === 'unique') {
    const u = UNIQUES.find((x) => x.id === sp.id)!;
    return `<ul class="affixes unique">${mods}<li class="trigger">${RULE_TEXT[u.rule]}</li></ul>`;
  }
  const set = SETS.find((x) => x.id === sp.id)!;
  const n = setCounts(equipped)[set.id] ?? 0;
  const statText = (list: [StatKey, number][]) => list.map(([k, v]) => `+${formatStat(k, v)} ${STAT_LABELS[k]}`).join(' · ');
  const trig: TriggerDef = { ...set.bonus4, id: '', name: '', tags: [], types: [] };
  const rows: [number, string][] = [
    [2, statText(set.bonus2)],
    [4, describeTrigger(trig, trig.effect.value)],
    [SET_PIECES, `${RULE_TEXT[set.bonus6.rule]} · ${statText(set.bonus6.mods)}`],
  ];
  return `
    <div class="set-title">Set ${set.name} <span class="muted">${n}/${SET_PIECES} indossati</span></div>
    <ul class="affixes set">${rows.map(([k, text]) => `<li class="${n >= k ? 'set-on' : 'muted'}">(${k}) ${text}</li>`).join('')}</ul>`;
}

const ON_TEXT: Record<TriggerDef['on'], string> = {
  crit: 'Al critico', everyN: 'Ogni {n} colpi', kill: "All'uccisione", struck: 'Quando vieni colpito', dodge: 'Quando schivi',
};
const ELEMENT_TEXT = { fire: 'fuoco', cold: 'gelo', lightning: 'fulmine', holy: 'luce sacra', shadow: 'ombra' };
const pct = (v: number) => `${Math.round(v * 100)}%`;

/** "Al critico: esplosione di fuoco (120% dell'attacco)". */
export function describeTrigger(t: TriggerDef, value: number): string {
  return `${ON_TEXT[t.on].replace('{n}', String(t.n))}: ${describeEffect(t.effect, value)}`;
}

/** "esplosione di fuoco (120% dell'attacco)". */
export function describeEffect(e: TriggerEffect, value: number): string {
  return e.kind === 'burst' ? `esplosione di ${elem(e.element, ELEMENT_TEXT[e.element])} (${pct(value)} dell'attacco)`
    : e.kind === 'bleed' ? `sanguinamento (${pct(value)} dell'attacco)`
    : e.kind === 'poison' ? `veleno (${pct(value)} dell'attacco)`
    : e.kind === 'heal' ? `cura ${pct(value)} della vita`
    : e.kind === 'shield' ? `scudo pari al ${pct(value)} della vita`
    : e.kind === 'haste' ? `+${pct(value)} velocità d'attacco per ${e.seconds} s`
    : '';
}

function affixText(a: Affix): string {
  const trig = a.power ? TRIGGER_AFFIXES.find((d) => d.id === a.id) : undefined;
  return trig
    ? `<span class="trigger">${describeTrigger(trig, trig.effect.value * a.power!)}</span>`
    : a.mods.map((m) => `+${formatStat(m.stat, m.value)} ${STAT_LABELS[m.stat]}`).join(' · ');
}

function itemDetail(it: Item, equipped: Item[]): string {
  const r = RARITIES[it.rarity];
  const type = ITEM_TYPES.find((t) => t.id === it.type)!;
  const lines = it.affixes.map((a) => {
    const text = affixText(a);
    const tags = affixDef(a.id)?.tags.map((t) => TAG_LABELS[t]).join(', ') ?? '';
    return `<li>${text} <span class="muted">T${a.tier}${tags ? ` · ${tags}` : ''}</span></li>`;
  });
  return `
    <div class="item-name">${itemLabel(it)}</div>
    <div class="muted">${it.special?.kind === 'unique' ? 'Unico · ' : ''}${r.name} · ${type.name} · Lv oggetto ${it.ilvl}</div>
    <div class="item-base">+${formatStat(it.base.stat, it.base.value)} ${STAT_LABELS[it.base.stat]}</div>
    ${specialDetail(it, equipped)}
    <ul class="affixes">${lines.join('')}</ul>`;
}

/** Affisso scelto da un donatore per il trasferimento, come "uidDonatore:indice". */
type Pick = string;

/** Pannello di crafting di un oggetto (indossato o nell'inventario). */
function craftPanel(state: GameState, it: Item, pick: Pick): string {
  if (!craftable(it)) return '<div class="craft muted">Unici e pezzi di set non si modificano.</div>';
  const gear = state.gear;
  const [donorUid, j] = pick.split(':').map(Number);
  const donor = pick ? gear.inventory.find((x) => x.uid === donorUid) : undefined;
  const dis = (ok: boolean) => (ok ? '' : ' disabled');
  const rows = it.affixes.map((a, i) => {
    const up = a.tier < MAX_TIER
      ? `<button class="btn sm" data-act="upgrade" data-uid="${it.uid}" data-i="${i}"${dis(canUpgrade(state, it, i))}>T${a.tier + 1} · ${upgradeCost(it, i)}</button>`
      : '';
    const tr = donor
      ? `<button class="btn sm" data-act="transfer" data-uid="${it.uid}" data-i="${i}"${dis(canTransfer(state, it, i, donor, j))}>Sostituisci · ${transferCost(it)}</button>`
      : '';
    return `<li><span>${affixText(a)} <span class="muted">T${a.tier}</span></span>
      <span class="craft-btns"><button class="btn sm" data-act="reroll" data-uid="${it.uid}" data-i="${i}"${dis(canReroll(state, it, i))}>Ritira · ${rerollCost(it)}</button>${up}${tr}</span></li>`;
  });
  const donors = gear.inventory.filter((x) => x !== it && x.type === it.type && craftable(x) && x.affixes.length);
  const options = donors.flatMap((d) => d.affixes.map((a, k) =>
    `<option value="${d.uid}:${k}"${pick === `${d.uid}:${k}` ? ' selected' : ''}>${esc(d.name)} (${d.ilvl}): ${affixText(a).replace(/<[^>]+>/g, '')} T${a.tier}</option>`));
  const transfer = options.length
    ? `<label class="craft-pick">Trasferisci da <select data-g="pick"><option value="">—</option>${options.join('')}</select></label>
       ${donor ? '<div class="muted">Scegli l’affisso da sostituire: il donatore viene distrutto.</div>' : ''}`
    : '';
  let fuse = '';
  const inInv = gear.inventory.includes(it);
  if (inInv && it.rarity < FUSE_MAX_RARITY) {
    const set = [it, ...fusePartners(gear, it).slice(0, FUSE_COUNT - 1)];
    const next = RARITIES[it.rarity + 1];
    fuse = set.length === FUSE_COUNT
      ? `<button class="btn sm" data-act="fuse" data-uids="${set.map((x) => x.uid).join(',')}"${dis(canFuse(state, set))}>Fondi con ${set.slice(1).map((x) => esc(x.name)).join(' e ')} → ${next.name} · ${fuseCost(set)}</button>`
      : `<span class="muted">Fusione: servono ${FUSE_COUNT} oggetti ${RARITIES[it.rarity].name} di questo tipo (hai ${set.length}).</span>`;
  }
  return `<div class="craft">
    <div class="craft-title">Crafting <span class="muted">· modifiche fatte: ${it.crafts ?? 0} · costi in Frammenti</span></div>
    ${rows.length ? `<ul class="craft-list">${rows.join('')}</ul>` : ''}
    ${transfer}
    ${fuse ? `<div class="craft-fuse">${fuse}</div>` : ''}
  </div>`;
}

export function createGearPanel(root: HTMLElement, actions: GearActions) {
  root.innerHTML = `
    <h2 class="section">Equipaggiamento</h2>
    <p class="muted">Ogni oggetto che cade si indossa da solo se aumenta la potenza; gli altri diventano Frammenti.</p>
    <div class="slots" data-g="slots"></div>
    <div class="detail" data-g="detail"></div>
    <div class="salvage-row"><span><b data-g="frag">0</b> <span class="muted">Frammenti</span></span></div>`;

  const q = (k: string) => root.querySelector<HTMLElement>(`[data-g="${k}"]`)!;
  const refs = { slots: q('slots'), detail: q('detail'), frag: q('frag') };
  let selected: Selection = null;
  let lastKey = '';
  let current: GameState | null = null;
  let pick: Pick = '';

  root.addEventListener('change', (ev) => {
    const t = ev.target as HTMLSelectElement;
    if (t.dataset.g !== 'pick') return;
    pick = t.value;
    lastKey = '';
  });

  root.addEventListener('click', (ev) => {
    const t = (ev.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!t) return;
    const { act, uid, slot, i } = t.dataset;
    const prev = JSON.stringify(selected);
    if (act === 'reroll') actions.reroll(Number(uid), Number(i));
    else if (act === 'upgrade') actions.upgrade(Number(uid), Number(i));
    else if (act === 'transfer') {
      const [d, j] = pick.split(':').map(Number);
      actions.transfer(Number(uid), Number(i), d, j);
      pick = '';
    } else if (act === 'fuse') {
      actions.fuse(t.dataset.uids!.split(',').map(Number));
      selected = null;
    } else if (act === 'pick-slot') selected = current?.gear.equipped[slot as SlotId] ? { kind: 'slot', slot: slot as SlotId } : null;
    if (JSON.stringify(selected) !== prev) pick = '';
    lastKey = '';
  });

  function renderDetail(state: GameState, gear: GearState): string {
    if (selected?.kind === 'slot') {
      const it = gear.equipped[selected.slot];
      if (!it) return '';
      return `${itemDetail(it, Object.values(gear.equipped) as Item[])}
        ${craftPanel(state, it, pick)}`;
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
        selected,
        pick,
        state.fragments,
        state.hero.level,
        state.upgrades,
      ]);
      if (key === lastKey) return;
      lastKey = key;

      // slot come righe di testo: "Arma ······ Mazza dei Santi 10"
      refs.slots.innerHTML = SLOTS.map(({ id, name }) => {
        const it = gear.equipped[id];
        const sel = selected?.kind === 'slot' && selected.slot === id ? ' sel' : '';
        return `<button class="slot-row${sel}${it ? '' : ' empty'}" data-act="pick-slot" data-slot="${id}">
          <span class="slot-name">${name}</span><span class="dots"></span>${it
            ? `<span class="slot-item" style="color:${RARITIES[it.rarity].color}">${itemIcon(it.type)}${itemLabel(it)}</span><span class="slot-lv">${it.ilvl}</span>`
            : '<span class="muted">—</span>'}</button>`;
      }).join('');
      refs.detail.innerHTML = renderDetail(state, gear);
    },
  };
}
