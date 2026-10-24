import type { CombatEvent } from '../core/combat';
import { formatNum } from '../core/format';
import type { GameState } from '../core/state';
import { stateStats } from '../core/stats';
import { BOSSES, ENEMIES } from '../data/enemies';
import { RARITIES } from '../data/items';
import { MAX_LIGHT, skillDef } from '../data/skills';

const LOG_SIZE = 6;
const NAMES = new Map([...ENEMIES, ...BOSSES].map((e) => [e.id, e.name]));

/** Pannello di combattimento minimale: barre vita e registro degli eventi importanti. */
export function createCombatPanel(root: HTMLElement) {
  root.innerHTML = `
    <div class="fighter">
      <div class="row"><span>Guerriero della Luce</span><span class="muted" data-c="herohp"></span></div>
      <div class="bar hp"><div class="fill" data-c="herobar"></div></div>
      <div class="bar light"><div class="fill" data-c="lightbar"></div></div>
    </div>
    <div class="fighter">
      <div class="row"><span data-c="enemy"></span><span class="muted" data-c="enemyhp"></span></div>
      <div class="bar hp enemy"><div class="fill" data-c="enemybar"></div></div>
    </div>
    <ul class="log" data-c="log"></ul>`;
  const q = (k: string) => root.querySelector<HTMLElement>(`[data-c="${k}"]`)!;
  const refs = { herohp: q('herohp'), herobar: q('herobar'), enemy: q('enemy'), enemyhp: q('enemyhp'), enemybar: q('enemybar'), lightbar: q('lightbar'), log: q('log') };
  const lines: HTMLLIElement[] = [];

  function log(text: string, cls = '', color?: string) {
    const li = document.createElement('li');
    li.textContent = text;
    if (cls) li.className = cls;
    if (color) li.style.color = color;
    refs.log.prepend(li);
    lines.unshift(li);
    while (lines.length > LOG_SIZE) lines.pop()!.remove();
  }

  /** Gli effetti a scatto ripetuti si raggruppano in una riga (×N) per non coprire il resto del registro. */
  function proc(name: string, id: string, label = 'Effetto') {
    const top = lines[0];
    if (top?.dataset.proc === id) {
      const n = Number(top.dataset.n) + 1;
      top.dataset.n = String(n);
      top.textContent = `${label} ${name} ×${n}`;
      return;
    }
    log(`${label} ${name}`, 'proc');
    lines[0].dataset.proc = id;
    lines[0].dataset.n = '1';
  }

  return {
    onEvents(events: CombatEvent[]) {
      for (const e of events) {
        if (e.type === 'kill') log(`${e.boss ? 'Boss sconfitto' : 'Nemico sconfitto'}: +${formatNum(e.gold)} oro, +${formatNum(e.xp)} XP, +${formatNum(e.essence)} Essenza`, e.boss ? 'boss' : '');
        else if (e.type === 'drop') log(`Bottino: ${e.item.name} (${RARITIES[e.item.rarity].name})${e.salvaged ? ' → smantellato' : ''}`, '', RARITIES[e.item.rarity].color);
        else if (e.type === 'levelup') log(`Livello ${e.level}!`, 'gold');
        else if (e.type === 'stage') log(`Stage ${e.stage}`, 'muted');
        else if (e.type === 'death') log('Il guerriero è caduto…', 'down');
        else if (e.type === 'hit' && e.crit && e.target === 'enemy') log(`Colpo critico: ${formatNum(e.amount)}`, 'crit');
        else if (e.type === 'proc') proc(e.name, e.id);
        else if (e.type === 'skill') proc(e.name, `skill:${e.id}`, 'Skill');
        else if (e.type === 'unlock') log(`Nuova skill: ${skillDef(e.id)?.name}`, 'gold');
      }
    },
    update(state: GameState) {
      const s = stateStats(state);
      const hp = Math.max(0, state.hero.hp);
      const shield = state.hero.shield >= 1 ? ` +${formatNum(state.hero.shield)} scudo` : '';
      refs.herohp.textContent = `${formatNum(hp)} / ${formatNum(s.maxHp)}${shield}`;
      refs.lightbar.style.width = `${(state.hero.light / MAX_LIGHT) * 100}%`;
      refs.herobar.style.width = `${(hp / s.maxHp) * 100}%`;
      const e = state.enemy;
      refs.enemy.textContent = e ? `${e.boss ? 'BOSS · ' : ''}${NAMES.get(e.templateId) ?? e.templateId}` : '…';
      refs.enemy.classList.toggle('boss', !!e?.boss);
      refs.enemyhp.textContent = e ? `${formatNum(Math.max(0, e.hp))} / ${formatNum(e.maxHp)}` : '';
      refs.enemybar.style.width = e ? `${(Math.max(0, e.hp) / e.maxHp) * 100}%` : '0%';
    },
  };
}
