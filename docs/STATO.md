# Stato del progetto

> File di passaggio di consegne tra sessioni. Aggiornato da Claude a fine di ogni modifica.
> Massimo ~60 righe: solo ciò che serve per ripartire.

**Ultimo aggiornamento:** 2026-10-27 (Spedizione e doni della Torre, su `main`)
**Fase corrente:** Fase 8 chiusa, grafica fatta. Ora **revisione dell'utente** (ROADMAP "Dopo la Fase 8").
**Prossimo passo:** altri contenuti (elenco sotto): proporne uno all'utente. Poi revisione da telefono.
**Online:** `main` = tutto, «Oltre» e Spedizione comprese (2026-10-27).

## Revisione utente 2026-10-26/27
- Fatto e online (dettagli in GDD): offline 100% (v22), Torre riparte 5 piani sotto il record, punti stella da Torre e
  Ascensioni (v23), `autoStars` guarda avanti `STAR_LOOKAHEAD` = 6.
- Online: regione **«Oltre»** (`BEYOND` in `src/data/constellations.ts`, 51 stelle, 15 notevoli + 3 chiavi di
  volta, regole in `combat.ts`/`skills.ts`/`stats.ts`, costanti in fondo a `src/data/uniques.ts`, v24, `tests/beyond.test.ts`).
  Freni (chiesti dall'utente): Mietitore max +30%, Sangue Freddo +20%, Martello +0,5%/colpo max +150%,
  **Respiro della Battaglia** (`battleBreath`) ricarica la skill solo uccidendo élite e boss (scelta b dell'utente).
- Ritmo 24 h (lama): prima di «Oltre» Torre ~62, Abisso ~28; «Oltre» senza freno a Respiro Torre ~80-90; frenata Torre 70, Abisso 33.
- Fatto (delega utente «scegli tu»): **Spedizione** (`expedition`/`canExpedition` in `src/core/modes.ts`, bottoni nella
  sezione Dungeon di `src/ui/world.ts`, avviso in `main.ts`): chiavi → premi di un Dungeon senza modificatori, dopo il primo
  Dungeon vinto; nel collaudo si usa con ≥ 13 chiavi. Torre: Mitico ogni 25 piani (`TOWER_GRAND_EVERY`). Imprese: Predone V,
  Scalatore V-VI. Nessun cambio al salvataggio. Pozzo dell'Essenza scartato: skill e rune sono già pozzi infiniti.
- Contenuti ancora proposti: zone/boss oltre lo stage 100 (ora ciclano con numeri romani; servono carte nuove),
  unici/set lotto 6, bottino proprio dei Raid, nuovi potenziamenti d'Ascensione, più Lumi.

## Pubblicazione
- Firebase (`firebase.json`, job `firebase` in `.github/workflows/deploy.yml`, `firebase-tools@14`) e GitHub Pages.
  PWA: `public/sw.js` (cambiando strategia alzare `CACHE`), icone da `npm run icone`.

## Domande aperte
- Bonus fisso agli unici nel confronto dell'equip (+20%)?
- Neutro (Corruzione ~0) senza bonus va bene? Abisso quasi fermo dalle ~180 h a 66-67: ammorbidire?

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
- Salvataggio: **v24** (v24 «Oltre», v23 `totals.ascensions`, v22 Veglia Eterna tolta, v21 skill fisse + rimborso rune, v20 `abyss`/`paragon`/`rebirth`), prima **v19** (v11 `vie`, v12 nemico + `keys`/`mode`/`tower`, v13 `ascension`, v14 campi opzionali rune, v15 `hero.sanctity`, v16 `codex`, v17 `collection`, v18 `achievements`, v19 `lumi`).

## Test
- `npm test`: **242 verdi** (24 file), `npm run build` ok, collaudo 24 h di tutti i profili ok dopo la Spedizione (2026-10-27:
  Torre 71-80, Abisso 33-37, record 50-154, 2-4 Rinascite). Il test lento della Collezione ha timeout 20 s.
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
