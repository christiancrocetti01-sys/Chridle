import type { GameState } from '../core/state';
import { STAT_LABELS } from '../data/items';
import { SKILLS } from '../data/skills';
import { RULE_TEXT } from '../data/uniques';
import { SECOND_VIA_SHARE, VIA_LEVEL, VIE, type ViaDef, type ViaId } from '../data/vie';
import { formatStat } from './gear';

export interface ViaActions {
  chooseVia(id: ViaId): void;
  chooseSecondVia(id: ViaId | null): void;
}

const BRANCH_TEXT = { offesa: 'Offesa', difesa: 'Difesa', luce: 'Luce' };

function modsText(d: ViaDef, share = 1): string {
  return d.mods.map(([stat, v]) => `${v < 0 ? '−' : '+'}${formatStat(stat, Math.abs(v * share))} ${STAT_LABELS[stat]}`).join(' · ');
}

/** Sezione Via della scheda Eroe: le 5 Vie con statistiche, regola e skill proprie. */
export function createViaPanel(root: HTMLElement, actions: ViaActions) {
  let key = '';
  root.addEventListener('click', (ev) => {
    const t = (ev.target as HTMLElement).closest<HTMLElement>('[data-via]');
    if (!t) return;
    if (t.dataset.slot === '2') actions.chooseSecondVia((t.dataset.via || null) as ViaId | null);
    else actions.chooseVia(t.dataset.via as ViaId);
    key = '';
  });
  return {
    update(state: GameState) {
      const v = state.vie;
      const k = JSON.stringify([v, state.hero.level >= VIA_LEVEL]);
      if (k === key) return;
      key = k;
      const open = state.hero.level >= VIA_LEVEL;
      const head = `<h2 class="section">Via ${v.main ? `<span class="muted">· ${VIE.find((x) => x.id === v.main)!.name}</span>` : ''}</h2>`;
      if (!open) {
        root.innerHTML = `${head}<p class="muted">Al livello ${VIA_LEVEL} scegli una Via: statistiche, una meccanica propria e 2 skill esclusive.</p>`;
        return;
      }
      const cards = VIE.map((d) => {
        const main = v.main === d.id;
        const second = v.second === d.id;
        const skills = SKILLS.filter((s) => s.via === d.id).map((s) => `${s.name} <span class="muted">(Lv ${s.level})</span>`).join(', ');
        const btns = [
          main ? '<span class="via-tag">Via principale</span>'
            : `<button class="btn sm" data-via="${d.id}">${v.main ? 'Cambia in questa' : 'Scegli'}</button>`,
          v.secondUnlocked && v.main && !main
            ? (second ? `<button class="btn sm" data-via="" data-slot="2">Togli seconda</button>`
              : `<button class="btn sm" data-via="${d.id}" data-slot="2">Seconda Via</button>`) : '',
        ].join('');
        return `<div class="skill-row via${main ? ' on' : second ? ' second' : ''}">
          <div class="skill-head"><b>${d.name}</b><span class="skill-btns">${btns}</span></div>
          <div class="skill-info muted">${d.fantasy} Ramo affine: ${BRANCH_TEXT[d.branch]}.</div>
          <div class="skill-info">${modsText(d, second ? SECOND_VIA_SHARE : 1)}</div>
          <div class="skill-info rule">${RULE_TEXT[d.rule]}</div>
          <div class="skill-info">Skill: ${skills}</div>
        </div>`;
      }).join('');
      const note = v.secondUnlocked ? `<p class="muted">Seconda Via: ${Math.round(SECOND_VIA_SHARE * 100)}% delle statistiche, regola e skill intere.</p>`
        : '<p class="muted">Cambiare Via è gratis. Con l’Ascensione si sblocca una seconda Via (ibrido).</p>';
      root.innerHTML = v.main
        ? `${head}<details class="via-more"><summary class="muted">Mostra le Vie</summary>${note}<div class="skill-list">${cards}</div></details>`
        : `${head}${note}<div class="skill-list">${cards}</div>`;
    },
  };
}
