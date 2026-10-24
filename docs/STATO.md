# Stato del progetto

> File di passaggio di consegne tra sessioni. Aggiornato con `/handoff`.
> Massimo ~60 righe: solo ciò che serve per ripartire.

**Ultimo aggiornamento:** 2026-10-24
**Fase corrente:** 2 — Equipaggiamento (primo passo fatto). La Fase 1.5 è **in pausa** in attesa degli asset.
**Prossimo passo:** far provare l'equip all'utente e chiedere del bilanciamento (vedi sotto); poi
il resto della Fase 2 secondo il GDD §8: leggendari unici, set, crafting con i Frammenti.
**Asset (Fase 1.5):** budget zero, scelto **GothicVania di ansimuz (CC0)**, eventualmente con lo sfondo
Dark Forest di Val_DeMar (CC0). La rete dell'ambiente blocca opengameart.org/itch.io: l'utente deve
abilitarli (`opengameart.org`, `itch.io`, `*.itch.zone`) o caricare gli zip.

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
- Fase 2 (primo passo): 12 slot, 7 rarità, 10 affissi con tier T1-T5 (`src/data/items.ts`),
  generatore deterministico + equip/smantellamento (`src/core/items.ts`), drop 1/8 e boss sempre
  (almeno Magico), inventario 40, Frammenti, smantellamento automatico per rarità. UI `src/ui/gear.ts`
  con confronto statistiche. Salvataggio v3.
- Test: **47 verdi** (6 file).

## Feedback dell'utente (importante)
- La grafica attuale è stata giudicata "AI slop": sprite fatti a mano come griglie di caratteri e UI
  "dark fantasy" generica (Cinzel + bordi dorati). L'utente vuole qualcosa di **molto più bello**.
  I segnaposto non vanno estesi: vanno sostituiti con asset veri.
- Riferimenti visivi: illustrazione manga B/N anni '80 con cornici ornamentali (stile Saint Seiya)
  e pixel art monocroma con dithering/particelle che si sgretolano (vedi GDD §15).

## Domande aperte
- Bilanciamento equip (`ILVL_GROWTH` = 1.12): simulazione con equip automatico → stage 57 a 2 h
  (senza equip 27), 80 a 8 h, zero morti. Con 1.10 → 43 a 2 h. L'utente deve scegliere.
- Ritmo di inizio partita: approvato dall'utente.
- I Frammenti non si spendono ancora (arriva il crafting).

## Note / problemi noti
- Il boss è il ghoul ×3; un solo tipo di nemico.
- Progresso offline non calcolato: oltre 50 tick/frame il resto viene scartato (Fase 5).
- Colori delle rarità alte: serviranno un'eccezione al filtro (GDD §15).
- Bilanciamento simulato senza equip: ~stage 14 a 10 min, ~27 a 2 h (test in `combat.test.ts`).
- GitHub Pages: l'ambiente `github-pages` deve consentire il branch `main` (già sistemato).
