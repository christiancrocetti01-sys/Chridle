import { canAscend, perkCost, perkLevel, perkValue, scintilleGain } from '../core/ascension';
import { canRebirth, cycleScintille, lootMult, paragonFree, powerMult, rebirthGain, sparkMult } from '../core/endgame';
import { PARAGON, REBIRTH_SCINTILLE, paragonCost } from '../data/endgame';
import { STAT_LABELS } from '../data/items';
import { formatStat } from './gear';
import { formatNum } from '../core/format';
import type { OfflineReport } from '../core/offline';
import type { GameState } from '../core/state';
import { ASCEND_STAGE, PERKS, type PerkDef } from '../data/ascension';

export interface AscensionActions {
  ascend(): void;
  rebirth(): void;
}

const perkText = (d: PerkDef, total: number) =>
  d.text.replace('{v}', d.id === 'balzo' || d.id === 'slot' || d.id === 'chiavi' ? String(total) : String(Math.round(total * 100)));

/** Perk mostrati prima di «Tutti e N». */
const PERKS_SHOWN = 3;

/** Scheda Rituali: l'Ascensione grande e sola, Rinascita e Paragon in una riga (si aprono al tocco), permanenti compatti. */
export function createAscensionPanel(root: HTMLElement, actions: AscensionActions) {
  let key = '';
  let confirm = false;
  let confirmSun = false;
  let allPerks = false;
  const open = new Set<string>();
  root.addEventListener('click', (ev) => {
    const row = (ev.target as HTMLElement).closest<HTMLElement>('[data-open]');
    if (row) {
      const id = row.dataset.open!;
      if (id === 'perks') allPerks = !allPerks;
      else if (open.has(id)) open.delete(id);
      else open.add(id);
      key = '';
      return;
    }
    const t = (ev.target as HTMLElement).closest<HTMLElement>('[data-a]');
    if (!t) return;
    if (t.dataset.a === 'ascend') {
      // doppio tocco: la prima volta chiede conferma
      if (confirm) actions.ascend();
      confirm = !confirm;
    } else if (t.dataset.a === 'rebirth') {
      if (confirmSun) actions.rebirth();
      confirmSun = !confirmSun;
    }
    key = '';
  });
  return {
    update(state: GameState) {
      const a = state.ascension;
      const gain = scintilleGain(state);
      const p = state.paragon;
      const sun = canRebirth(state);
      const k = JSON.stringify([a, gain, confirm, confirmSun, canAscend(state), p.level, p.points, Math.floor((p.xp / paragonCost(p.level)) * 100), state.rebirth, allPerks, [...open], sun]);
      if (k === key) return;
      key = k;
      const ok = canAscend(state) && gain > 0;
      const cycle = Math.floor(cycleScintille(state));
      const sunPct = Math.min(100, (cycle / REBIRTH_SCINTILLE) * 100);
      const paraPct = Math.min(100, (p.xp / paragonCost(p.level)) * 100);
      const free = paragonFree(p);
      // la Rinascita pronta si apre da sola: è lei la decisione del momento
      const sunOpen = open.has('sun') !== sun;
      const perks = allPerks ? PERKS : PERKS.slice(0, PERKS_SHOWN);
      root.innerHTML = `
        <section class="rite">
          <span class="label">Ascensione · n° ${a.count + 1}</span>
          <span class="rite-num${ok ? '' : ' off'}">+${formatNum(gain)}</span>
          <span>Scintille <span class="muted">(ora ${formatNum(a.scintille)}, ${formatNum(a.total)} in tutto)</span></span>
          <button class="btn primary big${confirm ? ' danger' : ''}" data-a="ascend"${ok ? '' : ' disabled'}>${confirm ? 'Conferma: riparti da capo' : 'Ascendi'}</button>
          <p class="muted small">${state.stage.best >= ASCEND_STAGE ? `Scintille = ((record − 30) / 10)²${sparkMult(state.rebirth) > 1 ? ` × ${sparkMult(state.rebirth).toFixed(2)} (Soli)` : ''} · record stage ${state.stage.best}` : `Si apre allo stage ${ASCEND_STAGE} (record ${state.stage.best})`}</p>
          <div class="rite-cols">
            <div><span class="label">Restano</span><span>oggetti, Frammenti, Essenza, rune, chiavi, Torre, Vie</span></div>
            <div><span class="label">Si perdono</span><span class="muted">livello, stage, oro, potenziamenti, Stelle (i punti tornano salendo)</span></div>
          </div>
        </section>
        <section class="rite-rows">
          <div class="rite-row${sun ? ' ready' : ''}${sunOpen ? ' open' : ''}">
            <button class="rite-head" data-open="sun" aria-expanded="${sunOpen}">
              <span class="row"><span>Rinascita${sun ? ' <span class="go">pronta</span>' : ''}</span><span class="muted small">${state.rebirth.soli ? `${state.rebirth.soli} Soli · ` : ''}${formatNum(cycle)} / ${REBIRTH_SCINTILLE} Scintille</span></span>
              <span class="bar"><span class="fill" style="width:${sunPct.toFixed(1)}%"></span></span>
            </button>
            ${sunOpen ? `<div class="rite-body">${rebirthBlock(state, confirmSun)}</div>` : ''}
          </div>
          <div class="rite-row${open.has('para') ? ' open' : ''}">
            <button class="rite-head" data-open="para" aria-expanded="${open.has('para')}">
              <span class="row"><span>Paragon${p.level ? ` <span class="muted">liv. ${p.level}</span>` : ''}</span><span class="muted small">${p.level || p.xp ? `${Math.floor(paraPct)}%${free ? ` · ${free} punti` : ''}` : "si guadagna nell'Abisso"}</span></span>
              <span class="bar"><span class="fill" style="width:${paraPct.toFixed(1)}%"></span></span>
            </button>
            ${open.has('para') ? `<div class="rite-body">${paragonBlock(state)}</div>` : ''}
          </div>
        </section>
        <h2 class="section">Permanenti <span class="muted">· le Scintille si spendono da sole, nel più economico</span></h2>
        <div class="perks">${perks.map((d) => {
          const lv = perkLevel(a, d.id);
          const maxed = d.max !== undefined && lv >= d.max;
          return `<div class="perk${lv ? '' : ' dim'}"><span>${d.name} <span class="muted">${lv}${d.max ? `/${d.max}` : ''}</span></span>
            <span class="muted">${lv ? perkText(d, perkValue(a, d.id)) : `${perkText(d, d.value)} al Lv 1`}${maxed ? ' · max' : ` · prossimo ${formatNum(perkCost(a, d.id))}`}</span></div>`;
        }).join('')}</div>
        ${PERKS.length > PERKS_SHOWN ? `<button class="link" data-open="perks">${allPerks ? 'Meno ‹' : `Tutti e ${PERKS.length} ›`}</button>` : ''}`;
    },
  };
}

