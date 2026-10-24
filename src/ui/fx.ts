/** Avvisi passeggeri in alto (livello, bottino raro, traguardi): il "juice" della UI minimale. */
let box: HTMLElement | null = null;

export function toast(html: string, cls = '') {
  box ??= Object.assign(document.body.appendChild(document.createElement('div')), { className: 'toasts' });
  const t = document.createElement('div');
  t.className = `toast ${cls}`;
  t.innerHTML = html;
  box.append(t);
  while (box.children.length > 4) box.firstElementChild!.remove();
  setTimeout(() => t.classList.add('out'), 2600);
  setTimeout(() => t.remove(), 3200);
}

/** Riavvia un'animazione CSS su un elemento (lampo sulla barra colpita). */
export function flash(el: HTMLElement, cls: string) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}
