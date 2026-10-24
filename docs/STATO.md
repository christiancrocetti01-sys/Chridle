# Stato del progetto

> File di passaggio di consegne tra sessioni. Aggiornato con `/handoff`.
> Massimo ~60 righe: solo ciò che serve per ripartire.

**Ultimo aggiornamento:** 2026-10-24 (Collezione su `main`; Imprese fatte sul branch, `main` da allineare dopo l'ok)
**Fase corrente:** 7 — contenuti a lotti. Grafica e UI minime fino alla fine (prova da telefono rimandata a dopo).
**Prossimo passo:** far provare le Imprese e allineare `main`. Poi **Lumi** (spiriti compagni con bonus passivi,
GDD §14); altri unici e set; endgame (Abisso, Paragon, Rinascita) alla fine. Proporre il piano prima.
**Online:** `main` = 222462b (Collezione leggendari).

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
- Chiavi: boss di zona al record dell'Ascensione e solo ogni 20 stage (`ZONE_KEY_EVERY`), Torre 1 ogni 10 piani.
  Raid al record − 5 (`RAID_LEVEL_OFFSET`). Dettagli e motivi in GDD §10.
- Codex: `src/core/codex.ts`, `src/data/codex.ts`, `Stats.familyMult` in `damageMult`; UI in `src/ui/world.ts`.
- Furia contro gli stalli: `enemyAtk` (`src/core/enemies.ts`, `FURY_AFTER_S`).
- Collezione leggendari: `src/core/collection.ts` (`discover` a ogni drop/fusione/offline), `src/data/collection.ts`,
  bonus in `stateStats`; evento `drop.discovered`; elenco in `src/ui/world.ts`. UI da rifare alla fine.
- Imprese: `src/core/achievements.ts` (`checkAchievements` in `step` ogni secondo), `src/data/achievements.ts`.
- Salvataggio: **v18** (v11 `vie`, v12 nemico + `keys`/`mode`/`tower`, v13 `ascension`, v14 campi opzionali rune, v15 `hero.sanctity`, v16 `codex`, v17 `collection`, v18 `achievements`).

## Test
- `npm test`: **194 verdi** (19 file), `npm run build` ok.
- Collaudo: `npm run collaudo -- --ore 8 [--seed N] [--profilo id]` (`scripts/collaudo.ts`, un processo per profilo:
  5 Vie + uno con sessioni offline). 8 h: nessun NaN/crash/salvataggio rotto, ~30 s. Rilanciarlo dopo ogni sistema nuovo.
  Attenzione: nelle catene di comandi non fidarsi di `npm test | grep` (esce 0 anche se fallisce).
- Ritmo (`tests/combat.test.ts`, senza Via/Stelle): 2 h con equip automatico stage 50.

## Note / problemi noti
- Muro al boss di zona 50 (scudo + rigenerazione): con Via+Stelle ~4 h fermi (rigenerazione 1%/s): **voluto**, spinge ad ascendere.
- Collaudo 8 h dopo il bilanciamento: chiavi 5-6,5/h, Raid ~60% vinti, 5-8 Ascensioni, record 62-99
  (Eclissiarca il più veloce, Paladino/Custode i più lenti), 13-14 rune (la prossima 22-36k Essenza).
- Domanda aperta: Neutro (Corruzione vicina a 0) senza bonus va bene?
- Il confronto oggetti ora usa tutte le statistiche (`stateStats`), non solo gli oggetti.
- Revisione da telefono rimandata a dopo la grafica finale (decisione utente).
- Verifica visiva: script in scratchpad (salvataggio con `npx vite-node`, iniettato con `addInitScript`;
  `vite preview` avviato con `setsid`, non usare `pkill -f`). Un `lastSeen` vecchio apre il riepilogo offline.
