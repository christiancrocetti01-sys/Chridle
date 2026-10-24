import { GUIDE, GUIDE_INTRO } from '../data/guide';
import { RARITIES } from '../data/items';
import { createExpander } from './list';

const rarities = () => RARITIES.map((r) => `<span style="color:${r.color}">${r.name}</span>`).join(', ');

/** Guida in una finestra: una riga per argomento, si apre al tocco. Si chiude con «Chiudi» o toccando fuori. */
export function openGuide() {
  const box = document.createElement('div');
  box.className = 'modal';
  box.innerHTML = `<div class="modal-box guide"><h2 class="title sm">Guida</h2><p class="muted">${GUIDE_INTRO}</p>
    <div data-guide></div><button class="btn modal-ok">Chiudi</button></div>`;
  const li = createExpander(box);
  box.querySelector('[data-guide]')!.innerHTML = GUIDE.map((g) =>
    li.row(`g:${g.id}`, `<b>${g.title}</b>`, '', g.text.map((t) => `<p>${t.replace('{rarita}', rarities())}</p>`).join(''))).join('');
  box.addEventListener('click', (ev) => {
    if (ev.target === box || (ev.target as HTMLElement).closest('.modal-ok')) box.remove();
  });
  document.body.append(box);
}
