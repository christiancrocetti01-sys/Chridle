import { upgradePrice, type CombatEvent } from '../core/combat';
import { formatNum } from '../core/format';
import type { GameState } from '../core/state';
import { KILLS_PER_STAGE, stateStats, xpToNext } from '../core/stats';
import { createCombatPanel } from './combat';
import { createGearPanel, type GearActions } from './gear';
import { UPGRADES, type UpgradeId } from '../data/upgrades';

export interface HudActions extends GearActions {
  buy(id: UpgradeId): void;
}

export interface Hud {
  update(state: GameState): void;
  onEvents(events: CombatEvent[]): void;
}

export function createHud(root: HTMLElement, actions: HudActions): Hud {
  root.innerHTML = `
    <header class="hud-head">
      <div>
        <h1 class="title">Chridle</h1>
        <p class="subtitle">Il Guerriero della Luce</p>
      </div>
      <div class="gold"><span data-k="gold">0</span> <small>oro</small></div>
    </header>
    <div class="row"><span>Livello <b data-k="level">1</b></span><span class="muted" data-k="xptext"></span></div>
    <div class="bar"><div class="fill" data-k="xpbar"></div></div>
    <div class="row"><span>Stage <b data-k="stage">1</b> <span class="muted" data-k="best"></span></span><span data-k="progress"></span></div>
    <div class="bar"><div class="fill" data-k="stagebar"></div></div>
    <p class="notice" data-k="notice"></p>
    <div class="combat" data-k="combat"></div>
    <h2 class="section">Potenziamenti</h2>
    <div class="upgrades">
      ${UPGRADES.map((u) => `
        <button class="card" data-up="${u.id}">
          <span class="card-name">${u.name} <span class="muted" data-lv="${u.id}"></span></span>
          <span class="card-desc">${u.description}</span>
          <span class="card-cost" data-cost="${u.id}"></span>
        </button>`).join('')}
    </div>
    <div data-k="gear"></div>
    <h2 class="section">Statistiche</h2>
    <dl class="stats" data-k="stats"></dl>
`;

  const el = (k: string) => root.querySelector<HTMLElement>(`[data-k="${k}"]`)!;
  const refs = {
    gold: el('gold'), level: el('level'), xptext: el('xptext'), xpbar: el('xpbar'),
    stage: el('stage'), best: el('best'), progress: el('progress'), stagebar: el('stagebar'),
    notice: el('notice'), stats: el('stats'),
  };

  root.querySelectorAll<HTMLButtonElement>('[data-up]').forEach((b) =>
    b.addEventListener('click', () => actions.buy(b.dataset.up as UpgradeId)),
  );

  const gear = createGearPanel(el('gear'), actions);
  const combat = createCombatPanel(el('combat'));

  let frame = 0;
  return {
    onEvents(events) {
      combat.onEvents(events);
    },
    update(state) {
      // il DOM non serve a 60 fps: ~10 aggiornamenti al secondo bastano
      if (frame++ % 6) return;
      const need = xpToNext(state.hero.level);
      refs.gold.textContent = formatNum(state.gold);
      refs.level.textContent = String(state.hero.level);
      refs.xptext.textContent = `${formatNum(state.hero.xp)} / ${formatNum(need)} XP`;
      refs.xpbar.style.width = `${(state.hero.xp / need) * 100}%`;
      refs.stage.textContent = String(state.stage.current);
      refs.best.textContent = state.stage.best > state.stage.current ? `(record ${state.stage.best})` : '';
      const bossNow = state.enemy?.boss || state.stage.kills >= KILLS_PER_STAGE;
      refs.progress.textContent = bossNow ? 'BOSS' : `${state.stage.kills} / ${KILLS_PER_STAGE}`;
      refs.progress.classList.toggle('boss', !!bossNow);
      refs.stagebar.style.width = `${Math.min(1, state.stage.kills / KILLS_PER_STAGE) * 100}%`;
      refs.notice.textContent = state.stage.auto ? '' : "Troppo forte: allenamento finché non sali di livello.";

      for (const u of UPGRADES) {
        const price = upgradePrice(state, u.id);
        root.querySelector(`[data-lv="${u.id}"]`)!.textContent = `Lv ${state.upgrades[u.id]}`;
        root.querySelector(`[data-cost="${u.id}"]`)!.textContent = `${formatNum(price)} oro`;
        root.querySelector<HTMLButtonElement>(`[data-up="${u.id}"]`)!.disabled = state.gold < price;
      }

      gear.update(state);
      combat.update(state);
      const s = stateStats(state);
      refs.stats.innerHTML = [
        ['Vita', formatNum(s.maxHp)],
        ['Attacco', formatNum(s.atk)],
        ['Difesa', formatNum(s.def)],
        ['Velocità', `${s.attackSpeed.toFixed(2)}/s`],
        ['Critico', `${(s.critChance * 100).toFixed(0)}% ×${s.critMult.toFixed(2)}`],
        ['Rigenerazione', `${formatNum(s.regen)}/s`],
        ['Uccisioni', formatNum(state.totals.kills)],
        ['Morti', String(state.totals.deaths)],
      ].map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
    },
  };
}
