# Stato del progetto

> File di passaggio di consegne tra sessioni. Aggiornato con `/handoff`.
> Massimo ~60 righe: solo ciò che serve per ripartire.

**Ultimo aggiornamento:** 2026-10-24 (handoff dopo varietà 3)
**Fase corrente:** 2 — Equipaggiamento, varietà (punti 1-3 fatti, manca il crafting).
**Prossimo passo:** Varietà 4 — **crafting con i Frammenti**. Proposta in attesa di risposta dell'utente:
ritirare un affisso (costo crescente), migliorare il tier, aggiungere un affisso se c'è spazio (o altro, es.
fondere oggetti). Logica in `src/core/items.ts` (o nuovo `src/core/craft.ts`), costi in `src/data/`, UI nel
dettaglio oggetto di `src/ui/gear.ts`. Poi Fase 3 (skill e build).
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
- Salvataggio: **v6** (v4 affissi `mods[]`, v5 scudo/buff/colpi/riserve, v6 `hero.nextCrit`).

## Scelte fatte da Claude (da confermare se l'utente obietta)
- `triggerChance` per rarità 30/50/75/100% (Epico→Divino).
- Max 20 buff di velocità insieme (regola "hasteStacks").
- Anche la rigenerazione conta come "cura in eccesso" → con quella regola lo scudo si riempie a vita piena.
- Statistiche piatte degli unici = valore × 2 (come un T3) × crescita del livello oggetto.

## Test
- `npm test`: **76 verdi** (7 file), `npm run build` ok (handoff 2026-10-24).
- Simulazione (`tests/combat.test.ts`): 2 h senza equip stage 27, con equip automatico 43. L'equip automatico
  **non valuta** trigger, unici e set: la potenza reale di quelle build non è misurata.

## Note / problemi noti
- Un solo nemico (Ghoul) e un solo boss.
- Progresso offline non calcolato: oltre 50 tick/frame (5 s) il resto viene scartato (Fase 5).
- I Frammenti non si spendono ancora (arriva il crafting).
- Verifica visiva: salvataggio di prova iniettato con `page.addInitScript` (il gioco salva alla chiusura e
  sovrascriverebbe un `localStorage.setItem` + reload). `vite preview` va aperto su `/`, non su `/Chridle/`.
- GitHub Pages: l'ambiente `github-pages` deve consentire il branch `main` (già sistemato).
