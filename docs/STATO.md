# Stato del progetto

> File di passaggio di consegne tra sessioni. Aggiornato con `/handoff`.
> Massimo ~60 righe: solo ciò che serve per ripartire.

**Ultimo aggiornamento:** 2026-10-23
**Fase corrente:** 0 — Fondamenta e decisioni
**Prossimo passo:** scaffolding Fase 0 (Vite + TS + Vitest + PixiJS), dopo conferma del piano.

## Fatto
- Brainstorm iniziale (`docs/BRAINSTORM.md`).
- Flusso di lavoro: `CLAUDE.md`, STATO, ROADMAP, GDD, skill `/handoff` e `/riprendi`.
- GDD ampliato e **approvato** dall'utente (ispirazioni: Diablo, PoE, Melvor, NGU, Idle Champions).

## Decisioni prese
- Browser game mobile-first, giocatore singolo, nessun server, **solo online** (niente PWA).
- Grafica **pixel art dettagliata a 60 fps**: combattimento in PixiJS (canvas WebGL), interfaccia in DOM/CSS.
- Asset: si parte da pack pixel art gratuiti (licenze verificate), crediti in `docs/CREDITS.md`.
- Progresso offline sì, **senza limite**.
- **Una sola classe** (Guerriero della Luce); varietà tramite Vie/sottoclassi.

## Domande aperte
- Conferma del piano della Fase 0 (vedi risposta in chat / ROADMAP).

## Note / problemi noti
- (nessuno)
