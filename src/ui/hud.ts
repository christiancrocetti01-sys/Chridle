import { upgradePrice, type CombatEvent } from '../core/combat';
import { pointsLeft } from '../core/constellations';
import { formatNum } from '../core/format';
import type { GameState } from '../core/state';
import { KILLS_PER_STAGE, elementalDamage, stateStats, xpToNext, type Stats } from '../core/stats';
import { createCombatPanel } from './combat';
import { createGearPanel, type GearActions } from './gear';
import { createSkillPanel, type SkillActions } from './skills';
import { createStarPanel, type StarActions } from './stars';
import { createViaPanel, type ViaActions } from './vie';
import { createLumiPanel, type LumiActions } from './lumi';
import { createAscensionPanel, type AscensionActions } from './ascension';
import { createWorldPanel, modeTimer, type WorldActions } from './world';
import { DUNGEON_WAVES } from '../data/modes';
import { soundOn, toggleSound } from './sound';
import { zoneName } from '../data/enemies';
import { UPGRADES, type UpgradeId } from '../data/upgrades';

export interface HudActions extends GearActions, SkillActions, StarActions, ViaActions, WorldActions, AscensionActions, LumiActions {
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
        <h1 class="title">Chridle <button class="sound" data-k="sound" title="Suoni">♪</button></h1>
        <p class="subtitle">Il Guerriero della Luce</p>
      </div>
      <div class="wallet">
        <div class="gold"><span data-k="gold">0</span> <small>oro</small></div>
        <div class="essence"><span data-k="essence">0</span> <small>Essenza</small></div>
        <div class="essence"><span data-k="keys">0</span> <small>chiavi</small></div>
      </div>
    </header>
    <div class="row"><span>Livello <b data-k="level">1</b></span><span class="muted" data-k="xptext"></span></div>
    <div class="bar"><div class="fill" data-k="xpbar"></div></div>
    <div class="row"><span>Stage <b data-k="stage">1</b> <span class="muted" data-k="best"></span></span><span data-k="progress"></span></div>
    <div class="row zone-row"><span class="muted" data-k="zone"></span></div>
    <div class="bar"><div class="fill" data-k="stagebar"></div></div>
    <p class="notice" data-k="notice"></p>
    <div class="combat" data-k="combat"></div>
    <nav class="tabs">
      <button class="tab on" data-tab="hero">Eroe</button>
      <button class="tab" data-tab="skills">Skill</button>
      <button class="tab" data-tab="stars">Stelle <span class="muted" data-k="starpts"></span></button>
      <button class="tab" data-tab="world">Mondo</button>
      <button class="tab" data-tab="ascension">Ascensione <span class="muted" data-k="asc"></span></button>
    </nav>
    <div data-pane="hero">
    <div data-k="vie"></div>
    <div data-k="lumi"></div>
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
    </div>
    <div data-pane="skills" hidden><div data-k="skills"></div></div>
    <div data-pane="stars" hidden><div data-k="stars"></div></div>
    <div data-pane="world" hidden><div data-k="world"></div></div>
    <div data-pane="ascension" hidden><div data-k="ascension"></div></div>
`;

  const el = (k: string) => root.querySelector<HTMLElement>(`[data-k="${k}"]`)!;
  const refs = {
    gold: el('gold'), level: el('level'), xptext: el('xptext'), xpbar: el('xpbar'),
    stage: el('stage'), best: el('best'), progress: el('progress'), stagebar: el('stagebar'),
    notice: el('notice'), stats: el('stats'), essence: el('essence'), starpts: el('starpts'),
    keys: el('keys'), zone: el('zone'), asc: el('asc'), sound: el('sound'),
  };

  const soundLabel = () => {
    refs.sound.classList.toggle('on', soundOn());
    refs.sound.setAttribute('aria-pressed', String(soundOn()));
  };
  soundLabel();
  refs.sound.addEventListener('click', () => {
    toggleSound();
    soundLabel();
  });

  root.querySelectorAll<HTMLButtonElement>('[data-up]').forEach((b) =>
    b.addEventListener('click', () => actions.buy(b.dataset.up as UpgradeId)),
  );

  root.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b) =>
    b.addEventListener('click', () => {
      root.querySelectorAll<HTMLElement>('[data-tab]').forEach((t) => t.classList.toggle('on', t === b));
      root.querySelectorAll<HTMLElement>('[data-pane]').forEach((p) => (p.hidden = p.dataset.pane !== b.dataset.tab));
    }),
  );

  const gear = createGearPanel(el('gear'), actions);
  const skills = createSkillPanel(el('skills'), actions);
  const stars = createStarPanel(el('stars'), actions);
  const combat = createCombatPanel(el('combat'));
  const vie = createViaPanel(el('vie'), actions);
  const lumi = createLumiPanel(el('lumi'), actions);
  const world = createWorldPanel(el('world'), actions);
  const ascension = createAscensionPanel(el('ascension'), actions);

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
      refs.essence.textContent = formatNum(state.essence);
      refs.level.textContent = String(state.hero.level);
      refs.xptext.textContent = `${formatNum(state.hero.xp)} / ${formatNum(need)} XP`;
      refs.xpbar.style.width = `${(state.hero.xp / need) * 100}%`;
      refs.stage.textContent = String(state.stage.current);
      refs.best.textContent = state.stage.best > state.stage.current ? `(record ${state.stage.best})` : '';
      const bossNow = state.enemy?.boss || state.stage.kills >= KILLS_PER_STAGE;
      refs.progress.textContent = bossNow ? 'BOSS' : `${state.stage.kills} / ${KILLS_PER_STAGE}`;
      refs.progress.classList.toggle('boss', !!bossNow);
      refs.stagebar.style.width = `${Math.min(1, state.stage.kills / KILLS_PER_STAGE) * 100}%`;
      const m = state.mode;
      refs.notice.textContent = m.kind === 'dungeon' ? `Dungeon livello ${m.level}: nemico ${Math.min(m.wave + 1, DUNGEON_WAVES + 1)} di ${DUNGEON_WAVES + 1} (la Campagna è in pausa)`
        : m.kind === 'tower' ? `Torre dell'Alba: piano ${m.floor} · ${modeTimer(state)} (record ${state.tower.best})`
        : m.kind === 'raid' ? `Raid: ${m.name} · ${modeTimer(state)}`
        : state.stage.auto ? '' : "Troppo forte: allenamento finché non sali di livello.";

