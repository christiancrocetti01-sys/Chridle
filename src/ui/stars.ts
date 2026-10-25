import { emptyMods } from '../core/items';
import type { GameState } from '../core/state';
import { STARS, STAR_BY_ID, type StarNode } from '../data/constellations';
import { STAT_LABELS, type StatKey } from '../data/items';
import { RULE_TEXT } from '../data/uniques';
import { formatStat } from './gear';

const RADIUS = { start: 12, small: 8, notable: 14, keystone: 19 } as const;
const KIND_TEXT = { start: 'Centro', small: 'Stella', notable: 'Stella notevole', keystone: 'Chiave di volta' } as const;
const PAD = 40;
const MIN_W = 150;
/** All'apertura si vede il centro: l'albero intero su telefono è troppo piccolo. */
const START_W = 520;

const modText = (stat: StatKey, v: number) => `+${formatStat(stat, v)} ${STAT_LABELS[stat]}`;

function nodeText(n: StarNode): string {
  const lines = n.mods.map(([k, v]) => modText(k, v));
  if (n.rule) lines.push(`<span class="rule">${RULE_TEXT[n.rule]}</span>`);
  return lines.join('<br>') || '<span class="muted">Punto di partenza</span>';
}

/** Scheda Stelle (sola lettura, le prende il gioco): albero SVG con trascinamento e zoom, dettaglio della stella scelta e riepilogo. */
export function createStarPanel(root: HTMLElement) {
  const xs = STARS.map((n) => n.x);
  const ys = STARS.map((n) => n.y);
  const full = { x: Math.min(...xs) - PAD, y: Math.min(...ys) - PAD, w: 0, h: 0 };
  full.w = Math.max(...xs) + PAD - full.x;
  full.h = Math.max(...ys) + PAD - full.y;

  const edges: string[] = [];
  for (const n of STARS) {
    for (const l of n.links) {
      if (n.id > l) continue;
      const m = STAR_BY_ID.get(l)!;
      edges.push(`<line data-e="${n.id}|${l}" x1="${n.x}" y1="${n.y}" x2="${m.x}" y2="${m.y}"/>`);
    }
  }
  const circles = STARS.map((n) => `<circle data-n="${n.id}" class="star ${n.kind}" cx="${n.x}" cy="${n.y}" r="${RADIUS[n.kind]}"/>`);

  root.innerHTML = `
    <div class="row"><span><b data-t="taken">0</b> stelle prese <span class="muted">· le sceglie il gioco, salendo di livello</span></span></div>
    <div class="star-map"><svg data-t="svg" viewBox="${full.x} ${full.y} ${full.w} ${full.h}">
      <g class="star-links">${edges.join('')}</g><g>${circles.join('')}</g></svg>
      <div class="star-zoom"><button class="btn sm" data-z="1">+</button><button class="btn sm" data-z="-1">−</button><button class="btn sm" data-z="0">⤢</button></div>
    </div>
    <div class="skill-row star-detail" data-t="detail"></div>
    <h2 class="section">Bonus delle stelle</h2>
    <div class="skill-info" data-t="summary"></div>`;
  const q = <T extends Element = HTMLElement>(k: string) => root.querySelector<T>(`[data-t="${k}"]`)!;
  const svg = q<SVGSVGElement>('svg');
  const refs = { taken: q('taken'), detail: q('detail'), summary: q('summary') };
  const nodeEls = new Map([...svg.querySelectorAll<SVGCircleElement>('[data-n]')].map((c) => [c.dataset.n!, c]));
  const edgeEls = [...svg.querySelectorAll<SVGLineElement>('[data-e]')].map((e) => ({ el: e, ids: e.dataset.e!.split('|') }));

  let selected: string | null = null;
  let lastKey = '';
  const start = { x: -START_W / 2, y: (-START_W / 2) * (full.h / full.w), w: START_W, h: START_W * (full.h / full.w) };
  let view = { ...start };
  const setView = () => svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`);
  setView();

  /** Zoom di `f` (>1 avvicina) attorno a un punto in coordinate dell'albero. */
  const zoom = (f: number, cx = view.x + view.w / 2, cy = view.y + view.h / 2) => {
    const w = Math.min(full.w * 1.2, Math.max(MIN_W, view.w / f));
    const k = w / view.w;
    view = { x: cx - (cx - view.x) * k, y: cy - (cy - view.y) * k, w, h: view.h * k };
    setView();
  };
  const toTree = (clientX: number, clientY: number) => {
    const r = svg.getBoundingClientRect();
    // il viewBox mantiene le proporzioni: la scala è quella del lato più stretto
    const s = Math.max(view.w / r.width, view.h / r.height);
    return { x: view.x + view.w / 2 + (clientX - r.left - r.width / 2) * s, y: view.y + view.h / 2 + (clientY - r.top - r.height / 2) * s, s };
  };

  // trascinamento con un dito/mouse, pinch con due dita
  const pointers = new Map<number, { x: number; y: number }>();
  let moved = 0;
  let pinch = 0;
  // con il pointer capture il pointerup arriva all'svg: la stella toccata si ricorda qui
  let downOn: string | undefined;
  svg.addEventListener('pointerdown', (e) => {
    downOn = (e.target as Element).closest<SVGElement>('[data-n]')?.dataset.n;
    svg.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) moved = 0;
  });
  svg.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    if (pointers.size === 1) {
      const { s } = toTree(e.clientX, e.clientY);
      view.x -= (e.clientX - p.x) * s;
      view.y -= (e.clientY - p.y) * s;
      moved += Math.abs(e.clientX - p.x) + Math.abs(e.clientY - p.y);
      setView();
    }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const c = toTree((a.x + b.x) / 2, (a.y + b.y) / 2);
      if (pinch) zoom(d / pinch, c.x, c.y);
      pinch = d;
      moved = Infinity;
    }
  });
  const up = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = 0;
  };
  svg.addEventListener('pointerup', (e) => {
    if (pointers.size === 1 && moved < 8 && downOn) {
      selected = downOn;
      lastKey = '';
    }
    up(e);
  });
  svg.addEventListener('pointercancel', up);
  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const c = toTree(e.clientX, e.clientY);
    zoom(e.deltaY < 0 ? 1.2 : 1 / 1.2, c.x, c.y);
  }, { passive: false });

  root.addEventListener('click', (ev) => {
    const t = ev.target as HTMLElement;
    const z = t.closest<HTMLElement>('[data-z]')?.dataset.z;
    if (z === '0') { view = { ...full }; setView(); }
    else if (z) zoom(z === '1' ? 1.5 : 1 / 1.5);
  });

  return {
    update(state: GameState) {
      const key = JSON.stringify([state.stars, state.hero.level, selected]);
      if (key === lastKey) return;
      lastKey = key;
      const taken = new Set(state.stars);
      refs.taken.textContent = String(taken.size);
      for (const [id, el] of nodeEls) {
        const on = taken.has(id) || STAR_BY_ID.get(id)!.kind === 'start';
        el.classList.toggle('on', on);
        el.classList.toggle('reachable', !on && STAR_BY_ID.get(id)!.links.some((l) => taken.has(l) || l === 'centro'));
        el.classList.toggle('sel', id === selected);
      }
      const lit = (id: string) => taken.has(id) || id === 'centro';
      for (const e of edgeEls) e.el.classList.toggle('on', lit(e.ids[0]) && lit(e.ids[1]));

      const n = selected ? STAR_BY_ID.get(selected) : undefined;
      refs.detail.hidden = !n;
      if (n) {
        const btn = taken.has(n.id) ? '<span class="muted">presa</span>' : '';
        refs.detail.innerHTML = `<div class="skill-head"><span><b>${n.name}</b> <span class="muted">${KIND_TEXT[n.kind]}</span></span>${btn}</div>
          <div class="skill-info">${nodeText(n)}</div>`;
      }

      const m = emptyMods();
      const rules: string[] = [];
      for (const id of state.stars) {
        const s = STAR_BY_ID.get(id)!;
        for (const [k, v] of s.mods) m[k] += v;
        if (s.rule) rules.push(`<span class="rule">${RULE_TEXT[s.rule]}</span>`);
      }
      const mods = (Object.keys(m) as StatKey[]).filter((k) => m[k]).map((k) => modText(k, m[k]));
      refs.summary.innerHTML = [...rules, ...mods].join('<br>') || '<span class="muted">Nessuna stella presa: arriveranno salendo di livello.</span>';
    },
  };
}
