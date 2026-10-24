# Stato del progetto

> File di passaggio di consegne tra sessioni. Aggiornato con `/handoff`.
> Massimo ~60 righe: solo ciò che serve per ripartire.

**Ultimo aggiornamento:** 2026-10-24 (handoff: revisione chiusa, chiavi più rare, lotto 4 rune, Purezza/Corruzione)
**Fase corrente:** 7 — contenuti a lotti. Grafica e UI minime fino alla fine (prova da telefono rimandata a dopo).
**Prossimo passo:** **test massivo** richiesto dall'utente: script di collaudo **nel repo** (es. `scripts/collaudo.ts`,
`npx vite-node`) che simula ore di gioco con tutti i sistemi (Vie, Stelle, rune, skill, Ascensioni, Dungeon/Torre/Raid,
Corruzione): cerca NaN/crash, misura ritmo, chiavi/ora, Essenza vs costo rune. Proponi il piano prima di scriverlo.
Poi: Codex/Imprese/Lumi (GDD §14), altri unici e set; endgame (Abisso, Paragon, Rinascita) alla fine.
**Online:** `main` = lotto 4 rune (commit 14187e9). **Purezza/Corruzione solo sul branch**: allineare `main` quando l'utente lo chiede.

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
- Purezza/Corruzione: `src/data/corruption.ts`, `applyCorruption` in `src/core/stats.ts` (`Stats.corruption`,
  `healMult`), Santità in `hitHero` (`combat.ts`), riga UI in `src/ui/vie.ts`. Statistiche a punti: `POINT_STATS`.
- Chiavi: boss di zona solo al record dell'Ascensione (`combat.ts`), Torre 1 ogni 10 piani (`TOWER_KEY_EVERY`).
- Salvataggio: **v15** (v11 `vie`, v12 nemico + `keys`/`mode`/`tower`, v13 `ascension`, v14 campi opzionali rune, v15 `hero.sanctity`).

## Test
- `npm test`: **172 verdi** (16 file), `npm run build` ok.
- Vecchio collaudo (script perso, era in scratchpad): 4 h con tutti i sistemi senza NaN/crash. Da rifare dopo chiavi/rune/Corruzione.
- Ritmo (`tests/combat.test.ts`, senza Via/Stelle): 2 h con equip automatico stage 50.

## Note / problemi noti
- Muro al boss di zona 50 (scudo + rigenerazione): con Via+Stelle ~4 h fermi (rigenerazione 1%/s): **voluto**, spinge ad ascendere.
- Da verificare col collaudo: quante chiavi/ora dopo il cambio; costo rune ×1,6 (la 40ª ~4,6 miliardi, voluto).
- Domanda aperta: Neutro (Corruzione vicina a 0) senza bonus va bene?
- Il confronto oggetti ora usa tutte le statistiche (`stateStats`), non solo gli oggetti.
- Revisione da telefono rimandata a dopo la grafica finale (decisione utente).
- Verifica visiva: script in scratchpad (salvataggio con `npx vite-node`, iniettato con `addInitScript`;
  `vite preview` avviato con `setsid`, non usare `pkill -f`). Un `lastSeen` vecchio apre il riepilogo offline.
