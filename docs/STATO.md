# Stato del progetto

> File di passaggio di consegne tra sessioni. Aggiornato con `/handoff`.
> Massimo ~60 righe: solo ciò che serve per ripartire.

**Ultimo aggiornamento:** 2026-10-24 (varietà 2)
**Fase corrente:** 2 — Equipaggiamento, varietà (punti 1-2 fatti).
**Prossimo passo:** Varietà 3 — leggendari unici e set 2/4/6, da proporre e confermare. Poi crafting con i Frammenti.
**Grafica:** decisa **minimale** (niente scena, niente asset da scaricare): UI DOM + sagoma SVG.

## Gioco online
https://christiancrocetti01-sys.github.io/Chridle/ (ogni push su `main` lo ripubblica, ~1 min).
Si lavora su `claude/epic-allen-10jgj5` e si allinea `main` quando un passo è approvato.

## Fatto
- Flusso di lavoro: `CLAUDE.md`, STATO, ROADMAP, GDD (approvato), skill `/handoff` e `/riprendi`.
- Fase 0: Vite + TS + Vitest; logica 10 tick/s; salvataggio versionato (`src/core/save.ts`);
  deploy GitHub Pages funzionante.
- Fase 1 (prototipo): combattimento deterministico `src/core/combat.ts`, statistiche `src/core/stats.ts`,
  boss ogni 10 uccisioni, morte → stage precedente + allenamento, 3 potenziamenti, HUD DOM.
- Fase 1.5 (grafica minimale): rimossa la scena PixiJS; manichino `src/ui/doll.ts` (sagoma SVG + 12 slot),
  pannello di combattimento `src/ui/combat.ts` (barre vita + registro eventi). Bundle 23 kB.
- Fase 2 (primo passo): 12 slot, 7 rarità, 10 affissi con tier T1-T5 (`src/data/items.ts`),
  generatore deterministico + equip/smantellamento (`src/core/items.ts`), drop 1/8 e boss sempre
  (almeno Magico), inventario 40, Frammenti, smantellamento automatico per rarità. UI `src/ui/gear.ts`
  con confronto statistiche. Salvataggio v3. Crescita oggetti `ILVL_GROWTH` = 1.10 (scelta utente).
- Varietà 1: 52 affissi in `src/data/items.ts` con **tag** (Fisico, Sacro, Fuoco, Gelo, Fulmine, Ombra, Critico,
  Sanguinamento, Veleno, Difesa, Rubavita + Vita, Velocità, Fortuna) e **tipi ammessi**; 16 ibridi a 2 statistiche.
  Nuove stat: elementi piatti/% (ignorano la difesa), veleno/s, sanguinamento (% del fisico, istantaneo per ora),
  rubavita, schivata (max 50%), spine, oro/XP/ritrovamento magico, danno ai boss. Affisso salvato come `mods[]`.
  Salvataggio v4 (migrazione affissi v3). Confronto e HUD mostrano le nuove stat.
- Varietà 2: 16 effetti a scatto (`TRIGGER_AFFIXES` in `src/data/items.ts`, logica in `src/core/triggers.ts`):
  al critico / ogni N colpi / all'uccisione / quando colpito / alla schivata → esplosione elementale, sanguinamento,
  veleno, cura, scudo, velocità a tempo. Solo da Epico in su (`triggerChance` per rarità: 30/50/75/100%), max 1
  per oggetto, effetti uguali **si sommano** (scelta utente). Sanguinamento e veleno ora sono riserve sul nemico
  che si consumano nel tempo. Salvataggio v5 (scudo, buff, colpi; riserve sul nemico).
- Test: **61 verdi** (6 file), build ok. Simulazione 2 h con equip: stage 45 (la simulazione non valuta i trigger).

## Feedback dell'utente (importante)
- La vecchia grafica era "AI slop". Ora la direzione è: **grafica minimale**, non serve vedere il
  combattimento; ciò che conta è **una varietà infinita di armi, statistiche e sinergie**.

- Visione dell'utente: nemici sempre più forti, ma il giocatore deve arrivare a build **assurde** combinando
  statistiche, skill e sinergie (numeri che esplodono: Fase 5).

## Domande aperte
- I Frammenti non si spendono ancora (arriva il crafting).

## Note / problemi noti
- Un solo nemico (Ghoul) e un solo boss.
- Progresso offline non calcolato: oltre 50 tick/frame (5 s) il resto viene scartato (Fase 5).
- Bilanciamento simulato (`combat.test.ts`): senza equip stage 27 a 2 h; con equip automatico 43 a 2 h.
- GitHub Pages: l'ambiente `github-pages` deve consentire il branch `main` (già sistemato).
