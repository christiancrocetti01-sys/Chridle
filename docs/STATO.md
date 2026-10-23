# Stato del progetto

> File di passaggio di consegne tra sessioni. Aggiornato con `/handoff`.
> Massimo ~60 righe: solo ciò che serve per ripartire.

**Ultimo aggiornamento:** 2026-10-23
**Fase corrente:** 0 — Fondamenta e decisioni
**Prossimo passo:** attivare GitHub Pages (serve branch `main`, vedi domande aperte), poi revisione Fase 0 → Fase 1.

## Fatto
- Brainstorm iniziale (`docs/BRAINSTORM.md`).
- Flusso di lavoro: `CLAUDE.md`, STATO, ROADMAP, GDD, skill `/handoff` e `/riprendi`.
- **Fase 0 (codice)**: Vite + TS + Vitest + PixiJS 8; loop 10 tick/s + render 60 fps interpolato;
  salvataggio versionato con migrazioni e backup se corrotto; scena pixel art di prova (eclissi, eroe, ghoul);
  workflow `.github/workflows/deploy.yml` (test + build + Pages). 14 test verdi, verificato con screenshot.
- GDD ampliato e **approvato** dall'utente (ispirazioni: Diablo, PoE, Melvor, NGU, Idle Champions).

## Decisioni prese
- Browser game mobile-first, giocatore singolo, nessun server, **solo online** (niente PWA).
- Grafica **pixel art dettagliata a 60 fps**: combattimento in PixiJS (canvas WebGL), interfaccia in DOM/CSS.
- Asset: si parte da pack pixel art gratuiti (licenze verificate), crediti in `docs/CREDITS.md`.
- Progresso offline sì, **senza limite**.
- **Una sola classe** (Guerriero della Luce); varietà tramite Vie/sottoclassi.

## Domande aperte
- Il repo non ha `main`: creare `main` da questo branch e impostarlo come default, poi
  Settings → Pages → Source: "GitHub Actions".

## Note / problemi noti
- Sprite segnaposto ingranditi ×2: da sostituire con asset veri (Fase 6 o prima).
- Il progresso offline non è ancora calcolato: i tick oltre 50/frame vengono scartati.
