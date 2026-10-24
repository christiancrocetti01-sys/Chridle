import { formatNum } from '../core/format';
import { lumoCost } from '../core/lumi';
import type { GameState } from '../core/state';
import { STAT_LABELS, type StatKey } from '../data/items';
import { LUMI, LUMO_IDLE_SHARE, type LumoId } from '../data/lumi';
import { formatStat } from './gear';
import { createExpander } from './list';

export interface LumiActions {
  activateLumo(id: LumoId): void;
  levelLumo(id: LumoId): void;
}

const modsText = (mods: [StatKey, number][], mult = 1) => mods.map(([k, v]) => `+${formatStat(k, v * mult)} ${STAT_LABELS[k]}`).join(', ');

/** Sezione Lumi della scheda Build: uno attivo (bonus pieno + effetto), gli altri al 25%. */
export function createLumiPanel(root: HTMLElement, actions: LumiActions) {
  const li = createExpander(root);
  let key = '';
  root.addEventListener('click', (ev) => {
    const t = (ev.target as HTMLElement).closest<HTMLElement>('[data-lumo]');
    if (!t) return;
    const id = t.dataset.lumo as LumoId;
    if (t.dataset.act === 'level') actions.levelLumo(id);
    else actions.activateLumo(id);
    key = '';
  });
  return {
    update(state: GameState) {
      const l = state.lumi;
      const k = JSON.stringify([l, LUMI.map((d) => l.levels[d.id] && state.essence >= lumoCost(l.levels[d.id]!))]);
      if (k === key) return;
      key = k;
      const rows = LUMI.map((d) => {
        const lv = l.levels[d.id];
        if (!lv) return '';
        const on = l.active === d.id;
        const cost = lumoCost(lv);
        return `<div class="skill-row${on ? ' on' : ''}">
          <div class="skill-head"><span><b>${d.name}</b> <span class="muted">Lv ${lv}</span></span><span class="skill-btns">
            ${on ? '<span class="via-tag">Attivo</span>' : `<button class="btn sm" data-lumo="${d.id}">Attiva</button>`}
            <button class="btn sm" data-lumo="${d.id}" data-act="level"${state.essence >= cost ? '' : ' disabled'}>Lv +1 · ${formatNum(cost)} Essenza</button></span></div>
          <div class="skill-info muted">${d.lore}</div>
          <div class="skill-info">${modsText(d.perLevel, lv * (on ? 1 : LUMO_IDLE_SHARE))}${on ? '' : ' <span class="muted">(25%, non attivo)</span>'}</div>
          <div class="skill-info${on ? ' rule' : ' muted'}">Da attivo: ${modsText(d.special)}</div>
        </div>`;
      }).join('');
      const locked = LUMI.filter((d) => !l.levels[d.id]);
      const rest = locked.length ? li.row('lu:bloccati', `<span class="muted">${locked.length} da sbloccare</span>`, '',
        locked.map((d) => `<div class="muted">??? · si sblocca: ${d.unlock.text}</div>`).join(''), 'dim') : '';
      root.innerHTML = `<h2 class="section">Lumi <span class="muted">· uno attivo, gli altri al ${Math.round(LUMO_IDLE_SHARE * 100)}%</span></h2>
        <div class="skill-list">${rows}</div>${rest}`;
    },
  };
}
