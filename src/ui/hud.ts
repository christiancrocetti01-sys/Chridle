import { upgradePrice, type CombatEvent } from '../core/combat';
import { formatNum } from '../core/format';
import type { GameState } from '../core/state';
import { KILLS_PER_STAGE, elementalDamage, stateStats, xpToNext, type Stats } from '../core/stats';
import { createCombatPanel } from './combat';
import { createGearPanel } from './gear';
import { createSkillPanel } from './skills';
import { createStarPanel } from './stars';
import { ensureArtDefs } from './art';
import { createViaPanel, type ViaActions } from './vie';
import { createLumiPanel } from './lumi';
import { createAscensionPanel, type AscensionActions } from './ascension';
import { createWorldPanel, modeTimer, type WorldActions } from './world';
import { createProgressPanel } from './progress';
import { canAscend, scintilleGain } from '../core/ascension';
import { canRebirth } from '../core/endgame';
import { DUNGEON_WAVES } from '../data/modes';
import { ABYSS_WAVES } from '../data/endgame';
import { soundOn, toggleSound } from './sound';
import { zoneName } from '../data/enemies';
import { UPGRADES } from '../data/upgrades';
import { openGuide } from './guide';

export type HudActions = ViaActions & WorldActions & AscensionActions;

export interface Hud {
  update(state: GameState): void;
  onEvents(events: CombatEvent[]): void;
}

type Sub = [id: string, name: string];
interface TabDef { id: string; name: string; icon: string; subs: Sub[] }

const NAV_ICON = (d: string) => `<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><path d="${d}"/></svg>`;

/** Schede principali (barra in basso, a portata di pollice) e sotto-schede: una cosa per schermata. */
const TABS: TabDef[] = [
  { id: 'battle', name: 'Battaglia', icon: 'M4 18 L17 5 M17 5 V9 M17 5 H13 M18 18 L5 5 M5 5 V9 M5 5 H9', subs: [] },
  { id: 'hero', name: 'Eroe', icon: 'M5 19 V10 A6 6 0 0 1 17 10 V19 Z M5 12 H17 M11 12 V17', subs: [
    ['oggetti', 'Oggetti'], ['skill', 'Skill'], ['rune', 'Rune'], ['stelle', 'Stelle'], ['via', 'Via'], ['lumi', 'Lumi'], ['statistiche', 'Statistiche'],
  ] },
  { id: 'world', name: 'Mondo', icon: 'M7 20 V6 L11 2 L15 6 V20 Z M9 9 H13 M9 13 H13 M3 20 H19', subs: [] },
  { id: 'ascension', name: 'Rituali', icon: 'M11 7 A4 4 0 1 0 11.01 7 Z M11 2 V5 M11 17 V20 M2 11 H5 M17 11 H20 M4.6 4.6 L6.7 6.7 M15.3 15.3 L17.4 17.4 M4.6 17.4 L6.7 15.3 M15.3 6.7 L17.4 4.6',
    subs: [] },
  { id: 'progress', name: 'Codex', icon: 'M11 5 C8 3 5 3 3 4 V18 C5 17 8 17 11 19 C14 17 17 17 19 18 V4 C17 3 14 3 11 5 Z M11 5 V19',
    subs: [['bestiario', 'Bestiario'], ['collezione', 'Collezione'], ['imprese', 'Imprese']] },
];

const UI_KEY = 'chridle.ui';

interface UiPrefs { tab: string; subs: Record<string, string> }

function loadPrefs(): UiPrefs {
  const def: UiPrefs = { tab: 'battle', subs: Object.fromEntries(TABS.map((t) => [t.id, t.subs[0]?.[0] ?? ''])) };
  try {
    const p = JSON.parse(localStorage.getItem(UI_KEY) ?? 'null') as Partial<UiPrefs> | null;
    if (p && TABS.some((t) => t.id === p.tab)) def.tab = p.tab!;
    for (const t of TABS) if (t.subs.some(([id]) => id === p?.subs?.[t.id])) def.subs[t.id] = p!.subs![t.id];
  } catch { /* preferenze non leggibili: si usano quelle di base */ }
  return def;
}

