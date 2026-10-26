# Stato del progetto

> File di passaggio di consegne tra sessioni. Aggiornato da Claude a fine di ogni modifica.
> Massimo ~60 righe: solo ciò che serve per ripartire.

**Ultimo aggiornamento:** 2026-10-26 (offline simulato davvero)
**Fase corrente:** Fase 8 chiusa, grafica fatta. Ora **revisione dell'utente** (ROADMAP "Dopo la Fase 8").
**Prossimo passo:** chiedere all'utente com'è l'offline simulato dal telefono (tempo di calcolo dopo una notte). Poi revisione disegni: `src/ui/art/subjects.ts` (15 nemici normali con la carta
della famiglia, 4 boss dei Raid con quella del boss di zona). Offline resta al 75% (l'utente ha ritirato il 100%).
**Online:** `main` = branch (offline simulato pubblicato 2026-10-26).

## Sessione 2026-10-25 (seconda parte)
- Deploy GitHub Pages falliva da 3 push (test Collezione in timeout 5 s su CI): timeout 20 s.
- Firebase Hosting, progetto `chridle`: https://chridle.web.app. Job `firebase` in `.github/workflows/deploy.yml`,
  separato da Pages, con `firebase-tools@14` (le versioni nuove danno 403 `serviceusage` con l'account adminsdk) e
  secret `FIREBASE_SERVICE_ACCOUNT` (già messo dall'utente). Config: `firebase.json`, `.firebaserc`.
- PWA: `public/manifest.webmanifest`, `public/sw.js` (rete prima per la pagina, cache per `assets/`; cambiando
  strategia alzare `CACHE`), registrato in `main.ts` solo in build. Icone `public/icons/` da `npm run icone`
  (`scripts/icone.ts`, eroe in luce). Verificato: installabile (Pixel 7 emulato) e avvio offline.
- Consigliato all'utente: itch.io e r/incremental_games per farsi trovare (non ancora fatto).

## Domande aperte
- Bonus fisso agli unici nel confronto dell'equip (+20%)?
- Neutro (Corruzione ~0) senza bonus va bene? Abisso quasi fermo dalle ~180 h a 66-67: ammorbidire?

## Gioco online
https://christiancrocetti01-sys.github.io/Chridle/ (ogni push su `main` lo ripubblica, ~1 min).
Anche su https://chridle.web.app (Firebase, stesso workflow).
Si lavora su `claude/epic-allen-10jgj5` e si allinea `main` (fast-forward) quando un passo è approvato.

## Fatto (sintesi, dettagli in GDD "Fatto/Deciso")
- Fasi 0-2: motore 10 tick/s, salvataggio versionato, combattimento, oggetti/affissi/trigger/unici/set/crafting.
- Fase 3: Luce e skill (`src/core/skills.ts`), rune, sinergie per tag, Costellazioni (`src/data/constellations.ts`),
  **Vie** (`src/data/vie.ts`, `src/core/vie.ts`, sotto-scheda Build › Via `src/ui/vie.ts`).
- Fase 4: zone/famiglie/élite/boss di zona (`src/data/enemies.ts`, `src/core/enemies.ts`), Dungeon/Torre/Raid
  (`src/data/modes.ts`, `src/core/modes.ts`, scheda Mondo `src/ui/world.ts`). `state.mode` = modalità in corso.
- Fase 5: Ascensione (`src/data/ascension.ts`, `src/core/ascension.ts`, scheda `src/ui/ascension.ts`),
  offline (`src/core/offline.ts`, riepilogo in `main.ts`), suffissi numeri fino a Dc.
- Fase 6: icone (`src/ui/icons.ts`), avvisi (`src/ui/fx.ts`), suoni (`src/ui/sound.ts`, chiave `chridle.sound`).
- Fase 8 passi 1-2: equip automatico (`src/core/autoequip.ts`), 6 skill fisse, Essenza spesa da sola (salvataggio v21).
- Fase 7: regioni delle Vie nell'albero (~250 nodi), 5 unici con le regole delle Vie; 30 skill, 40 rune
  (lotto 4: buff a tempo delle rune in `hero.buffs` con `dodge`/`defPct`/`reflect`; `enemy.dawn`/`harvest`).
- Purezza/Corruzione: `src/data/corruption.ts`, `applyCorruption` in `src/core/stats.ts` (`Stats.corruption`,
  `healMult`), Santità in `hitHero` (`combat.ts`), riga UI in `src/ui/vie.ts`. Statistiche a punti: `POINT_STATS`.
- Chiavi: boss di zona al record dell'Ascensione e solo ogni 20 stage (`ZONE_KEY_EVERY`), Torre 1 ogni 10 piani.
  Raid al record − 5 (`RAID_LEVEL_OFFSET`). Dettagli e motivi in GDD §10.
- Codex: `src/core/codex.ts`, `src/data/codex.ts`, `Stats.familyMult` in `damageMult`; UI in `src/ui/progress.ts`.
- Furia contro gli stalli: `enemyAtk` (`src/core/enemies.ts`, `FURY_AFTER_S`).
- Collezione leggendari: `src/core/collection.ts` (`discover` a ogni drop/fusione/offline), `src/data/collection.ts`,
  bonus in `stateStats`; evento `drop.discovered`; elenco in `src/ui/progress.ts`.
- Imprese: `src/core/achievements.ts` (`checkAchievements` in `step` ogni secondo), `src/data/achievements.ts`.
- Lumi: `src/core/lumi.ts` (`checkLumi` accanto alle Imprese), `src/data/lumi.ts`, sezione `src/ui/lumi.ts` (Build › Lumi).
- Lotto 5: 30 unici, 8 set, 7 regole nuove (`src/data/uniques.ts`, costanti in fondo; logica in `combat.ts`/`stats.ts`).
- Endgame: `src/data/endgame.ts`, `src/core/endgame.ts` (Paragon, Rinascita), Abisso in `src/core/modes.ts`/`enemies.ts`;
  UI: Abisso in scheda Mondo, Rinascita e Paragon in scheda Ascensione. Imprese Abissale/Paragone/Rinato.
- Salvataggio: **v21** (v21 skill fisse + rimborso rune, v20 `abyss`/`paragon`/`rebirth`), prima **v19** (v11 `vie`, v12 nemico + `keys`/`mode`/`tower`, v13 `ascension`, v14 campi opzionali rune, v15 `hero.sanctity`, v16 `codex`, v17 `collection`, v18 `achievements`, v19 `lumi`).

## Test
- `npm test`: **219 verdi** (23 file), `npm run build` ok (2026-10-25, handoff). Il test lento della Collezione ha timeout 20 s.
- Collaudo: `npm run collaudo -- --ore 8 [--seed N] [--profilo id]` (`scripts/collaudo.ts`, un processo per profilo:
  5 Vie + uno con sessioni offline). 8 h: nessun NaN/crash/salvataggio rotto, ~30 s. Rilanciarlo dopo ogni sistema nuovo.
  Attenzione: nelle catene di comandi non fidarsi di `npm test | grep` (esce 0 anche se fallisce).
- Collaudo 10 giorni (`--ore 240`, ~19 min) dopo il ritocco `LATE_STAGE` (nemici più morbidi dallo stage 150): nessun
  problema. Record massimo 212-228 (prima 169-191), Abisso 66-67 (prima 50; di nuovo quasi fermo dalle ~180 h),
  Torre 120-124 (prima 95-97), livello 156-175, Paragon 221-240, Rinascite 21-28 (prima 24-38), imprese 59-62/69.

## Note / problemi noti
- Muro al boss di zona 50 (scudo + rigenerazione): con Via+Stelle ~4 h fermi (rigenerazione 1%/s): **voluto**, spinge ad ascendere.
- Numeri oltre 1e308 rimandati (servono verso stage ~3800; a 10 giorni il record è ~220).
- Verifica visiva: script in scratchpad (non sopravvive alla sessione: ricrearlo) (salvataggio con `npx vite-node`, iniettato con `addInitScript`;
  `vite preview` avviato con `setsid`, non usare `pkill -f`). Un `lastSeen` vecchio apre il riepilogo offline.
