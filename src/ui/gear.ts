import { craftable } from '../core/craft';
import { formatNum } from '../core/format';
import { setCounts, type Affix, type GearState, type Item } from '../core/items';
import type { GameState } from '../core/state';
import { RULE_TEXT, SETS, SET_PIECES, UNIQUES } from '../data/uniques';
import { elem, itemIcon } from './icons';
import { ITEM_TYPES, TRIGGER_AFFIXES, affixDef, type TriggerDef, type TriggerEffect, RARITIES, SLOTS, STAT_LABELS, TAG_LABELS, POINT_STATS, isPct, type SlotId, type StatKey } from '../data/items';

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

/** Riga di crafting (automatico): quante volte il gioco ha alzato il tier degli affissi. */
function craftNote(it: Item): string {
  if (!craftable(it)) return '<div class="craft muted">Unici e pezzi di set non si modificano.</div>';
  return `<div class="craft muted">Crafting automatico: i Frammenti alzano il tier degli affissi · modifiche fatte: ${it.crafts ?? 0}</div>`;
}

export function createGearPanel(root: HTMLElement) {
  root.innerHTML = `
    <h2 class="section">Equipaggiamento</h2>
    <p class="muted">Ogni oggetto che cade si indossa da solo se aumenta la potenza; gli altri diventano Frammenti, che alzano da soli il tier degli affissi indossati.</p>
    <div class="slots" data-g="slots"></div>
    <div class="detail" data-g="detail"></div>
    <div class="salvage-row"><span><b data-g="frag">0</b> <span class="muted">Frammenti</span></span></div>`;

  const q = (k: string) => root.querySelector<HTMLElement>(`[data-g="${k}"]`)!;
  const refs = { slots: q('slots'), detail: q('detail'), frag: q('frag') };
  let selected: Selection = null;
  let lastKey = '';
  let current: GameState | null = null;

  root.addEventListener('click', (ev) => {
    const t = (ev.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!t) return;
    const { act, slot } = t.dataset;
    if (act === 'pick-slot') selected = current?.gear.equipped[slot as SlotId] ? { kind: 'slot', slot: slot as SlotId } : null;
    lastKey = '';
  });

  function renderDetail(gear: GearState): string {
    if (selected?.kind === 'slot') {
      const it = gear.equipped[selected.slot];
      if (!it) return '';
      return `${itemDetail(it, Object.values(gear.equipped) as Item[])}
        ${craftNote(it)}`;
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
        selected && gear.equipped[selected.slot]?.affixes.map((a) => a.tier),
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
      refs.detail.innerHTML = renderDetail(gear);
    },
  };
}