/** Rinascita Solare: Soli, moltiplicatori e pulsante. */
function rebirthBlock(state: GameState, confirm: boolean): string {
  const r = state.rebirth;
  const gain = rebirthGain(state);
  return `<div class="skill-row">
      <div class="skill-head"><span><b class="scint">${r.soli}</b> Soli <span class="muted">· ${r.count} Rinascite</span></span>
        <button class="btn sm${confirm ? ' danger' : ' primary'}" data-a="rebirth"${canRebirth(state) ? '' : ' disabled'}>${confirm ? 'Conferma: azzera le Ascensioni' : `Rinasci · +${gain} Soli`}</button></div>
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
  return `<div class="skill-row">
      <div class="skill-info muted">Livello ${p.level}${free ? ` · <b>${free}</b> punti da spendere` : ''} · ${formatNum(p.xp)} / ${formatNum(paragonCost(p.level))} esperienza Paragon: si guadagna solo nell'Abisso.
        I punti si spendono da soli, a giro: Forza, Vigore, Forza, Precisione, Vigore, Tempra.</div>
    </div>
    <div class="skill-list">${PARAGON.map((d) => {
      const n = p.points[d.id] ?? 0;
      return `<div class="skill-row"><div class="skill-head"><span><b>${d.name}</b> <span class="muted">${n}</span> ·
        ${d.mods.map(([k, v]) => `+${formatStat(k, v * Math.max(1, n))} ${STAT_LABELS[k]}`).join(', ')}${n ? '' : ' <span class="muted">per punto</span>'}</span></div></div>`;
    }).join('')}</div>`;
}

const duration = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h} h ${m} min` : `${m} min`;
};

/** Calcolo offline in corso: restituisce l'aggiornamento (frazione fatta, null = chiudi). */
export function showOfflineProgress(): (done: number | null, r: OfflineReport) => void {
  const box = document.createElement('div');
  box.className = 'modal';
  box.innerHTML = `<div class="modal-box">
    <h2 class="title sm">Bentornato</h2>
    <p class="muted">Il guerriero ha combattuto mentre eri via…</p>
    <div class="bar"><div class="fill"></div></div>
    <p class="muted offline-now"></p></div>`;
  document.body.append(box);
  const fill = box.querySelector<HTMLElement>('.fill')!;
  const now = box.querySelector<HTMLElement>('.offline-now')!;
  return (done, r) => {
    if (done === null) return box.remove();
    fill.style.width = `${(done * 100).toFixed(1)}%`;
    now.textContent = `${Math.floor(done * 100)}% · stage ${r.stageTo} · ${formatNum(r.kills)} nemici`;
  };
}

/** Riepilogo del progresso offline al rientro. */
export function showOfflineReport(r: OfflineReport) {
  const box = document.createElement('div');
  box.className = 'modal';
  const rows: [string, string][] = [
    ['Stage', r.stageTo === r.stageFrom ? String(r.stageTo) : `${r.stageFrom} → <b>${r.stageTo}</b>`],
    ['Nemici sconfitti', formatNum(r.kills)],
    ...(r.deaths ? [['Cadute', String(r.deaths)] as [string, string]] : []),
    ['Oro', `+${formatNum(r.gold)}`],
    ['Esperienza', `+${formatNum(r.xp)}${r.levels ? ` · <b>+${r.levels} livelli</b>` : ''}`],
    ['Essenza', `+${formatNum(r.essence)}`],
    ['Frammenti', `+${formatNum(r.fragments)}`],
    ['Oggetti indossati', String(r.items)],
    ...(r.keys ? [['Chiavi', `+${r.keys}`] as [string, string]] : []),
  ];
  box.innerHTML = `<div class="modal-box">
    <h2 class="title sm">Bentornato</h2>
    <p class="muted">Sei stato via ${duration(r.seconds)}. Il guerriero ha combattuto senza sosta.</p>
    <dl class="stats">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
    <button class="card modal-ok">Riprendi</button></div>`;
  box.addEventListener('click', (ev) => {
    if (ev.target === box || (ev.target as HTMLElement).closest('.modal-ok')) box.remove();
  });
  document.body.append(box);
}
