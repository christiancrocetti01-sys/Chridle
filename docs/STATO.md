# Stato del progetto

> File di passaggio di consegne tra sessioni. Aggiornato con `/handoff`.
> Massimo ~60 righe: solo ciò che serve per ripartire.

**Ultimo aggiornamento:** 2026-10-24 (UI riorganizzata in schede e sotto-schede, pubblicata su `main`)
**Fase corrente:** lato tecnico/contenuti **completato**. Prossima: **grafica finale** (decisione utente).
**Fatto:** UI divisa (richiesta utente: "troppo caotica"). Header compatto (valute, livello/stage, combattimento
affiancato, log 3 righe, Abbandona), barra schede fissa in basso: Eroe (Oggetti/Potenziamenti/Statistiche),
Build (Skill/Rune/Stelle/Via/Lumi), Mondo (Zona/Modalità), Progressi (`src/ui/progress.ts`: Bestiario/Collezione/Imprese),
Ascensione (Ascensione/Rinascita/Paragon). Sotto-schede = blocchi `data-sub`, il pane ha `data-view` (CSS generato in `hud.ts`,
`TABS`); scelta ricordata in `chridle.ui`. Pallini: punti stella, Ascensione/Rinascita pronta, punti Paragon.
**Prossimo passo:** feedback dell'utente sulla nuova struttura, poi piano della grafica (palette, font, schede lunghe).
**Online:** `main` = branch (6c655bd): lotto 5 ed endgame pubblicati.

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
- Lumi: `src/core/lumi.ts` (`checkLumi` accanto alle Imprese), `src/data/lumi.ts`, sezione `src/ui/lumi.ts` (scheda Eroe).
- Lotto 5: 30 unici, 8 set, 7 regole nuove (`src/data/uniques.ts`, costanti in fondo; logica in `combat.ts`/`stats.ts`).
- Endgame: `src/data/endgame.ts`, `src/core/endgame.ts` (Paragon, Rinascita), Abisso in `src/core/modes.ts`/`enemies.ts`;
  UI: Abisso in scheda Mondo, Rinascita e Paragon in scheda Ascensione. Imprese Abissale/Paragone/Rinato.
- Salvataggio: **v20** (v20 `abyss`/`paragon`/`rebirth`), prima **v19** (v11 `vie`, v12 nemico + `keys`/`mode`/`tower`, v13 `ascension`, v14 campi opzionali rune, v15 `hero.sanctity`, v16 `codex`, v17 `collection`, v18 `achievements`, v19 `lumi`).

## Test
- `npm test`: **218 verdi** (21 file), `npm run build` ok (verificato all'handoff).
- Collaudo: `npm run collaudo -- --ore 8 [--seed N] [--profilo id]` (`scripts/collaudo.ts`, un processo per profilo:
  5 Vie + uno con sessioni offline). 8 h: nessun NaN/crash/salvataggio rotto, ~30 s. Rilanciarlo dopo ogni sistema nuovo.
  Attenzione: nelle catene di comandi non fidarsi di `npm test | grep` (esce 0 anche se fallisce).
- Ritmo (`tests/combat.test.ts`, senza Via/Stelle): 2 h con equip automatico stage 50.
- Collaudo 10 giorni (`--ore 240`, ~20 min): nessun problema. A 240 h: livello ~125, record 160-175, Abisso 37-47,
  Paragon ~170-190, Soli 58-92, collezione 30/30 (dalle ~70 h), imprese 56-57/69, rune 27-30/40.

## Note / problemi noti
- Muro al boss di zona 50 (scudo + rigenerazione): con Via+Stelle ~4 h fermi (rigenerazione 1%/s): **voluto**, spinge ad ascendere.
- Collaudo 8 h dopo il bilanciamento: chiavi 5-6,5/h, Raid ~60% vinti, 5-8 Ascensioni, record 62-99
  (Eclissiarca il più veloce, Paladino/Custode i più lenti), 13-14 rune (la prossima 22-36k Essenza).
- Domande aperte (bilanciamento, non bloccano la grafica): Neutro (Corruzione ~0) senza bonus va bene?
  Rinascite ~30-45 in 10 giorni (prima ogni ~10 h, poi ogni ~4-5 h): ritmo ok?
- Numeri oltre 1e308 rimandati (servono verso stage ~3800; a 10 giorni il record è ~175).
- Il confronto oggetti ora usa tutte le statistiche (`stateStats`), non solo gli oggetti.
- Revisione da telefono rimandata a dopo la grafica finale (decisione utente).
- Verifica visiva: script in scratchpad (salvataggio con `npx vite-node`, iniettato con `addInitScript`;
  `vite preview` avviato con `setsid`, non usare `pkill -f`). Un `lastSeen` vecchio apre il riepilogo offline.
