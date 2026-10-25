import { TICK_RATE } from '../core/loop';
import { formatNum } from '../core/format';
import { levelCost, runeValue, socketsOf, unlockCost } from '../core/runes';
import { RUNE_PLAN, wantedRunes } from '../core/auto';
import { cooldownTicks, lightCost, skillLevel, skillLevelCost, skillValue } from '../core/skills';
import { stateStats, type Stats } from '../core/stats';
import { runeDef } from '../data/runes';
import type { GameState } from '../core/state';
import { MAX_LIGHT, SKILLS, SKILL_TAG_LABELS, skillDef, type SkillDef, type SkillTag } from '../data/skills';
import type { Element } from '../data/items';
import { elem } from './icons';
import { describeEffect } from './gear';
import { createExpander, lockedLine } from './list';

/** Tag di skill che sono elementi: si colorano come tali. */
const TAG_ELEMENT: Partial<Record<SkillTag, Element>> = { fuoco: 'fire', gelo: 'cold', fulmine: 'lightning', sacro: 'holy', ombra: 'shadow' };

/** Effetto, costo e ricarica (con le rune incastonate e le sinergie per tag degli oggetti). */
const info = (state: GameState, hero: Stats, d: SkillDef) => {
  const sec = cooldownTicks(hero, d) / TICK_RATE;
  return `${describeEffect(d.effect, skillValue(state, hero, d))} <span class="muted">· ${Math.round(lightCost(hero, d))} Luce · ricarica ${+sec.toFixed(1)} s · ${d.tags.map((t) => (TAG_ELEMENT[t] ? elem(TAG_ELEMENT[t]!, SKILL_TAG_LABELS[t]) : SKILL_TAG_LABELS[t])).join(', ')}</span>`;
};

/** Rune incastonate (in automatico) come testo. */
function socketsHtml(state: GameState, skill: string): string {
  return `<div class="sockets muted">${socketsOf(state, skill).map((r) => (r
    ? `<span title="${runeDef(r)!.text(runeValue(state, r))}">◇ ${runeDef(r)!.name} ${state.runes.levels[r]}</span>`
    : '<span>◇ —</span>')).join(' · ')}</div>`;
}

/** Scheda Skill: le 6 skill fisse con livello, rune e ricarica. Tutto si compra e si incastona da solo. */
export function createSkillPanel(root: HTMLElement) {
  root.innerHTML = `
    <div data-sub="skill">
    <div class="row"><span>Luce</span><span class="muted" data-s="light"></span></div>
    <div class="bar light"><div class="fill" data-s="lightbar"></div></div>
    <h2 class="section">Skill <span class="muted">· in ordine di priorità · <span data-s="ess"></span> Essenza</span></h2>
    <p class="muted">Si lanciano da sole; livelli e rune si comprano con l'Essenza, sempre il più economico. Le esplosioni usano l'elemento a cui il nemico è più debole.</p>
    <div class="skill-slots" data-s="slots"></div>
    <div data-s="list"></div>
    </div>
    <div data-sub="rune">
    <h2 class="section">Rune <span class="muted">· automatiche</span></h2>
    <div data-s="runes"></div>
    </div>`;
  const q = (k: string) => root.querySelector<HTMLElement>(`[data-s="${k}"]`)!;
  const refs = { light: q('light'), lightbar: q('lightbar'), slots: q('slots'), list: q('list'), runes: q('runes'), ess: q('ess') };
  const li = createExpander(root);
  let lastKey = '';

  return {
    update(state: GameState) {
      const { slots, cooldowns } = state.skills;
      refs.light.textContent = `${Math.floor(state.hero.light)} / ${MAX_LIGHT}`;
      refs.lightbar.style.width = `${(state.hero.light / MAX_LIGHT) * 100}%`;
      refs.ess.textContent = formatNum(state.essence);
      const hero = stateStats(state);
      const key = JSON.stringify([slots, state.skills.levels, state.hero.level, state.runes, hero.skillPower, hero.skillCdr]);
      if (key !== lastKey) {
        lastKey = key;
        refs.slots.innerHTML = slots.map((id, i) => {
          const d = id ? skillDef(id) : undefined;
          if (!d) return '';
          const bought = state.skills.levels[d.id] ?? 1;
          return `<div class="skill-slot">
            <div class="skill-head"><span><span class="muted">${i + 1}.</span> <b>${d.name}</b></span>
              <span class="muted">Lv ${skillLevel(state, d.id)} · prossimo ${formatNum(skillLevelCost(bought))}</span></div>
            <div class="skill-info">${info(state, hero, d)}</div>${socketsHtml(state, d.id)}<div class="bar cd"><div class="fill" data-cd="${i}"></div></div>
          </div>`;
        }).join('');
        const locked = SKILLS.filter((d) => d.level > state.hero.level).sort((a, b) => a.level - b.level);
        refs.list.innerHTML = lockedLine(locked.length, 'da sbloccare', locked[0] && `${locked[0].name} (liv. ${locked[0].level})`);
        const wanted = wantedRunes(state);
        refs.runes.innerHTML = wanted.map((id) => {
          const r = runeDef(id)!;
          const lv = state.runes.levels[id];
          return li.row(`ru:${id}`, `<b>${r.name}</b>`, lv ? `Lv ${lv} · prossimo ${formatNum(levelCost(lv))}` : `da sbloccare · ${formatNum(unlockCost(state))}`,
            `<div>${r.text(runeValue(state, id))}</div><div class="muted">in: ${slots.filter((s) => s && RUNE_PLAN[s]?.includes(id)).map((s) => skillDef(s!)!.name).join(', ')}</div>`);
        }).join('') || '<p class="muted">Le rune arrivano con le skill.</p>';
      }
      // ricariche: la barra si riempie fino a "pronta"
      slots.forEach((id, i) => {
        const bar = refs.slots.querySelector<HTMLElement>(`[data-cd="${i}"]`);
        const d = id ? skillDef(id) : undefined;
        if (!bar || !d) return;
        const left = cooldowns[d.id] ?? 0;
        bar.style.width = `${Math.max(0, 1 - left / cooldownTicks(hero, d)) * 100}%`;
        bar.classList.toggle('ready', left <= 0 && state.hero.light >= lightCost(hero, d));
      });
    },
  };
}
