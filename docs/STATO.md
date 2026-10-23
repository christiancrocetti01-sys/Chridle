# Stato del progetto

> File di passaggio di consegne tra sessioni. Aggiornato con `/handoff`.
> Massimo ~60 righe: solo ciò che serve per ripartire.

**Ultimo aggiornamento:** 2026-10-23
**Fase corrente:** 1 — Core loop minimo (fatto, in revisione)
**Prossimo passo:** feedback dell'utente giocando dal telefono → ritocchi; poi Fase 2 (equipaggiamento).

## Fatto
- Flusso di lavoro: `CLAUDE.md`, STATO, ROADMAP, GDD (approvato), skill `/handoff` e `/riprendi`.
- Fase 0: Vite + TS + Vitest + PixiJS 8; loop 10 tick/s + render 60 fps; salvataggio versionato;
  deploy GitHub Pages da `main` (`.github/workflows/deploy.yml`).
- Stile "inchiostro" (monocromo + dithering Bayer, Luce dorata): `src/render/dither.ts`.
- Fase 1:
  - `src/core/combat.ts`: tick di combattimento deterministico (RNG `src/core/rng.ts` nello stato),
    eventi `CombatEvent` per il rendering, boss ogni 10 uccisioni, morte → indietro e allenamento.
  - `src/core/stats.ts`: statistiche eroe, scaling nemici, XP, costi. `src/data/{enemies,upgrades,font}.ts`.
  - Salvataggio v2 con migrazione da v1.
  - Render: affondi, lampo bianco al colpo, numeri di danno (font pixel 3×5), critici dorati + shake,
    nemico che si sgretola in pixel alla morte, LV UP, barre HP. `src/render/effects.ts` (pool particelle).
  - HUD DOM: oro, livello/XP, stage/boss, 3 potenziamenti, statistiche.
  - 32 test verdi. Bilanciamento simulato: ~stage 14 a 10 min, ~27 a 2 h (poi muro: lo romperà l'equip).

## Decisioni prese
- Browser game mobile-first, giocatore singolo, nessun server, solo online.
- Stile **oro**: bianco e nero a inchiostro + Luce dorata; rarità alte con più colori.
- Progresso offline sì, senza limite (Fase 5). Una sola classe, varietà con le Vie.

## Domande aperte
- Ritmo: inizio troppo lento/veloce? (prima uccisione ~5 s, primo potenziamento ~20 s)

## Note / problemi noti
- Sprite segnaposto ingranditi ×2 (eroe, ghoul; il boss è il ghoul ×3).
- Progresso offline non calcolato: oltre 50 tick/frame il resto viene scartato.
- Il colore delle rarità alte richiederà un'eccezione al filtro (vedi GDD §15).
