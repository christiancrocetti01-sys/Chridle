import { TICK_RATE } from '../core/loop';
import { formatNum } from '../core/format';
import { canSocket, levelCost, runeValue, socketsOf, unlockCost } from '../core/runes';
import { cooldownTicks, lightCost, skillValue } from '../core/skills';
import { stateStats, type Stats } from '../core/stats';
import { RUNES, runeDef, type RuneId } from '../data/runes';
import type { GameState } from '../core/state';
import { MAX_LIGHT, SKILLS, SKILL_TAG_LABELS, skillDef, type SkillDef } from '../data/skills';
import { describeEffect } from './gear';
import { activeVie } from '../core/vie';
import { viaDef } from '../data/vie';

export interface SkillActions {
  setSkillSlot(slot: number, id: string | null): void;
  moveSkillSlot(slot: number, dir: -1 | 1): void;
  unlockRune(id: RuneId): void;
  levelRune(id: RuneId): void;
  socketRune(skill: string, i: number, id: RuneId | null): void;
}

/** Effetto, costo e ricarica (con le rune incastonate e le sinergie per tag degli oggetti). */
const info = (state: GameState, hero: Stats, d: SkillDef) => {
  const sec = cooldownTicks(state, hero, d) / TICK_RATE;
  return `${describeEffect(d.effect, skillValue(state, hero, d))} <span class="muted">· ${Math.round(lightCost(state, hero, d))} Luce · ricarica ${+sec.toFixed(1)} s · ${d.tags.map((t) => SKILL_TAG_LABELS[t]).join(', ')}</span>`;
};

/** Le 2 incastonature di una skill: una tendina con le rune sbloccate compatibili. */
function socketsHtml(state: GameState, skill: string): string {
  return `<div class="sockets">${socketsOf(state, skill).map((cur, i) => {
    const opts = RUNES.filter((r) => state.runes.levels[r.id] && (r.id === cur || canSocket(state, skill, i, r.id)))
      .map((r) => `<option value="${r.id}"${r.id === cur ? ' selected' : ''}>${r.name}</option>`).join('');
    const tip = cur ? runeDef(cur)!.text(runeValue(state, cur)) : '';
    return `<label class="socket" title="${tip}">◇ <select data-sock="${skill}" data-i="${i}"><option value="">— runa —</option>${opts}</select></label>`;
  }).join('')}</div>`;
}

