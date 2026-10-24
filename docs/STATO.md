# Stato del progetto

> File di passaggio di consegne tra sessioni. Aggiornato con `/handoff`.
> Massimo ~60 righe: solo ciò che serve per ripartire.

**Ultimo aggiornamento:** 2026-10-24 (revisione con l'utente chiusa, `main` pubblicato, chiavi più rare)
**Fase corrente:** 7 — contenuti a lotti (lotti 1-4 fatti, tutti online). Grafica: minima fino alla fine. Fasi 3-6 **approvate**.
**Prossimo passo:** 1) l'utente prova il gioco dal telefono (Fase 1, mai fatto); 2) prossimo contenuto:
poi Purezza/Corruzione come sistema a parte (da progettare con l'utente), Codex/Imprese/Lumi.
**Online:** `main` allineato al branch il 2026-10-24. Le decisioni della revisione sono nel GDD ("Deciso").

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
- Fase 7: regioni delle Vie nell'albero (~250 nodi), 5 unici con le regole delle Vie; 30 skill, 40 rune
  (lotto 4: buff a tempo delle rune in `hero.buffs` con `dodge`/`defPct`/`reflect`; `enemy.dawn`/`harvest`).
- Salvataggio: **v14** (v11 `vie`, v12 nemico rigenerato + `keys`/`mode`/`tower`/totals, v13 `ascension`, v14 campi opzionali delle rune).

## Test
- `npm test`: **163 verdi** (15 file), `npm run build` ok.
- Collaudo (non nel repo): 4 h simulate con tutti i sistemi, nessun NaN/crash; 1ª Ascensione in < 1 h.
- Ritmo (`tests/combat.test.ts`, senza Via/Stelle): 2 h con equip automatico stage 50.

## Note / problemi noti
- Muro al boss di zona 50 (scudo + rigenerazione): con Via+Stelle ~4 h fermi (rigenerazione 1%/s): **voluto**, spinge ad ascendere.
- Chiavi: boss di zona solo al record, Torre 1 ogni 10 piani (fatto 2026-10-24); collaudo completo da rifare.
- Il confronto oggetti ora usa tutte le statistiche (`stateStats`), non solo gli oggetti.
- Pinch a due dita nella scheda Stelle mai verificato su telefono; revisione da telefono (Fase 1) mai spuntata.
- Verifica visiva: script in scratchpad (salvataggio con `npx vite-node`, iniettato con `addInitScript`;
  `vite preview` avviato con `setsid`, non usare `pkill -f`). Un `lastSeen` vecchio apre il riepilogo offline.
