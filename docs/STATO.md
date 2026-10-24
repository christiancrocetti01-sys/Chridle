# Stato del progetto

> File di passaggio di consegne tra sessioni. Aggiornato con `/handoff`.
> Massimo ~60 righe: solo ciò che serve per ripartire.

**Ultimo aggiornamento:** 2026-10-24 (handoff dopo Fase 3 passo 4)
**Fase corrente:** 3 — Skill e build, passi 1-4 su 5 fatti (skill, rune, sinergie per tag, Costellazioni).
Decisioni in `docs/GDD.md` §6-7.
**Prossimo passo:** 1) chiedere all'utente se approva le Costellazioni (provate da lui?) e allineare `main`
(fast-forward); 2) passo 5 — **Vie** (classi e sottoclassi, GDD §5/§7): proporre il piano in 3-6 punti,
legando ogni Via a una regione dell'albero (`src/data/constellations.ts`, rami offesa/difesa/luce).
**Online:** `main` = sinergie per tag (passo 3). Costellazioni solo sul branch. **Grafica:** minimale.

## Gioco online
https://christiancrocetti01-sys.github.io/Chridle/ (ogni push su `main` lo ripubblica, ~1 min).
Si lavora su `claude/epic-allen-10jgj5` e si allinea `main` (fast-forward) quando un passo è approvato.

## Fatto (sintesi)
- Fasi 0-2: motore 10 tick/s deterministico, salvataggio versionato, combattimento, boss, potenziamenti;
  12 slot, 7 rarità, affissi + effetti a scatto (`src/data/items.ts`, `src/core/triggers.ts`), unici e set
  (`src/data/uniques.ts`), crafting (`src/core/craft.ts`).
- Fase 3.1-3.2: Luce, 8 skill (`src/core/skills.ts`, scheda `src/ui/skills.ts`), 12 rune (`src/core/runes.ts`).
- Fase 3.3: 16 affissi `${tag}Skill` / `${tag}Cdr`; `skillPower`/`skillCdr` in Stats; `skillValue`,
  `cooldownTicks(state, hero, def)`, `lightCost(state, hero, def)`, `canCast(state, hero, id)` in skills.ts.
- Fase 3.4: Costellazioni. Generatore `src/data/constellations.ts` (148 nodi: 3 rami con spina + 4 ammassi ad
  anello, notevole al centro, chiave di volta in punta, ponti ibridi tra le punte), logica
  `src/core/constellations.ts` (punti = livello − 1, restituzione solo se non stacca, respec gratis, mods
  sommate in `stateStats`), chiavi di volta = RuleId `noCrit`, `freeSkills`, `overhealHoly`. Scheda Stelle
  `src/ui/stars.ts` (SVG, trascina/pinch/rotella, dettaglio, riepilogo).
- Salvataggio: **v10** (v8 skill, v9 essenza+rune, v10 `stars`; `cleanStars` scarta stelle ignote/staccate).

## Sessione 2026-10-24 (questa)
- Passo 3 (sinergie per tag) approvato e pubblicato su `main`.
- L'utente vuole un albero stile PoE (migliaia di nodi a regime): fatto il primo lotto da 148 col generatore.

## Scelte fatte da Claude (da confermare se l'utente obietta)
- `triggerChance` 30/50/75/100% (Epico→Divino); max 20 buff; la rigenerazione conta come cura in eccesso.
- Unici: piatte = valore × 2 × crescita livello oggetto. Costi del crafting (vedi `src/data/craft.ts`).
- Valori di skill e rune (file dati); Rapidità/Parsimonia con `reduction`; Essenza 1/nemico, boss ×10.
- Sinergie: tier coi moltiplicatori esistenti (effetto 10/15/20/27/35%, l'utente aveva detto 10/20/30: segnalato,
  nessuna risposta), tetto ricarica 60% (`MAX_SKILL_CDR`). Effetto su arma/secondaria/anello/amuleto/reliquia,
  ricarica su elmo/guanti/mantello/reliquia.
- Costellazioni: valori dei nodi (piccoli ~ affisso T1, notevoli ~3×, alcune notevoli danno regole degli
  unici); Colpo Assoluto moltiplica attacco ed elementi; Martirio vince su overhealShield; vista iniziale
  zoomata sul centro.

## Test
- `npm test`: **125 verdi** (12 file), `npm run build` ok (handoff 2026-10-24).
- Simulazione (`tests/combat.test.ts`): 2 h senza equip stage 32, con equip automatico 51. Non usa rune,
  crafting né Costellazioni; l'equip automatico non valuta trigger/unici/set/affissi delle skill.

## Note / problemi noti
- Un solo nemico (Ghoul) e un solo boss (Fase 4).
- Progresso offline non calcolato: oltre 5 s per frame il resto si scarta (Fase 5). Proposto di anticiparlo:
  nessuna risposta.
- Pinch a due dita nella scheda Stelle non verificato (solo mouse/rotella in Playwright).
- Verifica visiva: salvataggio di prova con `npx vite-node script.ts` (importa `src/core/*`), iniettato con
  `page.addInitScript`; `vite preview` su `/`. Avviarlo con `setsid` e non usare `pkill -f` (uccide la shell).
- Revisione dell'utente dal telefono (Fase 1) mai spuntata.