/** Scheda Skill: slot in ordine di priorità con la ricarica, poi tutte le skill (sbloccate e no). */
export function createSkillPanel(root: HTMLElement, actions: SkillActions) {
  root.innerHTML = `
    <div class="row"><span>Luce</span><span class="muted" data-s="light"></span></div>
    <div class="bar light"><div class="fill" data-s="lightbar"></div></div>
    <h2 class="section">Skill attive <span class="muted">· in ordine di priorità</span></h2>
    <div class="skill-slots" data-s="slots"></div>
    <h2 class="section">Rune <span class="muted">· <span data-s="ess"></span> Essenza</span></h2>
    <div class="skill-list" data-s="runes"></div>
    <h2 class="section">Tutte le skill</h2>
    <div class="skill-list" data-s="list"></div>`;
  const q = (k: string) => root.querySelector<HTMLElement>(`[data-s="${k}"]`)!;
  const refs = { light: q('light'), lightbar: q('lightbar'), slots: q('slots'), list: q('list'), runes: q('runes'), ess: q('ess') };
  let lastKey = '';
  let runeKey = '';

  root.addEventListener('change', (ev) => {
    const t = ev.target as HTMLSelectElement;
    if (!t.dataset.sock) return;
    actions.socketRune(t.dataset.sock, Number(t.dataset.i), (t.value || null) as RuneId | null);
    lastKey = '';
  });

  root.addEventListener('click', (ev) => {
    const t = (ev.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!t) return;
    const slot = Number(t.dataset.slot);
    if (t.dataset.act === 'up') actions.moveSkillSlot(slot, -1);
    else if (t.dataset.act === 'down') actions.moveSkillSlot(slot, 1);
    else if (t.dataset.act === 'clear') actions.setSkillSlot(slot, null);
    else if (t.dataset.act === 'put') actions.setSkillSlot(slot, t.dataset.id!);
    else if (t.dataset.act === 'unlock') actions.unlockRune(t.dataset.id as RuneId);
    else if (t.dataset.act === 'level') actions.levelRune(t.dataset.id as RuneId);
    lastKey = runeKey = '';
  });

  return {
    update(state: GameState) {
      const { slots, cooldowns } = state.skills;
      refs.light.textContent = `${Math.floor(state.hero.light)} / ${MAX_LIGHT}`;
      refs.lightbar.style.width = `${(state.hero.light / MAX_LIGHT) * 100}%`;

      refs.ess.textContent = formatNum(state.essence);
      const hero = stateStats(state);
      const key = JSON.stringify([slots, state.hero.level, state.runes, hero.skillPower, hero.skillCdr, state.vie]);
      if (key !== lastKey) {
        lastKey = key;
        const n = slots.length;
        refs.slots.innerHTML = slots.map((id, i) => {
          const d = id ? skillDef(id) : undefined;
          return `<div class="skill-slot${d ? '' : ' empty'}">
            <div class="skill-head">
              <span><span class="muted">${i + 1}.</span> ${d ? `<b>${d.name}</b>` : '<span class="muted">vuoto</span>'}</span>
              ${d ? `<span class="skill-btns">
                <button class="btn sm" data-act="up" data-slot="${i}"${i ? '' : ' disabled'}>↑</button>
                <button class="btn sm" data-act="down" data-slot="${i}"${i < n - 1 ? '' : ' disabled'}>↓</button>
                <button class="btn sm" data-act="clear" data-slot="${i}">✕</button></span>` : ''}
            </div>
            ${d ? `<div class="skill-info">${info(state, hero, d)}</div>${socketsHtml(state, d.id)}<div class="bar cd"><div class="fill" data-cd="${i}"></div></div>` : ''}
          </div>`;
        }).join('');
        const vie = activeVie(state.vie);
        // le skill delle altre Vie non si mostrano: si vedono nella sezione Via della scheda Eroe
        refs.list.innerHTML = SKILLS.filter((d) => !d.via || vie.includes(d.via)).map((d) => {
          const locked = d.level > state.hero.level;
          const at = slots.indexOf(d.id);
          const via = d.via ? ` <span class="via-tag">${viaDef(d.via)!.name}</span>` : '';
          const put = locked ? `<span class="muted">Si sblocca al livello ${d.level}</span>`
            : `<span class="skill-btns"><span class="muted">${at >= 0 ? `nello slot ${at + 1}` : 'metti in'}</span>${slots
                .map((_, i) => `<button class="btn sm" data-act="put" data-slot="${i}" data-id="${d.id}"${i === at ? ' disabled' : ''}>${i + 1}</button>`)
                .join('')}</span>`;
          return `<div class="skill-row${locked ? ' locked' : ''}">
            <div class="skill-head"><span><b>${d.name}</b>${via}</span>${put}</div>
            <div class="skill-info">${info(state, hero, d)}</div>
          </div>`;
        }).join('');
      }
      // rune: si ridisegnano quando cambia cosa si può comprare, non a ogni Essenza raccolta
      const unlock = unlockCost(state);
      const rk = JSON.stringify([state.runes.levels, RUNES.map((r) => {
        const lv = state.runes.levels[r.id];
        return state.essence >= (lv ? levelCost(lv) : unlock);
      })]);
      if (rk !== runeKey) {
        runeKey = rk;
        refs.runes.innerHTML = RUNES.map((r) => {
          const lv = state.runes.levels[r.id];
          const cost = lv ? levelCost(lv) : unlock;
          const btn = `<button class="btn sm" data-act="${lv ? 'level' : 'unlock'}" data-id="${r.id}"${state.essence >= cost ? '' : ' disabled'}>${lv ? 'Potenzia' : 'Sblocca'} · ${formatNum(cost)}</button>`;
          return `<div class="skill-row${lv ? '' : ' locked-rune'}">
            <div class="skill-head"><span><b>${r.name}</b> <span class="muted">${lv ? `Lv ${lv}` : 'bloccata'}${r.damageOnly ? ' · solo skill di danno' : r.supportOnly ? ' · solo skill di supporto' : ''}</span></span>${btn}</div>
            <div class="skill-info">${r.text(runeValue(state, r.id))}</div>
          </div>`;
        }).join('');
      }
      // ricariche: la barra si riempie fino a "pronta"
      slots.forEach((id, i) => {
        const bar = refs.slots.querySelector<HTMLElement>(`[data-cd="${i}"]`);
        const d = id ? skillDef(id) : undefined;
        if (!bar || !d) return;
        const left = cooldowns[d.id] ?? 0;
        bar.style.width = `${Math.max(0, 1 - left / cooldownTicks(state, hero, d)) * 100}%`;
        bar.classList.toggle('ready', left <= 0 && state.hero.light >= lightCost(state, hero, d));
      });
    },
  };
}
