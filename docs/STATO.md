# Stato del progetto

> File di passaggio di consegne tra sessioni. Aggiornato con `/handoff`.
> Massimo ~60 righe: solo ciò che serve per ripartire.

**Ultimo aggiornamento:** 2026-10-23
**Fase corrente:** 0 — Fondamenta e decisioni
**Prossimo passo:** l'utente rivede le **[proposta]** in `docs/GDD.md`; poi scaffolding (Vite + TS + Vitest).

## Fatto
- Brainstorm iniziale (`docs/BRAINSTORM.md`).
- Flusso di lavoro: `CLAUDE.md`, STATO, ROADMAP, GDD, skill `/handoff` e `/riprendi`.
- GDD ampliato con proposte complete (lore, Vie, statistiche, skill/rune, Costellazioni, equip,
  modalità, valute, strati di prestige, offline, meta, arte).

## Decisioni prese
- Browser game mobile-first, giocatore singolo, nessun server, **solo online** (niente PWA).
- Interfaccia DOM/CSS + canvas solo per l'area di combattimento.
- Asset: si parte da risorse gratuite (game-icons.net, pack CC0), crediti in `docs/CREDITS.md`.
- Progresso offline sì, **senza limite**.
- **Una sola classe** (Guerriero della Luce); varietà tramite Vie/sottoclassi.

## Domande aperte
- Conferma/modifica delle sezioni [proposta] del GDD (in particolare: lore, 5 Vie, Luce/Purezza, modalità).

## Note / problemi noti
- (nessuno)
