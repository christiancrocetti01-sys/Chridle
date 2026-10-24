import { canAscend, perkCost, perkLevel, perkValue, scintilleGain } from '../core/ascension';
import { canRebirth, cycleScintille, lootMult, paragonFree, powerMult, rebirthGain, sparkMult } from '../core/endgame';
import { PARAGON, REBIRTH_SCINTILLE, paragonCost, type ParagonId } from '../data/endgame';
import { STAT_LABELS } from '../data/items';
import { formatStat } from './gear';
import { formatNum } from '../core/format';
import type { OfflineReport } from '../core/offline';
import type { GameState } from '../core/state';
import { ASCEND_STAGE, PERKS, type PerkDef, type PerkId } from '../data/ascension';

export interface AscensionActions {
  ascend(): void;
  buyPerk(id: PerkId): void;
  rebirth(): void;
  spendParagon(id: ParagonId): void;
  resetParagon(): void;
}

const perkText = (d: PerkDef, total: number) =>
  d.text.replace('{v}', d.id === 'veglia' ? String(Math.round((0.75 + total) * 100)) : d.id === 'balzo' || d.id === 'slot' ? String(total) : String(Math.round(total * 100)));

/** Scheda Ascensione: Scintille, pulsante per ascendere e potenziamenti permanenti. */
export function createAscensionPanel(root: HTMLElement, actions: AscensionActions) {
  let key = '';
  let confirm = false;
  let confirmSun = false;
  root.addEventListener('click', (ev) => {
    const t = (ev.target as HTMLElement).closest<HTMLElement>('[data-a]');
    if (!t) return;
    if (t.dataset.a === 'ascend') {
      // doppio tocco: la prima volta chiede conferma
      if (confirm) actions.ascend();
      confirm = !confirm;
    } else if (t.dataset.a === 'rebirth') {
      if (confirmSun) actions.rebirth();
      confirmSun = !confirmSun;
    } else if (t.dataset.a === 'perk') actions.buyPerk(t.dataset.id as PerkId);
    else if (t.dataset.a === 'paragon') actions.spendParagon(t.dataset.id as ParagonId);
    else if (t.dataset.a === 'paragonReset') actions.resetParagon();
    key = '';
  });
  return {
    update(state: GameState) {
      const a = state.ascension;
      const gain = scintilleGain(state);
      const p = state.paragon;
      const k = JSON.stringify([a, gain, confirm, confirmSun, canAscend(state), p.level, p.points, Math.floor((p.xp / paragonCost(p.level)) * 100), state.rebirth]);
      if (k === key) return;
      key = k;
      const ok = canAscend(state);
      root.innerHTML = `
        <div data-sub="ascensione">
        <h2 class="section">Ascensione <span class="muted">· ${a.count} volte</span></h2>
        <div class="skill-row">
          <div class="skill-head"><span><b class="scint">${formatNum(a.scintille)}</b> Scintille <span class="muted">(${formatNum(a.total)} in tutto)</span></span>
            <button class="btn sm${confirm ? ' danger' : ''}" data-a="ascend"${ok && gain > 0 ? '' : ' disabled'}>${confirm ? 'Conferma: riparti da capo' : `Ascendi · +${gain}`}</button></div>
          <div class="skill-info">Il Sole si riaccende un poco, ma l’Eclissi ritorna. Si riparte da livello 1 e dallo stage iniziale
            perdendo oro, potenziamenti e Costellazioni (i punti tornano salendo). Restano oggetti, Frammenti, Essenza, rune, chiavi, Torre e Vie.</div>
          <div class="skill-info muted">${state.stage.best >= ASCEND_STAGE ? `Scintille = ((record − 30) / 10)²${sparkMult(state.rebirth) > 1 ? ` × ${sparkMult(state.rebirth).toFixed(2)} (Soli)` : ''}. Record attuale: stage ${state.stage.best}.` : `Si sblocca allo stage ${ASCEND_STAGE} (record attuale ${state.stage.best}).`}</div>
        </div>
        <h2 class="section">Potenziamenti permanenti</h2>
        <div class="skill-list">${PERKS.map((d) => {
          const lv = perkLevel(a, d.id);
          const maxed = d.max !== undefined && lv >= d.max;
          const cost = perkCost(a, d.id);
          return `<div class="skill-row">
            <div class="skill-head"><span><b>${d.name}</b> <span class="muted">Lv ${lv}${d.max ? `/${d.max}` : ''}</span></span>
              <button class="btn sm" data-a="perk" data-id="${d.id}"${!maxed && a.scintille >= cost ? '' : ' disabled'}>${maxed ? 'Massimo' : `Compra · ${formatNum(cost)}`}</button></div>
            <div class="skill-info">${lv ? perkText(d, perkValue(a, d.id)) : `<span class="muted">${perkText(d, d.value)} al primo livello</span>`}</div>
          </div>`;
        }).join('')}</div>
        </div>
        <div data-sub="rinascita">${rebirthBlock(state, confirmSun)}</div>
        <div data-sub="paragon">${paragonBlock(state)}</div>`;
    },
  };
}