      for (const u of UPGRADES) {
        const price = upgradePrice(state, u.id);
        root.querySelector(`[data-lv="${u.id}"]`)!.textContent = `Lv ${state.upgrades[u.id]}`;
        root.querySelector(`[data-cost="${u.id}"]`)!.textContent = `${formatNum(price)} oro`;
        root.querySelector<HTMLButtonElement>(`[data-up="${u.id}"]`)!.disabled = state.gold < price;
      }

      vie.update(state);
      lumi.update(state);
      world.update(state);
      ascension.update(state);
      refs.asc.textContent = state.ascension.scintille >= 1 ? `(${Math.floor(state.ascension.scintille)})` : '';
      refs.keys.textContent = String(state.keys);
      refs.zone.textContent = zoneName(state.stage.current);
      gear.update(state);
      skills.update(state);
      stars.update(state);
      const pts = pointsLeft(state);
      refs.starpts.textContent = pts > 0 ? `(${pts})` : '';
      combat.update(state);
      const s = stateStats(state);
      refs.stats.innerHTML = [
        ['Vita', formatNum(s.maxHp)],
        ['Attacco', formatNum(s.atk)],
        ['Difesa', formatNum(s.def)],
        ['Velocità', `${s.attackSpeed.toFixed(2)}/s`],
        ['Critico', `${(s.critChance * 100).toFixed(0)}% ×${s.critMult.toFixed(2)}`],
        ['Rigenerazione', `${formatNum(s.regen)}/s`],
        ...extraStats(s),
        ['Uccisioni', formatNum(state.totals.kills)],
        ['Morti', String(state.totals.deaths)],
      ].map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
    },
  };
}

const num = (v: number) => (v < 10 ? v.toFixed(1) : formatNum(v));
const pct = (v: number) => `${(v * 100).toFixed(v < 0.1 ? 1 : 0)}%`;

/** Statistiche speciali, mostrate solo se l'equipaggiamento le dà. */
function extraStats(s: Stats): string[][] {
  const rows: [number, string, string][] = [
    [elementalDamage(s), 'Elementale', `+${num(elementalDamage(s))}/colpo`],
    [s.poison, 'Veleno', `${num(s.poison)}/s`],
    [s.bleed, 'Sanguinamento', pct(s.bleed)],
    [s.lifeSteal, 'Rubavita', pct(s.lifeSteal)],
    [s.dodge, 'Schivata', pct(s.dodge)],
    [s.thorns, 'Spine', num(s.thorns)],
    [s.bossMult - 1, 'Danno ai boss', `+${pct(s.bossMult - 1)}`],
    [s.goldMult - 1, 'Oro', `+${pct(s.goldMult - 1)}`],
    [s.xpMult - 1, 'Esperienza', `+${pct(s.xpMult - 1)}`],
    [s.magicFind, 'Ritrov. magico', `+${pct(s.magicFind)}`],
  ];
  return rows.filter(([v]) => v > 0).map(([, k, v]) => [k, v]);
}
