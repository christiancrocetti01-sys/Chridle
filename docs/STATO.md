# Stato del progetto

> File di passaggio di consegne tra sessioni. Aggiornato con `/handoff`.
> Massimo ~60 righe: solo ciò che serve per ripartire.

**Ultimo aggiornamento:** 2026-10-24
**Fase corrente:** 2 — Equipaggiamento (primo passo fatto).
**Prossimo passo:** resto della Fase 2 (GDD §8) puntando su **varietà infinita**: molti più affissi,
leggendari unici con effetti, set, prime sinergie per tag; poi crafting con i Frammenti.
**Grafica:** decisa **minimale** (niente scena, niente asset da scaricare): UI DOM + sagoma SVG.

## Gioco online
https://christiancrocetti01-sys.github.io/Chridle/ (ogni push su `main` lo ripubblica, ~1 min).
Si lavora su `claude/epic-allen-10jgj5` e si allinea `main` quando un passo è approvato.

## Fatto
- Flusso di lavoro: `CLAUDE.md`, STATO, ROADMAP, GDD (approvato), skill `/handoff` e `/riprendi`.
- Fase 0: Vite + TS + Vitest; logica 10 tick/s; salvataggio versionato (`src/core/save.ts`);
  deploy GitHub Pages funzionante.
- Fase 1 (prototipo): combattimento deterministico `src/core/combat.ts`, statistiche `src/core/stats.ts`,
  boss ogni 10 uccisioni, morte → stage precedente + allenamento, 3 potenziamenti, HUD DOM.
- Fase 1.5 (grafica minimale): rimossa la scena PixiJS; manichino `src/ui/doll.ts` (sagoma SVG + 12 slot),
  pannello di combattimento `src/ui/combat.ts` (barre vita + registro eventi). Bundle 23 kB.
- Fase 2 (primo passo): 12 slot, 7 rarità, 10 affissi con tier T1-T5 (`src/data/items.ts`),
  generatore deterministico + equip/smantellamento (`src/core/items.ts`), drop 1/8 e boss sempre
  (almeno Magico), inventario 40, Frammenti, smantellamento automatico per rarità. UI `src/ui/gear.ts`
  con confronto statistiche. Salvataggio v3. Crescita oggetti `ILVL_GROWTH` = 1.10 (scelta utente).
- Test: **40 verdi** (5 file).

## Feedback dell'utente (importante)
- La vecchia grafica era "AI slop". Ora la direzione è: **grafica minimale**, non serve vedere il
  combattimento; ciò che conta è **una varietà infinita di armi, statistiche e sinergie**.

## Domande aperte
- I Frammenti non si spendono ancora (arriva il crafting).

## Note / problemi noti
- Un solo nemico (Ghoul) e un solo boss.
- Progresso offline non calcolato: oltre 50 tick/frame (5 s) il resto viene scartato (Fase 5).
- Bilanciamento simulato (`combat.test.ts`): senza equip stage 27 a 2 h; con equip automatico 43 a 2 h.
- GitHub Pages: l'ambiente `github-pages` deve consentire il branch `main` (già sistemato).