function savePrefs(p: UiPrefs) {
  try { localStorage.setItem(UI_KEY, JSON.stringify(p)); } catch { /* storage bloccato */ }
}

/** Mostra solo la sotto-scheda scelta: il pane porta data-view, i blocchi data-sub (sopravvive ai ridisegni). */
const SUB_CSS = `[data-view] [data-sub]{display:none}` +
  TABS.flatMap((t) => t.subs).map(([id]) => `[data-view="${id}"] [data-sub="${id}"]{display:block}`).join('');

const COIN = (stroke: string, d: string) => `<svg class="coin" viewBox="0 0 12 12" aria-hidden="true"><path d="${d}" stroke="${stroke}"/></svg>`;

export function createHud(root: HTMLElement, actions: HudActions): Hud {
  ensureArtDefs();
  const prefs = loadPrefs();
  root.innerHTML = `
    <style>${SUB_CSS}</style>
    <header class="top">
      <div class="wallet">
        <span title="Oro">${COIN('#D4AA4F', 'M6 1 A5 5 0 1 0 6.01 1 Z')}<b data-k="gold">0</b></span>
        <span title="Essenza">${COIN('#A97BD8', 'M6 1 L10 6 L6 11 L2 6 Z')}<b data-k="essence">0</b></span>
        <span title="Chiavi">${COIN('#ECE6D6', 'M4 3.5 A2.5 2.5 0 1 0 4.01 3.5 Z M6.5 6 H11.5 M9.5 6 V8.5')}<b data-k="keys">0</b></span>
      </div>
      <span class="top-stage" data-k="topstage"></span>
      <div class="menu">
        <button class="icon-btn" data-k="menu" aria-label="Menu: suoni e guida" aria-expanded="false">${NAV_ICON('M3 6 H17 M3 10 H17 M3 14 H17')}</button>
        <div class="menu-pop" data-k="menupop" hidden>
          <button class="menu-item" data-k="sound">Suoni</button>
          <button class="menu-item" data-k="help">Guida</button>
        </div>
      </div>
    </header>
    <div class="pane" data-pane="battle">
      <div class="where">
        <div class="row"><span class="label" data-k="zone"></span><span>Stage <b data-k="stage">1</b> <span class="muted" data-k="best"></span></span></div>
        <div class="pips" data-k="pips">${'<i></i>'.repeat(KILLS_PER_STAGE)}</div>
      </div>
      <div class="combat" data-k="combat"></div>
      <div class="xp-row muted"><span>Livello <b data-k="level">1</b></span><span data-k="xptext"></span></div>
      <div class="bar xp"><div class="fill" data-k="xpbar"></div></div>
      <div class="notice-row"><p class="notice" data-k="notice"></p><button class="btn sm" data-k="leave" hidden>Abbandona</button></div>
      <button class="todo" data-k="todo" hidden></button>
    </div>
    <div class="pane" data-pane="hero">
      <div class="page-head"><h1 class="page-title">Eroe</h1><span class="muted" data-k="herosub"></span></div>
      <div data-sub="oggetti">
        <div class="kpis" data-k="kpis"></div>
        <div data-k="gear"></div>
      </div>
      <div data-k="skills"></div>
      <div data-sub="stelle"><div data-k="stars"></div></div>
      <div data-sub="via"><div data-k="vie"></div></div>
      <div data-sub="lumi"><div data-k="lumi"></div></div>
      <div data-sub="statistiche">
        <h2 class="section">Statistiche</h2>
        <dl class="stats" data-k="stats"></dl>
        <h2 class="section">Potenziamenti <span class="muted">· l'oro compra da solo il più economico</span></h2>
        <div class="upgrades">
          ${UPGRADES.map((u) => `
            <div class="card" data-up="${u.id}">
              <span class="card-name">${u.name} <span class="muted" data-lv="${u.id}"></span></span>
              <span class="card-desc">${u.description}</span>
              <span class="card-cost" data-cost="${u.id}"></span>
            </div>`).join('')}
        </div>
      </div>
    </div>
    <div class="pane" data-pane="world"><div class="page-head"><h1 class="page-title">Mondo</h1></div><div data-k="world"></div></div>
    <div class="pane" data-pane="ascension"><div class="page-head"><h1 class="page-title">Rituali</h1></div><div data-k="ascension"></div></div>
    <div class="pane" data-pane="progress"><div class="page-head"><h1 class="page-title">Codex</h1></div><div data-k="progress-panel"></div></div>
    <nav class="tabs">
      ${TABS.map((t) => `<button class="tab" data-tab="${t.id}">${NAV_ICON(t.icon)}${t.name}<span class="badge" data-badge="${t.id}"></span></button>`).join('')}
    </nav>
`;
  // le sotto-schede stanno sotto il titolo di ogni pane
  root.querySelectorAll<HTMLElement>('.page-head').forEach((h) => h.insertAdjacentHTML('afterend', '<nav class="subtabs" role="tablist"></nav>'));

  const el = (k: string) => root.querySelector<HTMLElement>(`[data-k="${k}"]`)!;
  const refs = {
    gold: el('gold'), level: el('level'), xptext: el('xptext'), xpbar: el('xpbar'),
    stage: el('stage'), best: el('best'),
    notice: el('notice'), stats: el('stats'), essence: el('essence'), pips: el('pips'),
    keys: el('keys'), zone: el('zone'), sound: el('sound'), leave: el('leave'), todo: el('todo'),
    topstage: el('topstage'), kpis: el('kpis'), herosub: el('herosub'), menu: el('menu'), menupop: el('menupop'),
  };

  const soundLabel = () => {
    refs.sound.textContent = `Suoni: ${soundOn() ? 'sì' : 'no'}`;
    refs.sound.setAttribute('aria-pressed', String(soundOn()));
  };
  soundLabel();
  const menu = (open: boolean) => {
    refs.menupop.hidden = !open;
    refs.menu.setAttribute('aria-expanded', String(open));
  };
  refs.menu.addEventListener('click', (ev) => {
    ev.stopPropagation();
    menu(refs.menupop.hidden);
  });
  document.addEventListener('click', (ev) => {
    if (!refs.menupop.hidden && !(ev.target as HTMLElement).closest('.menu-pop')) menu(false);
  });
  refs.sound.addEventListener('click', () => {
    toggleSound();
    soundLabel();
  });
  refs.leave.addEventListener('click', () => actions.leaveMode());
  el('help').addEventListener('click', () => {
    menu(false);
    openGuide();
  });
  refs.todo.addEventListener('click', () => {
    show('ascension');
    window.scrollTo({ top: 0 });
  });

  /** Schede: mostra il pane scelto, ridisegna le sotto-schede e ricorda la scelta. */
  function show(tab: string, sub = prefs.subs[tab]) {
    prefs.tab = tab;
    prefs.subs[tab] = sub;
    savePrefs(prefs);
    root.dataset.tabOn = tab;
    root.querySelectorAll<HTMLElement>('[data-tab]').forEach((t) => t.classList.toggle('on', t.dataset.tab === tab));
    root.querySelectorAll<HTMLElement>('[data-pane]').forEach((p) => {
      p.hidden = p.dataset.pane !== tab;
      p.dataset.view = prefs.subs[p.dataset.pane!];
    });
    const def = TABS.find((t) => t.id === tab)!;
    const nav = root.querySelector<HTMLElement>(`[data-pane="${tab}"] .subtabs`);
    if (nav) nav.innerHTML = def.subs.map(([id, name]) =>
      `<button class="subtab${id === sub ? ' on' : ''}" role="tab" aria-selected="${id === sub}" data-subtab="${id}">${name}<span class="badge" data-badge="${id}"></span></button>`).join('');
    badgeKey = '';
  }
  root.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b) =>
    b.addEventListener('click', () => {
      show(b.dataset.tab!);
      window.scrollTo({ top: 0 });
    }),
  );
  root.addEventListener('click', (ev) => {
    const b = (ev.target as HTMLElement).closest<HTMLElement>('[data-subtab]');
    if (b) show(prefs.tab, b.dataset.subtab);
  });

  /** Pallini sulle schede: qualcosa da fare (Ascensione o Rinascita pronta). */
  let badgeKey = '';
  function badges(state: GameState) {
    const asc = canAscend(state) && scintilleGain(state) > 0;
    const sun = canRebirth(state);
    const b: Record<string, string> = {
      ascension: asc || sun ? '•' : '',
    };
    const k = JSON.stringify(b);
    if (k === badgeKey) return;
    badgeKey = k;
    root.querySelectorAll<HTMLElement>('[data-badge]').forEach((x) => (x.textContent = b[x.dataset.badge!] ?? ''));
  }

  /** L'unica cosa che chiede una decisione, in fondo alla Battaglia: Ascensione o Rinascita pronta. */
  let todoKey = '';
  function todo(state: GameState) {
    const sun = canRebirth(state);
    const gain = canAscend(state) ? scintilleGain(state) : 0;
    const k = sun ? 'sun' : gain > 0 ? `asc${gain}` : '';
    if (k === todoKey) return;
    todoKey = k;
    refs.todo.hidden = !k;
    refs.todo.innerHTML = sun
      ? '<span><b>Rinascita pronta</b><small>nuovo Sole: la Campagna ricomincia più forte</small></span><span class="go">RINASCI ›</span>'
      : `<span><b>Ascensione pronta</b><small>+${formatNum(gain)} Scintille</small></span><span class="go">ASCENDI ›</span>`;
  }

  const gear = createGearPanel(el('gear'));
  const skills = createSkillPanel(el('skills'));
  const stars = createStarPanel(el('stars'));
  const combat = createCombatPanel(el('combat'));
  const vie = createViaPanel(el('vie'), actions);
  const lumi = createLumiPanel(el('lumi'));
  const world = createWorldPanel(el('world'), actions);
  const progress = createProgressPanel(el('progress-panel'));
  const ascension = createAscensionPanel(el('ascension'), actions);
  show(prefs.tab);

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
      const kills = Math.min(state.stage.kills, KILLS_PER_STAGE);
      refs.topstage.textContent = `Stage ${state.stage.current} · ${bossNow ? 'boss' : `${kills}/${KILLS_PER_STAGE}`}`;
      if (refs.pips.dataset.n !== String(kills)) {
        refs.pips.dataset.n = String(kills);
        refs.pips.querySelectorAll('i').forEach((p, i) => p.classList.toggle('on', i < kills));
      }
      refs.pips.classList.toggle('boss', !!bossNow);
      const m = state.mode;
      refs.notice.textContent = m.kind === 'dungeon' ? `Dungeon livello ${m.level}: nemico ${Math.min(m.wave + 1, DUNGEON_WAVES + 1)} di ${DUNGEON_WAVES + 1} (la Campagna è in pausa)`
        : m.kind === 'tower' ? `Torre dell'Alba: piano ${m.floor} · ${modeTimer(state)} (record ${state.tower.best})`
        : m.kind === 'raid' ? `Raid: ${m.name} · ${modeTimer(state)}`
        : m.kind === 'abyss' ? `Abisso: profondità ${m.depth} · ${m.wave >= ABYSS_WAVES ? 'Guardiano' : `nemico ${m.wave + 1} di ${ABYSS_WAVES}`} (record ${state.abyss.best})`
        : state.stage.auto ? '' : "Troppo forte: allenamento finché non sali di livello.";
      refs.leave.hidden = m.kind === 'campaign';

      for (const u of UPGRADES) {
        const price = upgradePrice(state, u.id);
        root.querySelector(`[data-lv="${u.id}"]`)!.textContent = `Lv ${state.upgrades[u.id]}`;
        root.querySelector(`[data-cost="${u.id}"]`)!.textContent = `${formatNum(price)} oro`;
      }

      vie.update(state);
      lumi.update(state);
      world.update(state);
      progress.update(state);
      ascension.update(state);
      refs.keys.textContent = String(state.keys);
      refs.zone.textContent = zoneName(state.stage.current);
      gear.update(state);
      skills.update(state);
      stars.update(state);
      badges(state);
      todo(state);
      combat.update(state);
      const s = stateStats(state);
      refs.kpis.innerHTML = [['Attacco', s.atk], ['Vita', s.maxHp], ['Difesa', s.def]]
        .map(([k, v]) => `<div><span class="label">${k}</span><b>${formatNum(v as number)}</b></div>`).join('');
      refs.herosub.textContent = `Lv ${state.hero.level}`;
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
