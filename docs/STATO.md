# Stato del progetto

> File di passaggio di consegne tra sessioni. Aggiornato con `/handoff`.
> Massimo ~60 righe: solo ciò che serve per ripartire.

**Ultimo aggiornamento:** 2026-10-24 (varietà 4 fatta)
**Fase corrente:** 3 — Skill e build. Piano approvato in 5 passi: 1 Luce + skill attive (fatto), 2 Rune
(Essenza di Luce dai nemici, ~12 rune), 3 sinergie per tag, 4 Costellazioni (~30 nodi, 1 punto/livello,
respec economico), 5 Vie. **Prossimo passo:** passo 2 — Rune.
**Online:** `main` allineato con la varietà 4.
**Grafica:** decisa **minimale** (niente scena, niente asset da scaricare): UI DOM + sagoma SVG.

## Gioco online
https://christiancrocetti01-sys.github.io/Chridle/ (ogni push su `main` lo ripubblica, ~1 min).
Si lavora su `claude/epic-allen-10jgj5` e si allinea `main` (fast-forward) quando un passo è approvato.

## Fatto (sintesi)
- Fasi 0-1.5: Vite + TS + Vitest, logica 10 tick/s deterministica, salvataggio versionato con migrazioni,
  combattimento/statistiche/boss/potenziamenti, UI DOM minimale (manichino SVG, pannello combattimento).
- Fase 2: 12 slot, 7 rarità, generatore deterministico, drop, inventario 40, Frammenti, smantellamento auto.
- Varietà 1: 52 affissi (`AFFIXES` in `src/data/items.ts`) con tag e tipi ammessi, 16 ibridi; stat nuove:
  elementi (ignorano la difesa), veleno/s, sanguinamento, rubavita, schivata (max 50%), spine, oro/XP/
  ritrovamento magico, danno ai boss. HUD mostra solo le stat speciali possedute.
- Varietà 2: 16 effetti a scatto (`TRIGGER_AFFIXES`, logica `src/core/triggers.ts`): critico / ogni N colpi /
  uccisione / colpito / schivata → esplosione, sanguinamento, veleno, cura, scudo, velocità a tempo.
  Sanguinamento e veleno = riserve sul nemico consumate nel tempo (`BLEED_RATE`, `POISON_RATE`).
- Varietà 3 (`src/data/uniques.ts`): 13 regole speciali (`RuleId`), 13 unici, 4 set (bonus 2/4/6).
  Oggetto: `item.special`; regole in `Stats.rules` (da `gearRules`); bonus set in `itemMods`.
- Varietà 4 (`src/core/craft.ts`, costi in `src/data/craft.ts`, UI nel dettaglio oggetto): ritira affisso,
  migliora tier (max T5), trasferisci affisso da un donatore (distrutto), fusione 3 uguali → rarità successiva
  (max Mitico, può uscire un unico/set). Unici e set esclusi. Costo × 1,5 per ogni modifica (`item.crafts`).
- Fase 3 passo 1 (`src/data/skills.ts`, `src/core/skills.ts`, scheda Skill `src/ui/skills.ts`): Luce +10 a
  colpo e +10/s in combattimento (max 100, azzerata alla morte); soglie automatiche: cura sotto 50% vita,
  scudo sotto 10%, velocità solo se scaduta; 4 slot in ordine di priorità, una skill per tick, 8 skill sbloccate a
  livello (1-25) che vanno nel primo slot libero. Effetti condivisi con i trigger (`applyEffect` in triggers.ts).
  UI a schede: Eroe / Skill.
- Salvataggio: **v8** (v4 affissi `mods[]`, v5 scudo/buff/colpi/riserve, v6 `hero.nextCrit`, v7 `item.crafts`, v8 Luce e skill).

## Scelte fatte da Claude (da confermare se l'utente obietta)
- `triggerChance` per rarità 30/50/75/100% (Epico→Divino).
- Max 20 buff di velocità insieme (regola "hasteStacks").
- Anche la rigenerazione conta come "cura in eccesso" → con quella regola lo scudo si riempie a vita piena.
- Costi crafting: base = valore di smantellamento × ritira 1 / migliora 2×tier / trasferisci 3; fusione =
  smantellamento della rarità ottenuta. Trasferimento: piatte adattate al livello oggetto, max 1 effetto a scatto.
- Statistiche piatte degli unici = valore × 2 (come un T3) × crescita del livello oggetto.

## Test
- `npm test`: **99 verdi** (9 file), `npm run build` ok (handoff 2026-10-24).
- Simulazione (`tests/combat.test.ts`): 2 h senza equip stage 32, con equip automatico 54 (prima delle skill: 27 / 43). L'equip automatico
  **non valuta** trigger, unici e set: la potenza reale di quelle build non è misurata.

## Note / problemi noti
- Un solo nemico (Ghoul) e un solo boss.
- Progresso offline non calcolato: oltre 50 tick/frame (5 s) il resto viene scartato (Fase 5).
- Verifica visiva: salvataggio di prova iniettato con `page.addInitScript` (il gioco salva alla chiusura e
  sovrascriverebbe un `localStorage.setItem` + reload). `vite preview` va aperto su `/`, non su `/Chridle/`.
- GitHub Pages: l'ambiente `github-pages` deve consentire il branch `main` (già sistemato).
