# Chridle — istruzioni per Claude

Idle RPG dark-fantasy per browser/mobile, giocatore singolo ("il guerriero della luce").
Questo file viene caricato automaticamente a ogni sessione: tienilo **breve**.

## All'inizio di ogni sessione (anche dopo /clear)
1. Leggi `docs/STATO.md` (dove siamo, prossimo passo). È la fonte di verità.
2. Leggi solo le parti di `docs/GDD.md` / `docs/ROADMAP.md` che servono al task corrente.
3. Non esplorare tutto il repo: apri solo i file citati in STATO.md o necessari al task.

## Flusso di lavoro (a fasi)
- Lavoriamo un **task alla volta** della fase corrente in `docs/ROADMAP.md`.
- Prima di un task non banale: proponi il piano in 3-6 punti e **chiedi conferma**.
- Domande di design (bilanciamento, gusto, scelte grafiche) → chiedi, non inventare.
- Dopo ogni task: test (`npm test`) + verifica nel browser se tocca la UI, poi commit.
- A fine task aggiorna `docs/STATO.md` (breve) e spunta la ROADMAP.
- Il contesto si avvicina a ~200k token → esegui la skill `/handoff`, poi l'utente fa `/clear` e `/riprendi`.

## Risparmio token
- Risposte concise, niente riassunti di ciò che è già nel diff.
- Leggi file con offset/limit quando sono lunghi; preferisci Grep a letture intere.
- Dati di gioco (skill, oggetti, nemici) in file JSON/TS di dati, generati per lotti: non incollarli in chat.
- Niente subagent salvo richiesta esplicita.

## Convenzioni tecniche
- Comandi: `npm run dev` (locale), `npm test` (Vitest), `npm run build` (tsc + vite).
- `src/core` logica pura e deterministica (niente DOM/Pixi): è l'unica parte con test unitari.
- `src/render` PixiJS: scena 320×180 scalata a multipli interi; logica a 10 tick/s, render 60 fps con `alpha`.
- `src/ui` interfaccia DOM/CSS. `src/data` contenuti come dati.
- Salvataggio in `src/core/save.ts`: cambi allo stato → alza `STATE_VERSION` e aggiungi una migrazione + test.
- Asset esterni: verifica licenza e registrali in `docs/CREDITS.md`.
- Verifica visiva: build + `vite preview` + screenshot Playwright (Chromium in /opt/pw-browsers).
- Commit piccoli e descrittivi.
