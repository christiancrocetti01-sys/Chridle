import { upgradePrice, type CombatEvent } from '../core/combat';
import { formatNum } from '../core/format';
import type { GameState } from '../core/state';
import { KILLS_PER_STAGE, elementalDamage, stateStats, xpToNext, type Stats } from '../core/stats';
import { createCombatPanel } from './combat';
import { createGearPanel } from './gear';
import { createSkillPanel } from './skills';
import { createStarPanel } from './stars';
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
interface TabDef { id: string; name: string; subs: Sub[] }

/** Schede principali (barra in basso) e sotto-schede: una cosa per schermata. */
const TABS: TabDef[] = [
  { id: 'hero', name: 'Eroe', subs: [['oggetti', 'Oggetti'], ['potenziamenti', 'Potenziamenti'], ['statistiche', 'Statistiche']] },
  { id: 'build', name: 'Build', subs: [['skill', 'Skill'], ['rune', 'Rune'], ['stelle', 'Stelle'], ['via', 'Via'], ['lumi', 'Lumi']] },
  { id: 'world', name: 'Mondo', subs: [['zona', 'Zona'], ['modi', 'Modalità']] },
  { id: 'progress', name: 'Progressi', subs: [['bestiario', 'Bestiario'], ['collezione', 'Collezione'], ['imprese', 'Imprese']] },
  { id: 'ascension', name: 'Ascensione', subs: [['ascensione', 'Ascensione'], ['rinascita', 'Rinascita'], ['paragon', 'Paragon']] },
];

const UI_KEY = 'chridle.ui';

interface UiPrefs { tab: string; subs: Record<string, string> }

function loadPrefs(): UiPrefs {
  const def: UiPrefs = { tab: 'hero', subs: Object.fromEntries(TABS.map((t) => [t.id, t.subs[0][0]])) };
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

export function createHud(root: HTMLElement, actions: HudActions): Hud {
  const prefs = loadPrefs();
  root.innerHTML = `
    <style>${SUB_CSS}</style>
    <header class="top">
      <div class="top-row">
        <h1 class="title">Chridle <button class="sound" data-k="sound" title="Suoni">♪</button><button class="help" data-k="help" title="Guida">?</button></h1>
        <div class="wallet">
          <span class="gold"><span data-k="gold">0</span> <small>oro</small></span>
          <span class="essence"><span data-k="essence">0</span> <small>Essenza</small></span>
          <span class="essence"><span data-k="keys">0</span> <small>chiavi</small></span>
        </div>
      </div>
      <div class="meters">
        <div>
          <div class="row"><span>Livello <b data-k="level">1</b></span><span class="muted" data-k="xptext"></span></div>
          <div class="bar"><div class="fill" data-k="xpbar"></div></div>
        </div>
        <div>
          <div class="row"><span>Stage <b data-k="stage">1</b> <span class="muted" data-k="best"></span></span><span data-k="progress"></span></div>
          <div class="bar"><div class="fill" data-k="stagebar"></div></div>
        </div>
      </div>
      <div class="row zone-row"><span class="muted" data-k="zone"></span></div>
      <div class="combat" data-k="combat"></div>
      <div class="notice-row"><p class="notice" data-k="notice"></p><button class="btn sm" data-k="leave" hidden>Abbandona</button></div>
    </header>
    <div class="navs">
      <nav class="tabs">
        ${TABS.map((t) => `<button class="tab" data-tab="${t.id}">${t.name}<span class="badge" data-badge="${t.id}"></span></button>`).join('')}
      </nav>
      <nav class="subtabs" data-k="subnav"></nav>
    </div>
    <div class="pane" data-pane="hero">
      <div data-sub="oggetti"><div data-k="gear"></div></div>
      <div data-sub="potenziamenti">
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
      <div data-sub="statistiche">
        <h2 class="section">Statistiche</h2>
        <dl class="stats" data-k="stats"></dl>
      </div>
    </div>
    <div class="pane" data-pane="build">
      <div data-k="skills"></div>
      <div data-sub="stelle"><div data-k="stars"></div></div>
      <div data-sub="via"><div data-k="vie"></div></div>
      <div data-sub="lumi"><div data-k="lumi"></div></div>
    </div>
    <div class="pane" data-pane="world"><div data-k="world"></div></div>
    <div class="pane" data-pane="progress"><div data-k="progress-panel"></div></div>
    <div class="pane" data-pane="ascension"><div data-k="ascension"></div></div>
`;

  const el = (k: string) => root.querySelector<HTMLElement>(`[data-k="${k}"]`)!;
  const refs = {
    gold: el('gold'), level: el('level'), xptext: el('xptext'), xpbar: el('xpbar'),
    stage: el('stage'), best: el('best'), progress: el('progress'), stagebar: el('stagebar'),
    notice: el('notice'), stats: el('stats'), essence: el('essence'), subnav: el('subnav'),
    keys: el('keys'), zone: el('zone'), sound: el('sound'), leave: el('leave'),
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
  refs.leave.addEventListener('click', () => actions.leaveMode());
  el('help').addEventListener('click', openGuide);

  /** Schede: mostra il pane scelto, ridisegna le sotto-schede e ricorda la scelta. */
  function show(tab: string, sub = prefs.subs[tab]) {
    prefs.tab = tab;
    prefs.subs[tab] = sub;
    savePrefs(prefs);
    root.querySelectorAll<HTMLElement>('[data-tab]').forEach((t) => t.classList.toggle('on', t.dataset.tab === tab));
    root.querySelectorAll<HTMLElement>('[data-pane]').forEach((p) => {
      p.hidden = p.dataset.pane !== tab;
      p.dataset.view = prefs.subs[p.dataset.pane!];
    });
    const def = TABS.find((t) => t.id === tab)!;
    refs.subnav.innerHTML = def.subs.map(([id, name]) =>
      `<button class="subtab${id === sub ? ' on' : ''}" data-subtab="${id}">${name}<span class="badge" data-badge="${id}"></span></button>`).join('');
    badgeKey = '';
  }
  root.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b) =>
    b.addEventListener('click', () => {
      show(b.dataset.tab!);
      window.scrollTo({ top: 0 });
    }),
  );
  refs.subnav.addEventListener('click', (ev) => {
    const b = (ev.target as HTMLElement).closest<HTMLElement>('[data-subtab]');
    if (b) show(prefs.tab, b.dataset.subtab);
  });

  /** Pallini sulle schede: qualcosa da fare (Ascensione o Rinascita pronta). */
  let badgeKey = '';
  function badges(state: GameState) {
    const asc = canAscend(state) && scintilleGain(state) > 0;
    const sun = canRebirth(state);
    const b: Record<string, string> = {
      ascension: asc || sun ? '•' : '', ascensione: asc ? '•' : '', rinascita: sun ? '•' : '',
    };
    const k = JSON.stringify(b);
    if (k === badgeKey) return;
    badgeKey = k;
    root.querySelectorAll<HTMLElement>('[data-badge]').forEach((x) => (x.textContent = b[x.dataset.badge!] ?? ''));
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
      refs.progress.textContent = bossNow ? 'BOSS' : `${state.stage.kills} / ${KILLS_PER_STAGE}`;
      refs.progress.classList.toggle('boss', !!bossNow);
      refs.stagebar.style.width = `${Math.min(1, state.stage.kills / KILLS_PER_STAGE) * 100}%`;
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
