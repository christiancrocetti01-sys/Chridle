/**
 * Liste compatte: una riga per elemento (nome a sinistra, valore breve a destra), dettagli al tocco.
 * Le righe aperte si ricordano per chiave, così restano aperte quando il pannello si ridisegna.
 */
export function createExpander(root: HTMLElement) {
  const open = new Set<string>();
  root.addEventListener('click', (ev) => {
    const head = (ev.target as HTMLElement).closest<HTMLElement>('[data-li]');
    if (!head) return;
    const k = head.dataset.li!;
    if (open.has(k)) open.delete(k);
    else open.add(k);
    head.parentElement!.classList.toggle('open', open.has(k));
  });
  return {
    /** Una riga: `name` e `right` nell'intestazione cliccabile, `under` sempre visibile, `body` solo da aperta. */
    row(key: string, name: string, right: string, body: string, cls = '', under = '') {
      return `<div class="li${open.has(key) ? ' open' : ''}${cls ? ` ${cls}` : ''}">
        <button class="li-head" data-li="${key}"><span class="li-name">${name}</span><span class="li-right">${right}</span></button>${under}
        <div class="li-body">${body}</div></div>`;
    },
  };
}

/** Riga riassuntiva per ciò che non è ancora disponibile ("N da sbloccare · prossima: …"). */
export const lockedLine = (n: number, what: string, next?: string) =>
  n ? `<p class="li-locked">${n} ${what}${next ? ` · prossima: ${next}` : ''}</p>` : '';
