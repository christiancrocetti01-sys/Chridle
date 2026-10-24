# Stato del progetto

> File di passaggio di consegne tra sessioni. Aggiornato con `/handoff`.
> Massimo ~60 righe: solo ciò che serve per ripartire.

**Ultimo aggiornamento:** 2026-10-24 (handoff: Fase 8 passi 1-2, tutto su `main`)
**Fase corrente:** **Fase 8 — Tutto automatico** (ROADMAP; decisioni in GDD §16). Grafica finale in pausa.
**Prossimo passo:** passo 3 — proporre il piano e chiedere conferma: crafting automatico sugli oggetti indossati
(`src/core/craft.ts`, togliere il pannello in `src/ui/gear.ts`), oro sui Potenziamenti (cfr. `autoBuy` in
`scripts/collaudo.ts`), Paragon e potenziamenti dell'Ascensione automatici, tutto in `src/core/auto.ts` (chiamato in `step`).
**Online:** `main` = branch (866ec4d + handoff).

## Questa sessione (2026-10-24)
- Passo 1: `takeItem`/`absorbInventory` in `src/core/autoequip.ts` (drop, premi modalità, offline, caricamento).
  `gear.inventory` sempre vuoto, `autoSalvage` inutilizzato. Pannello Oggetti senza inventario; crafting manuale rimasto.
- Passo 2 (salvataggio **v21**): `SKILLS` = 6 (`src/data/skills.ts`), `skills.levels`, `bestElement`/`levelSkill`
  in `src/core/skills.ts`; `src/core/auto.ts` (`autoEssence` ogni secondo in `step` e a fine offline, `RUNE_PLAN`,
  `RUNE_ORDER`). Migrazione v21 rimborsa l'Essenza delle rune. UI Skill/Rune in sola lettura. Offline: l'Essenza
  si conta dalle uccisioni (il campione la spende). Collaudo: niente più gestione skill/rune/Lumi manuale.

## Domande aperte
- Ritmo: a 8 h l'eroe è ~2× più avanti di prima (Scintille ~200-300 contro ~80-160, Torre ~52 contro ~37), per la spesa
  "intelligente" dell'Essenza. Ribilanciare al passo 5 (collaudo 240 h) salvo diversa richiesta.
- Lumo attivo: automatico anche lui? (ora lo sceglie il giocatore, il gioco ne compra i livelli)
- Bonus fisso agli unici nel confronto dell'equip (+20%)?
- Achievement "Runologo" ora a 1/2/4/6/8 rune; 32 rune su 40 non si usano più (da togliere o riusare?).
- Bilanciamento: Neutro (Corruzione ~0) senza bonus va bene? Ritmo Rinascite (~30-45 in 10 giorni) ok?

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
- Salvataggio: **v21** (v21 skill fisse + rimborso rune, v20 `abyss`/`paragon`/`rebirth`), prima **v19** (v11 `vie`, v12 nemico + `keys`/`mode`/`tower`, v13 `ascension`, v14 campi opzionali rune, v15 `hero.sanctity`, v16 `codex`, v17 `collection`, v18 `achievements`, v19 `lumi`).

## Test
- `npm test`: **223 verdi** (22 file), `npm run build` ok (handoff 2026-10-24, dopo il passo 2 della Fase 8).
- Collaudo: `npm run collaudo -- --ore 8 [--seed N] [--profilo id]` (`scripts/collaudo.ts`, un processo per profilo:
  5 Vie + uno con sessioni offline). 8 h: nessun NaN/crash/salvataggio rotto, ~30 s. Rilanciarlo dopo ogni sistema nuovo.
  Attenzione: nelle catene di comandi non fidarsi di `npm test | grep` (esce 0 anche se fallisce).
- Collaudo 10 giorni (`--ore 240`, ~20 min): nessun problema. A 240 h: livello ~125, record 160-175, Abisso 37-47,
  Paragon ~170-190, Soli 58-92, collezione 30/30 (dalle ~70 h), imprese 56-57/69 (prima della Fase 8: da rifare).

## Note / problemi noti
- Muro al boss di zona 50 (scudo + rigenerazione): con Via+Stelle ~4 h fermi (rigenerazione 1%/s): **voluto**, spinge ad ascendere.
- Numeri oltre 1e308 rimandati (servono verso stage ~3800; a 10 giorni il record è ~175).
- Revisione da telefono rimandata a dopo la grafica finale (decisione utente).
- Verifica visiva: script in scratchpad (salvataggio con `npx vite-node`, iniettato con `addInitScript`;
  `vite preview` avviato con `setsid`, non usare `pkill -f`). Un `lastSeen` vecchio apre il riepilogo offline.
