import type { GameState } from '../core/state';
import { stateStats } from '../core/stats';
import {
  CORRUPTION_NAMES, CORRUPTION_THRESHOLD, CORRUPT_DMG, CORRUPT_TANK, PURE_DMG, PURE_TANK, corruptionState,
} from '../data/corruption';
import { STAT_LABELS } from '../data/items';
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

const pct = (v: number) => `${v < 0 ? '−' : '+'}${Math.round(Math.abs(v) * 100)}%`;

/** Riga Purezza/Corruzione: valore, effetto per punto e regole delle soglie raggiunte. */
function corruptionLine(c: number): string {
  const st = corruptionState(c);
  const dmg = c > 0 ? CORRUPT_DMG * c : PURE_DMG * c;
  const tank = c > 0 ? -CORRUPT_TANK * c : -PURE_TANK * c;
  const rules = (c >= CORRUPTION_THRESHOLD ? ['corruptShadow', ...(st === 'eclissi' ? ['eclipse'] : [])]
    : c <= -CORRUPTION_THRESHOLD ? ['overhealShield', ...(st === 'santo' ? ['sanctity'] : [])] : []) as (keyof typeof RULE_TEXT)[];
  const effect = c ? ` · ${pct(dmg)} danni, ${pct(tank)} difesa e cure` : '';
  return `<p class="corruption">Purezza/Corruzione: <b>${c > 0 ? '+' : ''}${c}</b> · ${CORRUPTION_NAMES[st]}${effect}`
    + `${rules.map((r) => `<br><span class="rule">${RULE_TEXT[r]}</span>`).join('')}`
    + `<br><span class="muted">Regole a ±${CORRUPTION_THRESHOLD} e ±100.</span></p>`;
}

/** Sezione Via della scheda Eroe: le 5 Vie con statistiche e regola. */
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
      const c = stateStats(state).corruption;
      const k = JSON.stringify([v, state.hero.level >= VIA_LEVEL, c]);
      if (k === key) return;
      key = k;
      const open = state.hero.level >= VIA_LEVEL;
      const head = `<h2 class="section">Via ${v.main ? `<span class="muted">· ${VIE.find((x) => x.id === v.main)!.name}</span>` : ''}</h2>${corruptionLine(c)}`;
      if (!open) {
        root.innerHTML = `${head}<p class="muted">Al livello ${VIA_LEVEL} scegli una Via: statistiche e una meccanica propria.</p>`;
        return;
      }
      const cards = VIE.map((d) => {
        const main = v.main === d.id;
        const second = v.second === d.id;
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
