# Stato del progetto

> File di passaggio di consegne tra sessioni. Aggiornato con `/handoff`.
> Massimo ~60 righe: solo ciò che serve per ripartire.

**Ultimo aggiornamento:** 2026-10-23
**Fase corrente:** 1.5 — Identità visiva ("scena vetrina"), prima di continuare con le feature
**Prossimo passo:** avere la risposta dell'utente sugli asset (budget zero / pack a pagamento / immagini
generate dall'utente) → proporre 3-4 opzioni di pack con anteprime e licenze → **senza comprare né
integrare nulla prima della conferma**. Poi la scena vetrina: asset veri, sfondo parallasse 3-4 strati,
nebbia, luce, particelle ambientali, cornici ornamentali vere nella UI.

## Gioco online
https://christiancrocetti01-sys.github.io/Chridle/ (ogni push su `main` lo ripubblica, ~1 min).
Si lavora su `claude/epic-allen-10jgj5` e si allinea `main` quando un passo è approvato.

## Fatto
- Flusso di lavoro: `CLAUDE.md`, STATO, ROADMAP, GDD (approvato), skill `/handoff` e `/riprendi`.
- Fase 0: Vite + TS + Vitest + PixiJS 8; logica 10 tick/s + render 60 fps interpolato;
  salvataggio versionato (`src/core/save.ts`, ora v2); deploy GitHub Pages funzionante.
- Filtro "inchiostro" (monocromo + dithering Bayer + Luce dorata): `src/render/dither.ts`.
- Fase 1 (prototipo): combattimento deterministico `src/core/combat.ts`, statistiche `src/core/stats.ts`,
  boss ogni 10 uccisioni, morte → stage precedente + allenamento, 3 potenziamenti, effetti
  (`src/render/effects.ts`: sgretolamento in pixel, numeri di danno font 3×5, shake), HUD DOM.
- Test: **32 verdi** (5 file).

## Feedback dell'utente (importante)
- La grafica attuale è stata giudicata "AI slop": sprite fatti a mano come griglie di caratteri e UI
  "dark fantasy" generica (Cinzel + bordi dorati). L'utente vuole qualcosa di **molto più bello**.
  I segnaposto non vanno estesi: vanno sostituiti con asset veri.
- Riferimenti visivi: illustrazione manga B/N anni '80 con cornici ornamentali (stile Saint Seiya)
  e pixel art monocroma con dithering/particelle che si sgretolano (vedi GDD §15).

## Domande aperte
- Budget per gli asset? (zero / qualche decina di € per pack / immagini generate dall'utente / artista)
- Ritmo di inizio partita (prima uccisione ~5 s, primo potenziamento ~20 s): l'utente deve ancora provarlo.

## Note / problemi noti
- Il boss è il ghoul ×3; un solo tipo di nemico.
- Progresso offline non calcolato: oltre 50 tick/frame il resto viene scartato (Fase 5).
- Colori delle rarità alte: serviranno un'eccezione al filtro (GDD §15).
- Bilanciamento simulato: ~stage 14 a 10 min, ~27 a 2 h, poi muro (lo romperà l'equip).
- GitHub Pages: l'ambiente `github-pages` deve consentire il branch `main` (già sistemato).