/** Rinascita Solare: Soli, moltiplicatori e pulsante. */
function rebirthBlock(state: GameState, confirm: boolean): string {
  const r = state.rebirth;
  const gain = rebirthGain(state);
  return `<h2 class="section">Rinascita Solare <span class="muted">· ${r.count} volte</span></h2>
    <div class="skill-row">
      <div class="skill-head"><span><b class="scint">${r.soli}</b> Soli</span>
        <button class="btn sm${confirm ? ' danger' : ''}" data-a="rebirth"${canRebirth(state) ? '' : ' disabled'}>${confirm ? 'Conferma: azzera le Ascensioni' : `Rinasci · +${gain} Soli`}</button></div>
      <div class="skill-info">Il Sole muore e rinasce. Si azzerano Ascensioni, Scintille e potenziamenti (restano gli slot delle skill e la Doppia Via)
        e si riparte da capo. Restano oggetti, rune, Torre, Abisso, Paragon, collezione e Lumi.</div>
      <div class="skill-info">${r.soli ? `Ora: attacco, vita e difesa <b>×${powerMult(r).toFixed(1)}</b> · oro, XP, Essenza e Paragon ×${lootMult(r).toFixed(1)} · Scintille ×${sparkMult(r).toFixed(2)}`
        : '<span class="muted">Ogni Sole: attacco, vita e difesa +100%, oro, XP ed Essenza +50%, Scintille +25%. Per sempre.</span>'}</div>
      <div class="skill-info muted">Soli = √(Scintille del ciclo / 100), da ${REBIRTH_SCINTILLE} Scintille guadagnate (ora ${formatNum(Math.floor(cycleScintille(state)))}${r.soli ? ', senza il bonus dei Soli' : ''}).</div>
    </div>`;
}

/** Paragon: livello, barra dell'esperienza e punti da spendere. */
function paragonBlock(state: GameState): string {
  const p = state.paragon;
  const free = paragonFree(p);
  const pct = Math.min(100, (p.xp / paragonCost(p.level)) * 100);
  return `<h2 class="section">Paragon <span class="muted">· livello ${p.level}${free ? ` · <b>${free}</b> punti` : ''}</span></h2>
    <div class="skill-row">
      <div class="bar"><div class="fill" style="width:${pct.toFixed(1)}%"></div></div>
      <div class="skill-info muted">${formatNum(p.xp)} / ${formatNum(paragonCost(p.level))} esperienza Paragon: si guadagna solo nell'Abisso.
        I punti si possono riprendere quando vuoi. <button class="btn sm" data-a="paragonReset"${p.level - free ? '' : ' disabled'}>Riprendi i punti</button></div>
    </div>
    <div class="skill-list">${PARAGON.map((d) => {
      const n = p.points[d.id] ?? 0;
      return `<div class="skill-row"><div class="skill-head"><span><b>${d.name}</b> <span class="muted">${n}</span> ·
        ${d.mods.map(([k, v]) => `+${formatStat(k, v * Math.max(1, n))} ${STAT_LABELS[k]}`).join(', ')}${n ? '' : ' <span class="muted">per punto</span>'}</span>
        <button class="btn sm" data-a="paragon" data-id="${d.id}"${free ? '' : ' disabled'}>+1</button></div></div>`;
    }).join('')}</div>`;
}

const duration = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h} h ${m} min` : `${m} min`;
};

/** Riepilogo del progresso offline al rientro. */
export function showOfflineReport(r: OfflineReport) {
  const box = document.createElement('div');
  box.className = 'modal';
  const rows: [string, string][] = [
    ['Nemici sconfitti', formatNum(r.kills)],
    ['Oro', `+${formatNum(r.gold)}`],
    ['Esperienza', `+${formatNum(r.xp)}${r.levels ? ` · <b>+${r.levels} livelli</b>` : ''}`],
    ['Essenza', `+${formatNum(r.essence)}`],
    ['Frammenti', `+${formatNum(r.fragments)}`],
    ['Oggetti tenuti', String(r.items)],
    ...(r.keys ? [['Chiavi', `+${r.keys}`] as [string, string]] : []),
  ];
  box.innerHTML = `<div class="modal-box">
    <h2 class="title sm">Bentornato</h2>
    <p class="muted">Sei stato via ${duration(r.seconds)}. Il guerriero ha combattuto senza sosta (efficienza ${Math.round(r.efficiency * 100)}%).</p>
    <dl class="stats">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
    <button class="card modal-ok">Riprendi</button></div>`;
  box.addEventListener('click', (ev) => {
    if (ev.target === box || (ev.target as HTMLElement).closest('.modal-ok')) box.remove();
  });
  document.body.append(box);
}
