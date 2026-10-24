# Stato del progetto

> File di passaggio di consegne tra sessioni. Aggiornato con `/handoff`.
> Massimo ~60 righe: solo ciò che serve per ripartire.

**Ultimo aggiornamento:** 2026-10-24 (sessione autonoma: Fasi 3.5 → 7 lotto 2)
**Fase corrente:** 7 — contenuti a lotti (lotti 1-3 fatti). Grafica: minima fino alla fine (decisione utente). Fasi 3-6 completate, **da rivedere con l'utente**.
**Prossimo passo:** 1) l'utente legge `docs/REVISIONE.md` e risponde alle domande; 2) applicare le risposte
(bilanciamento, nomi); 3) se approva, allineare `main` (fast-forward) per pubblicare; 4) lotto 4.
**Online:** `main` = sinergie per tag (Fase 3 passo 3). Tutto il resto solo sul branch `claude/epic-allen-10jgj5`.

## Gioco online
https://christiancrocetti01-sys.github.io/Chridle/ (ogni push su `main` lo ripubblica, ~1 min).
Si lavora su `claude/epic-allen-10jgj5` e si allinea `main` (fast-forward) quando un passo è approvato.

## Fatto (sintesi, dettagli in GDD "Fatto/Deciso")
- Fasi 0-2: motore 10 tick/s, salvataggio versionato, combattimento, oggetti/affissi/trigger/unici/set/crafting.
- Fase 3: Luce e skill (`src/core/skills.ts`), rune, sinergie per tag, Costellazioni (`src/data/constellations.ts`),
  **Vie** (`src/data/vie.ts`, `src/core/vie.ts`, sezione in scheda Eroe `src/ui/vie.ts`).
- Fase 4: zone/famiglie/élite/boss di zona (`src/data/enemies.ts`, `src/core/enemies.ts`), Dungeon/Torre/Raid
  (`src/data/modes.ts`, `src/core/modes.ts`, scheda Mondo `src/ui/world.ts`). `state.mode` = modalità in corso.
- Fase 5: Ascensione (`src/data/ascension.ts`, `src/core/ascension.ts`, scheda `src/ui/ascension.ts`),
  offline (`src/core/offline.ts`, riepilogo in `main.ts`), suffissi numeri fino a Dc.
- Fase 6: icone (`src/ui/icons.ts`), avvisi (`src/ui/fx.ts`), suoni (`src/ui/sound.ts`, chiave `chridle.sound`).
- Fase 7: regioni delle Vie nell'albero (~250 nodi), 5 unici con le regole delle Vie; 30 skill, 24 rune.
- Salvataggio: **v13** (v11 `vie`, v12 nemico rigenerato + `keys`/`mode`/`tower`/totals, v13 `ascension`).

## Test
- `npm test`: **156 verdi** (16 file), `npm run build` ok.
- Collaudo (non nel repo): 4 h simulate con tutti i sistemi, nessun NaN/crash; 1ª Ascensione in < 1 h.
- Ritmo (`tests/combat.test.ts`, senza Via/Stelle): 2 h con equip automatico stage 50.

## Note / problemi noti
- Muro al boss di zona 50 (scudo + rigenerazione): con Via+Stelle ~4 h fermi (rigenerazione già ridotta a 1%/s).
- Le chiavi abbondano dopo le Ascensioni (i boss di zona si rifanno): da valutare.
- Il confronto oggetti ora usa tutte le statistiche (`stateStats`), non solo gli oggetti.
- Pinch a due dita nella scheda Stelle mai verificato su telefono; revisione da telefono (Fase 1) mai spuntata.
- Verifica visiva: script in scratchpad (salvataggio con `npx vite-node`, iniettato con `addInitScript`;
  `vite preview` avviato con `setsid`, non usare `pkill -f`). Un `lastSeen` vecchio apre il riepilogo offline.
