# Stato del progetto

> File di passaggio di consegne tra sessioni. Aggiornato con `/handoff`.
> Massimo ~60 righe: solo ciò che serve per ripartire.

**Ultimo aggiornamento:** 2026-10-24 (handoff: UI divisa in schede, equip automatico, inventario senza limite; tutto su `main`)
**Fase corrente:** **grafica finale**: stile "testo puro" alla Kittens Game/Evolve (scelta utente), B/N, serif.
Fatto: palette B/N (token in `:root` di `src/style.css`; colore solo a rarità, barre vita, elementi `.el-*`, avvisi);
font EB Garamond (titolo Cinzel); schede in alto come parole, fisse allo scorrimento (`.navs` in `src/ui/hud.ts`),
sotto-schede in corsivo; niente riquadri; equipaggiamento come righe con i puntini (sagoma tolta, `doll.ts` eliminato);
statistiche e potenziamenti a puntini; inventario a griglia; liste apribili `src/ui/list.ts`; elementi colorati (`elem` in `icons.ts`).
**Prossimo passo:** sentire l'utente dal telefono (`?v=5`); poi stesso schema per Vie, Stelle (pannello dettagli), Modalità.
Valutare con l'utente: smantellamento automatico "fino a Comune" di default (inventario ora illimitato → salvataggio grande).
**Online:** `main` = branch (d3790c8 + handoff).

## Questa sessione (2026-10-24)
- UI divisa (utente: "troppo caotica"): `src/ui/hud.ts` con `TABS` (schede/sotto-schede), blocchi `data-sub` nei pannelli,
  il pane ha `data-view` (CSS generato), scelta ricordata in `localStorage` `chridle.ui`; nuovo `src/ui/progress.ts`
  (Bestiario/Collezione/Imprese tolti da `world.ts`). Dettagli in GDD §15.
- Equip automatico: `src/core/autoequip.ts` (`gearPower`, `equipBest`), pulsante in `src/ui/gear.ts`, test `tests/autoequip.test.ts`.
- Inventario senza limite: tolto `INVENTORY_SIZE` (items/combat/modes/offline, UI, collaudo).

## Gioco online
https://christiancrocetti01-sys.github.io/Chridle/ (ogni push su `main` lo ripubblica, ~1 min).
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
- Salvataggio: **v20** (v20 `abyss`/`paragon`/`rebirth`), prima **v19** (v11 `vie`, v12 nemico + `keys`/`mode`/`tower`, v13 `ascension`, v14 campi opzionali rune, v15 `hero.sanctity`, v16 `codex`, v17 `collection`, v18 `achievements`, v19 `lumi`).

## Test
- `npm test`: **221 verdi** (22 file), `npm run build` ok (verificato all'handoff del 2026-10-24, collaudo 2 h ok dopo l'inventario illimitato).
- Collaudo: `npm run collaudo -- --ore 8 [--seed N] [--profilo id]` (`scripts/collaudo.ts`, un processo per profilo:
  5 Vie + uno con sessioni offline). 8 h: nessun NaN/crash/salvataggio rotto, ~30 s. Rilanciarlo dopo ogni sistema nuovo.
  Attenzione: nelle catene di comandi non fidarsi di `npm test | grep` (esce 0 anche se fallisce).
- Collaudo 10 giorni (`--ore 240`, ~20 min): nessun problema. A 240 h: livello ~125, record 160-175, Abisso 37-47,
  Paragon ~170-190, Soli 58-92, collezione 30/30 (dalle ~70 h), imprese 56-57/69, rune 27-30/40.

## Note / problemi noti
- Muro al boss di zona 50 (scudo + rigenerazione): con Via+Stelle ~4 h fermi (rigenerazione 1%/s): **voluto**, spinge ad ascendere.
- Domande aperte (bilanciamento, non bloccano la grafica): Neutro (Corruzione ~0) senza bonus va bene?
  Rinascite ~30-45 in 10 giorni (prima ogni ~10 h, poi ogni ~4-5 h): ritmo ok?
- Numeri oltre 1e308 rimandati (servono verso stage ~3800; a 10 giorni il record è ~175).
- Revisione da telefono rimandata a dopo la grafica finale (decisione utente).
- Verifica visiva: script in scratchpad (salvataggio con `npx vite-node`, iniettato con `addInitScript`;
  `vite preview` avviato con `setsid`, non usare `pkill -f`). Un `lastSeen` vecchio apre il riepilogo offline.
