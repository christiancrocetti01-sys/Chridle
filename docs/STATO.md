# Stato del progetto

> File di passaggio di consegne tra sessioni. Aggiornato con `/handoff`.
> Massimo ~60 righe: solo ciò che serve per ripartire.

**Ultimo aggiornamento:** 2026-10-24 (handoff dopo Fase 3 passo 2)
**Fase corrente:** 3 — Skill e build, passi 1-3 su 5 fatti (skill attive, rune, sinergie per tag). Decisioni in `docs/GDD.md` §6.
**Prossimo passo:** passo 4 — **Costellazioni**
(~30 nodi, 1 punto/livello, respec economico: proporre il piano). Poi Vie.
**Online:** `main` allineato con il passo 3 (sinergie per tag). **Grafica:** minimale (UI DOM + sagoma SVG).

## Gioco online
https://christiancrocetti01-sys.github.io/Chridle/ (ogni push su `main` lo ripubblica, ~1 min).
Si lavora su `claude/epic-allen-10jgj5` e si allinea `main` (fast-forward) quando un passo è approvato.

## Fatto (sintesi)
- Fasi 0-1.5: Vite + TS + Vitest, logica 10 tick/s deterministica, salvataggio versionato, combattimento,
  boss, potenziamenti, UI DOM minimale (manichino SVG, pannello combattimento).
- Fase 2: 12 slot, 7 rarità, 52 affissi + 16 effetti a scatto (`src/data/items.ts`, `src/core/triggers.ts`),
  13 unici e 4 set (`src/data/uniques.ts`), crafting (`src/core/craft.ts`, costi in `src/data/craft.ts`).
- Fase 3 passo 1: Luce, 8 skill (`src/data/skills.ts`, `src/core/skills.ts`, scheda `src/ui/skills.ts`).
  Effetti condivisi con i trigger tramite `applyEffect` (triggers.ts). UI a schede Eroe / Skill.
- Fase 3 passo 2: Essenza di Luce e 12 rune (`src/data/runes.ts`, `src/core/runes.ts`); le rune agiscono in
  `perform`/`castSkill` di skills.ts, Scintilla in `castOnCrit` (chiamato al critico in combat.ts).
- Fase 3 passo 3: sinergie per tag, solo affissi (16: `${tag}Skill` effetto +10% T1, `${tag}Cdr` ricarica −5% T1)
  in `src/data/items.ts`; `skillPower`/`skillCdr` in Stats; `skillValue`/`cooldownTicks` in skills.ts; bonus
  dei tag di una skill sommati, × runa Potenza. Il testo delle skill ora mostra l'effetto reale.
- Salvataggio: **v9** (v7 `item.crafts`, v8 `hero.light` + `skills`, v9 `essence` + `runes`).

## Sessione 2026-10-24 (questa)
- Varietà 4 (crafting) completata e pubblicata; Fase 2 chiusa.
- Fase 3 passi 1 e 2 completati e pubblicati; aggiunta Luce passiva e soglie automatiche su richiesta.

## Scelte fatte da Claude (da confermare se l'utente obietta)
- `triggerChance` per rarità 30/50/75/100% (Epico→Divino); max 20 buff di velocità insieme.
- Anche la rigenerazione conta come "cura in eccesso" (regola overhealShield).
- Statistiche piatte degli unici = valore × 2 (come un T3) × crescita del livello oggetto.
- Crafting: base = smantellamento × ritira 1 / migliora 2×tier / trasferisci 3; fusione = smantellamento della
  rarità ottenuta; trasferimento adatta le piatte al livello oggetto, max 1 effetto a scatto per oggetto.
- Sinergie: riduzione ricarica per tag lineare con tetto 60% (`MAX_SKILL_CDR`), moltiplicata con Rapidità;
  tier usano i moltiplicatori esistenti (effetto 10/15/20/27/35%, ricarica 5/7,5/10/13,5/17,5%).
  Effetto su FOCUS (arma, secondaria, anello, amuleto, reliquia), ricarica su elmo, guanti, mantello, reliquia.
- Valori delle 8 skill e delle 12 rune (vedi file dati); Rapidità/Parsimonia con rendimenti decrescenti
  (`reduction`), Eco e Scintilla con probabilità max 100%; Essenza 1 a nemico, boss ×10, × (1 + stage/10).

## Test
- `npm test`: **115 verdi** (11 file), `npm run build` ok (handoff 2026-10-24).
- Simulazione (`tests/combat.test.ts`): 2 h senza equip stage 32, con equip automatico 51 (era 54: pool di affissi più ampio). Non usa rune né
  crafting e l'equip automatico non valuta trigger/unici/set: la potenza reale delle build non è misurata.

## Note / problemi noti
- Un solo nemico (Ghoul) e un solo boss (Fase 4).
- Progresso offline non calcolato: oltre 50 tick/frame (5 s) il resto viene scartato (Fase 5). Proposto
  all'utente di anticiparlo se pesa: nessuna risposta ancora.
- Verifica visiva: salvataggio di prova iniettato con `page.addInitScript`; generarlo con
  `npx vite-node script.ts` importando `src/core/*`. `vite preview` va aperto su `/`, non su `/Chridle/`.
- Revisione dell'utente dal telefono (Fase 1) mai spuntata.
