import { TICK_RATE } from '../core/loop';
import type { GameState } from '../core/state';
import { MAX_LIGHT, SKILLS, SKILL_TAG_LABELS, skillDef, type SkillDef } from '../data/skills';
import { describeEffect } from './gear';

export interface SkillActions {
  setSkillSlot(slot: number, id: string | null): void;
  moveSkillSlot(slot: number, dir: -1 | 1): void;
}

const info = (d: SkillDef) =>
  `${describeEffect(d.effect, d.effect.value)} <span class="muted">· ${d.light} Luce · ricarica ${d.cooldown} s · ${d.tags.map((t) => SKILL_TAG_LABELS[t]).join(', ')}</span>`;

/** Scheda Skill: slot in ordine di priorità con la ricarica, poi tutte le skill (sbloccate e no). */
export function createSkillPanel(root: HTMLElement, actions: SkillActions) {
  root.innerHTML = `
    <div class="row"><span>Luce</span><span class="muted" data-s="light"></span></div>
    <div class="bar light"><div class="fill" data-s="lightbar"></div></div>
    <h2 class="section">Skill attive <span class="muted">· in ordine di priorità</span></h2>
    <div class="skill-slots" data-s="slots"></div>
    <h2 class="section">Tutte le skill</h2>
    <div class="skill-list" data-s="list"></div>`;
  const q = (k: string) => root.querySelector<HTMLElement>(`[data-s="${k}"]`)!;
  const refs = { light: q('light'), lightbar: q('lightbar'), slots: q('slots'), list: q('list') };
  let lastKey = '';

  root.addEventListener('click', (ev) => {
    const t = (ev.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!t) return;
    const slot = Number(t.dataset.slot);
    if (t.dataset.act === 'up') actions.moveSkillSlot(slot, -1);
    else if (t.dataset.act === 'down') actions.moveSkillSlot(slot, 1);
    else if (t.dataset.act === 'clear') actions.setSkillSlot(slot, null);
    else if (t.dataset.act === 'put') actions.setSkillSlot(slot, t.dataset.id!);
    lastKey = '';
  });

  return {
    update(state: GameState) {
      const { slots, cooldowns } = state.skills;
      refs.light.textContent = `${Math.floor(state.hero.light)} / ${MAX_LIGHT}`;
      refs.lightbar.style.width = `${(state.hero.light / MAX_LIGHT) * 100}%`;

      const key = JSON.stringify([slots, state.hero.level]);
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
            ${d ? `<div class="skill-info">${info(d)}</div><div class="bar cd"><div class="fill" data-cd="${i}"></div></div>` : ''}
          </div>`;
        }).join('');
        refs.list.innerHTML = SKILLS.map((d) => {
          const locked = d.level > state.hero.level;
          const at = slots.indexOf(d.id);
          const put = locked ? `<span class="muted">Si sblocca al livello ${d.level}</span>`
            : `<span class="skill-btns"><span class="muted">${at >= 0 ? `nello slot ${at + 1}` : 'metti in'}</span>${slots
                .map((_, i) => `<button class="btn sm" data-act="put" data-slot="${i}" data-id="${d.id}"${i === at ? ' disabled' : ''}>${i + 1}</button>`)
                .join('')}</span>`;
          return `<div class="skill-row${locked ? ' locked' : ''}">
            <div class="skill-head"><b>${d.name}</b>${put}</div>
            <div class="skill-info">${info(d)}</div>
          </div>`;
        }).join('');
      }
      // ricariche: la barra si riempie fino a "pronta"
      slots.forEach((id, i) => {
        const bar = refs.slots.querySelector<HTMLElement>(`[data-cd="${i}"]`);
        const d = id ? skillDef(id) : undefined;
        if (!bar || !d) return;
        const left = cooldowns[d.id] ?? 0;
        bar.style.width = `${(1 - left / (d.cooldown * TICK_RATE)) * 100}%`;
        bar.classList.toggle('ready', left <= 0 && state.hero.light >= d.light);
      });
    },
  };
}
