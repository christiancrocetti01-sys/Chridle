import { canAscend, perkCost, perkLevel, perkValue } from '../core/ascension';
import { formatNum } from '../core/format';
import type { OfflineReport } from '../core/offline';
import type { GameState } from '../core/state';
import { ASCEND_STAGE, PERKS, scintilleFor, type PerkDef, type PerkId } from '../data/ascension';

export interface AscensionActions {
  ascend(): void;
  buyPerk(id: PerkId): void;
}

const perkText = (d: PerkDef, total: number) =>
  d.text.replace('{v}', d.id === 'veglia' ? String(Math.round((0.75 + total) * 100)) : d.id === 'balzo' || d.id === 'slot' ? String(total) : String(Math.round(total * 100)));

/** Scheda Ascensione: Scintille, pulsante per ascendere e potenziamenti permanenti. */
export function createAscensionPanel(root: HTMLElement, actions: AscensionActions) {
  let key = '';
  let confirm = false;
  root.addEventListener('click', (ev) => {
    const t = (ev.target as HTMLElement).closest<HTMLElement>('[data-a]');
    if (!t) return;
    if (t.dataset.a === 'ascend') {
      // doppio tocco: la prima volta chiede conferma
      if (confirm) actions.ascend();
      confirm = !confirm;
    } else if (t.dataset.a === 'perk') actions.buyPerk(t.dataset.id as PerkId);
    key = '';
  });
  return {
    update(state: GameState) {
      const a = state.ascension;
      const gain = scintilleFor(state.stage.best);
      const k = JSON.stringify([a, gain, confirm, canAscend(state)]);
      if (k === key) return;
      key = k;
      const ok = canAscend(state);
      root.innerHTML = `
        <h2 class="section">Ascensione <span class="muted">· ${a.count} volte</span></h2>
        <div class="skill-row">
          <div class="skill-head"><span><b class="scint">${formatNum(a.scintille)}</b> Scintille <span class="muted">(${formatNum(a.total)} in tutto)</span></span>
            <button class="btn sm${confirm ? ' danger' : ''}" data-a="ascend"${ok && gain > 0 ? '' : ' disabled'}>${confirm ? 'Conferma: riparti da capo' : `Ascendi · +${gain}`}</button></div>
          <div class="skill-info">Il Sole si riaccende un poco, ma l’Eclissi ritorna. Si riparte da livello 1 e dallo stage iniziale
            perdendo oro, potenziamenti e Costellazioni (i punti tornano salendo). Restano oggetti, Frammenti, Essenza, rune, chiavi, Torre e Vie.</div>
          <div class="skill-info muted">${state.stage.best >= ASCEND_STAGE ? `Scintille = ((record − 30) / 10)². Record attuale: stage ${state.stage.best}.` : `Si sblocca allo stage ${ASCEND_STAGE} (record attuale ${state.stage.best}).`}</div>
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
        }).join('')}</div>`;
    },
  };
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
