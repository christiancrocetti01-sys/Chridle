import type { CombatEvent } from '../core/combat';
import { formatNum } from '../core/format';
import type { GameState } from '../core/state';
import { stateStats } from '../core/stats';
import { RARITIES } from '../data/items';
import { FAMILIES, zoneSigns, type Mechanic } from '../data/enemies';
import { DUNGEON_MODS } from '../data/modes';
import { modeTimer, resText } from './world';
import { achievementName } from '../core/achievements';
import { lumoDef } from '../core/lumi';
import { flash, toast } from './fx';
import { SFX } from './sound';
import { enemyCard, heroArt } from './art';
import { itemIcon } from './icons';

const MECHANIC_SHORT: Record<Mechanic, string> = { enrage: 'furia', shield: 'scudo', summon: 'evocazioni', regen: 'rigenerazione' };
import { MAX_LIGHT, skillDef } from '../data/skills';

const LOG_SIZE = 3;

/** Pannello di combattimento minimale: barre vita e registro degli eventi importanti. */
export function createCombatPanel(root: HTMLElement) {
  root.innerHTML = `
    <div class="foe">
      <div class="foe-card" data-c="ecard"></div>
      <h2 class="foe-name" data-c="enemy"></h2>
      <div class="enemy-info muted" data-c="einfo"></div>
      <div class="bar hp enemy"><div class="fill" data-c="enemybar"></div></div>
      <div class="row small muted"><span data-c="efam"></span><span data-c="enemyhp"></span></div>
    </div>
    <div class="fighter">
      <div class="portrait">${heroArt()}</div>
      <div class="fighter-bars">
        <div class="row small"><span>Guerriero</span><span class="muted" data-c="herohp"></span></div>
        <div class="bar hp"><div class="fill" data-c="herobar"></div></div>
        <div class="bar light" title="Luce"><div class="fill" data-c="lightbar"></div></div>
      </div>
    </div>
    <ul class="log" data-c="log"></ul>`;
  const q = (k: string) => root.querySelector<HTMLElement>(`[data-c="${k}"]`)!;
  const refs = { herohp: q('herohp'), herobar: q('herobar'), enemy: q('enemy'), enemyhp: q('enemyhp'), enemybar: q('enemybar'), einfo: q('einfo'), efam: q('efam'), lightbar: q('lightbar'), log: q('log'), ecard: q('ecard') };
  let cardKey = '';
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

  /** Suoni, lampi e avvisi: solo per gli eventi che contano. */
  function juice(e: CombatEvent) {
    if (e.type === 'hit' && e.crit && e.target === 'enemy') { SFX.crit(); flash(refs.enemybar.parentElement!, 'flash'); }
    else if (e.type === 'hit' && e.target === 'hero' && e.amount > 0) flash(refs.herobar.parentElement!, 'hurt');
    else if (e.type === 'kill') (e.boss ? SFX.boss : SFX.kill)();
    else if (e.type === 'levelup') { SFX.level(); toast(`Livello <b>${e.level}</b>`, 'gold'); }
    else if (e.type === 'death') SFX.death();
    else if (e.type === 'key') SFX.key();
    else if (e.type === 'drop' && !e.salvaged && e.item.rarity >= 4) {
      SFX.loot(e.item.rarity);
      toast(`<span class="rar-${e.item.rarity}" style="color:${RARITIES[e.item.rarity].color}">${itemIcon(e.item.type, e.item.rarity)}${e.item.name}</span><br><small>${RARITIES[e.item.rarity].name}</small>`, `loot r${e.item.rarity}`);
    }
    if (e.type === 'drop' && e.discovered) toast(`Collezione: <b>${e.item.name}</b><br><small>nuovo unico, bonus permanente</small>`, 'gold');
    else if (e.type === 'mode' && e.ok) toast(e.text, 'gold');
    else if (e.type === 'lumo') toast(`Nuovo Lumo: <b>${lumoDef(e.id).name}</b><br><small>Eroe · Lumi</small>`, 'gold');
    else if (e.type === 'achievement') toast(`Impresa: <b>${achievementName(e.id)}</b>`, 'gold');
  }

  return {
    onEvents(events: CombatEvent[]) {
      for (const e of events) juice(e);
      for (const e of events) {
        if (e.type === 'kill') log(`${e.boss ? 'Boss sconfitto' : 'Nemico sconfitto'}: +${formatNum(e.gold)} oro, +${formatNum(e.xp)} XP, +${formatNum(e.essence)} Essenza`, e.boss ? 'boss' : '');
        else if (e.type === 'drop') log(`Bottino: ${e.item.name} (${RARITIES[e.item.rarity].name})${e.salvaged ? ' → smantellato' : ''}`, '', RARITIES[e.item.rarity].color);
        else if (e.type === 'levelup') log(`Livello ${e.level}!`, 'gold');
        else if (e.type === 'stage') log(`Stage ${e.stage}`, 'muted');
        else if (e.type === 'death') log('Il guerriero è caduto…', 'down');
        else if (e.type === 'hit' && e.crit && e.target === 'enemy') log(`Colpo critico: ${formatNum(e.amount)}`, 'crit');
        else if (e.type === 'proc') proc(e.name, e.id);
        else if (e.type === 'skill') proc(e.name, `skill:${e.id}`, 'Skill');
        else if (e.type === 'mechanic') log(e.text, 'down');
        else if (e.type === 'lumo') log(`Un Lumo si unisce al guerriero: ${lumoDef(e.id).name}`, 'gold');
        else if (e.type === 'achievement') log(`Impresa completata: ${achievementName(e.id)}`, 'gold');
        else if (e.type === 'mode') log(e.text, e.ok ? 'gold' : 'down');
        else if (e.type === 'key') log(`Chiave trovata! (${e.keys})`, 'gold');
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
      // la carta si ridisegna solo quando cambia il nemico
      const ck = e ? `${e.templateId}|${e.boss}|${e.zoneBoss}|${e.elite}` : '';
      if (ck !== cardKey) {
        cardKey = ck;
        refs.ecard.innerHTML = e ? enemyCard(e) : '';
      }
      refs.enemy.innerHTML = e ? `${e.boss ? '<small>BOSS</small>' : e.elite ? '<small>ÉLITE</small>' : ''}${e.name}` : '…';
      refs.enemy.classList.toggle('boss', !!e?.boss || !!e?.elite);
      const timer = modeTimer(state);
      const mech = e?.mechanics.length ? ` · ${e.mechanics.map((x) => MECHANIC_SHORT[x]).join(', ')}` : '';
      const signs = state.mode.kind === 'campaign' ? zoneSigns(state.stage.current) : [];
      const sign = signs.length ? ` · segni: ${signs.map((id) => DUNGEON_MODS.find((x) => x.id === id)!.name).join(', ')}` : '';
      refs.einfo.innerHTML = e ? `${resText(e.family)}${mech}${sign}${timer ? ` · ${timer}` : ''}` : '';
      refs.efam.textContent = e ? FAMILIES[e.family].name : '';
      refs.enemyhp.textContent = e ? `${formatNum(Math.max(0, e.hp))} / ${formatNum(e.maxHp)}` : '';
      refs.enemybar.style.width = e ? `${(Math.max(0, e.hp) / e.maxHp) * 100}%` : '0%';
    },
  };
}
