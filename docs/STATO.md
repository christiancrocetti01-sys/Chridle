# Stato del progetto

> File di passaggio di consegne tra sessioni. Aggiornato da Claude a fine di ogni modifica.
> Massimo ~60 righe: solo ciò che serve per ripartire.

**Ultimo aggiornamento:** 2026-10-27 (10 punti del report applicati, ramo `claude/epic-allen-10jgj5` → `main`)
**Fase corrente:** Fase 8 chiusa, grafica fatta. Ora **revisione dell'utente** (ROADMAP "Dopo la Fase 8").
**Prossimo passo:** l'utente prova online i 10 punti del report applicati (delega: «bilanciato e longevo»).
  Aperti: Dungeon ancora mai persi anche al record − 1; Raid scaduti nel profilo offline del collaudo (16%).
**Online:** `main` = tutto, restyling e 10 punti compresi (2026-10-27).

## 10 punti del report applicati (2026-10-27, dettagli in GDD)
- Equip: regola nuova = +20% (`equipPower`, `src/core/autoequip.ts`). Lumi inattivi salgono con l'Essenza (costo ÷25%).
  Paragon per Via (`VIA_PARAGON` in `auto.ts`). Neutro: Equilibrio fino a +15% (`equilibrium`, `src/data/corruption.ts`).
- Rinascita: soglia +15% a Rinascita (`rebirthThreshold`). Dungeon al record − 1. Raid 5 sotto min(record, stage) (`raidLevel`).
- Segni dei cicli dallo stage 201 (`zoneSigns`, `signReward`, `bossMechanics` in `src/data/enemies.ts`).
- Collezione Ascesa: unici Ascesi ✦ ×2,5 da Guardiani Abisso 25+ (2,5%) e Raid 150+ (`src/data/collection.ts`, v25).
- Collaudo 240 h dopo: Torre 169-198, Abisso 96-114, Paragon 265-360, Rinascite 21-27 (offline 40), Ascesa 24-30/45,
  collezione 45/45. Ritmo +~5% sul collaudo precedente: lasciato così (più contenuti da inseguire).

## Revisione utente 2026-10-26/27
- Fatto e online prima di oggi: offline 100%, Torre −5 piani, punti stella, regione «Oltre» (freni chiesti dall'utente),
  Spedizione, Mitico ogni 25 piani di Torre (dettagli in GDD).
- Contenuti (2026-10-27, «finisci tutti i punti»): fatto **zone 11-20** (stage 101-200, 10 boss nuovi con carte in
  `BOSS_ART`; dopo lo stage 200 si ricomincia col numero romano), **lotto 6** (11 unici, set Gladiatore e Araldo
  dell'Alba), **bottino dei Raid** (un unico proprio per boss, 25%, `UniqueDef.raid`),
  **4 potenziamenti d'Ascensione** (Tempra, Giudizio, Prisma, Chiaviere), **4 Lumi** (Mezzaluna, Pallido, Stellina,
  Solicello). Collaudo 24 h dopo: Torre 77-86, Abisso 37-43 (+~8%), record max 139-180.
- Revisione completa (2026-10-27): corretti i tag delle skill elementali (`skillTags` in `src/core/skills.ts`: le esplosioni
  prendono il tag del loro elemento; prima 8 affissi + bonus di Inquisitore/Custode senza effetto), 6 nomi doppi di
  affissi, notevole «Anima di Brace», guida. Report con collaudo 240 h e 10 decisioni: `docs/report/revisione-2026-10-27.html`
  (pubblicato anche come artifact). Generatore nello scratchpad (non sopravvive: dati da `npm run collaudo -- --ore 240`).

## Restyling UI (2026-10-27)
- `src/ui/hud.ts`: barra in alto (valute, stage, menu ≡ con suoni e guida), 5 schede fisse in basso (Battaglia, Eroe,
  Mondo, Rituali, Codex; id interni `battle/hero/world/ascension/progress`), titolo + sotto-schede segmentate per pane,
  riquadro «Ascensione/Rinascita pronta» (`todo`, attributo `data-go`: **mai `data-sub` fuori dai pane**, lo nasconde il CSS).
- `src/ui/combat.ts`: carta del nemico grande al centro, eroe in una riga. `src/ui/gear.ts`: slot in righe con cornice della
  rarità, dettaglio sotto la riga toccata. Palette e componenti in fondo a `src/style.css` (blocco «Breviario di Luce»).
- Passo 2: `src/ui/world.ts` carte `ModeCard` (regole dietro `data-info`), `src/ui/ascension.ts` blocco `.rite` + righe
  Rinascita/Paragon (`data-open`). Mondo e Rituali non hanno più sotto-schede (`subs: []`).

## Pubblicazione
- Firebase (`firebase.json`, job `firebase` in `.github/workflows/deploy.yml`, `firebase-tools@14`) e GitHub Pages.
  PWA: `public/sw.js` (cambiando strategia alzare `CACHE`), icone da `npm run icone`.

## Domande aperte
- Dungeon mai persi (anche al record − 1): lasciare (è un idle) o alzarli? Raid scaduti nel profilo offline del collaudo.

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
- Salvataggio: **v25** (v25 `ascended`, v24 «Oltre», v23 `totals.ascensions`, v22 Veglia Eterna tolta, v21 skill fisse + rimborso rune, v20 `abyss`/`paragon`/`rebirth`), prima **v19** (v11 `vie`, v12 nemico + `keys`/`mode`/`tower`, v13 `ascension`, v14 campi opzionali rune, v15 `hero.sanctity`, v16 `codex`, v17 `collection`, v18 `achievements`, v19 `lumi`).

## Test
- `npm test`: **260 verdi** (24 file), `npm run build` ok (anche dopo il restyling, verificato con screenshot 390/1100 px), collaudo 24 h di tutti i profili ok dopo la Spedizione (2026-10-27:
  Torre 71-80, Abisso 33-37, record 50-154, 2-4 Rinascite). Il test lento della Collezione ha timeout 20 s.
- Collaudo: `npm run collaudo -- --ore 8 [--seed N] [--profilo id]` (`scripts/collaudo.ts`, un processo per profilo:
  5 Vie + uno con sessioni offline). 8 h: nessun NaN/crash/salvataggio rotto, ~30 s. Rilanciarlo dopo ogni sistema nuovo.
  Attenzione: nelle catene di comandi non fidarsi di `npm test | grep` (esce 0 anche se fallisce).
- Collaudo 10 giorni del 2026-10-27 (~30-47 min, con tutti i contenuti, prima della correzione dei tag): nessun problema.
  Record 271-370, Torre 158-183, Abisso 91-108 (non si ferma più), Paragon 242-313, Soli 64-124, Rinascite 32-54,
  Collezione 45/45, imprese 62-66/72. Collaudo 24 h dopo la correzione dei tag: invariato (Torre 73-88, Abisso 35-43).
- Collaudo 10 giorni precedente (25/10, prima di «Oltre»): record 212-228, Abisso 66-67 fermo dalle ~180 h, Torre 120-124.

## Note / problemi noti
- Muro al boss di zona 50 (scudo + rigenerazione): con Via+Stelle ~4 h fermi (rigenerazione 1%/s): **voluto**, spinge ad ascendere.
- Numeri oltre 1e308 rimandati (servono verso stage ~3800; a 10 giorni il record è ~220).
- Verifica visiva: script in scratchpad (non sopravvive alla sessione: ricrearlo) (salvataggio con `npx vite-node`, iniettato con `addInitScript`;
  `vite preview` avviato con `setsid`, non usare `pkill -f`). Un `lastSeen` vecchio apre il riepilogo offline.
