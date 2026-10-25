# Roadmap a fasi

Ogni fase finisce con qualcosa di **giocabile e testato**. A fine fase: revisione con l'utente prima di passare alla successiva.
Spuntare `[x]` man mano. Le fasi possono essere ridefinite: è un documento vivo.

## Fase 0 — Fondamenta e decisioni
- [x] Rispondere alle domande aperte in STATO.md
- [x] Scaffolding: Vite + TypeScript + Vitest + PixiJS, struttura cartelle (`src/core` logica pura, `src/render` PixiJS, `src/ui` DOM, `src/data` contenuti)
- [x] Game loop: logica a 10 tick/s + render a 60 fps con interpolazione; salvataggio/caricamento versionato
- [x] Scena pixel art di prova: risoluzione interna bassa scalata a multipli interi, sprite animato placeholder
- [x] Deploy automatico (GitHub Pages) per giocare dal telefono
- [x] Ampliare il design (GDD) prima di scrivere codice

## Fase 1 — Core loop minimo
- [x] Statistiche base del personaggio (ATK, DEF, HP, velocità, crit…)
- [x] Combattimento idle automatico contro ondate di nemici
- [x] Drop di valuta + esperienza + livelli
- [x] UI minima: barra HP, nemico, numeri di danno
- [x] Potenziamenti acquistabili con oro (Forza, Corazza, Rapidità)
- [ ] Revisione dell'utente giocando dal telefono (rimandata a dopo la grafica finale, decisione utente)

## Fase 1.5 — Grafica minimale (decisione dell'utente, 2026-10-24)
- [x] Via la scena animata PixiJS: il valore del gioco è in oggetti, statistiche e sinergie
- [x] Manichino: sagoma SVG del guerriero con i 12 slot attorno
- [x] Pannello di combattimento testuale (barre vita + registro eventi)

## Fase 2 — Equipaggiamento
- [x] Slot (arma, armatura, accessori…) e rarità
- [x] Affissi casuali sugli oggetti, inventario, confronto
- [x] Generatore di oggetti data-driven
- [x] Varietà 1: 52 affissi con tag e restrizioni per tipo, ibridi, elementi/veleno/sanguinamento/rubavita/schivata/spine/fortuna
- [x] Varietà 2: 16 effetti a scatto (critico, ogni N colpi, uccisione, colpito, schivata), sanguinamento/veleno nel tempo, scudo, velocità a tempo
- [x] Varietà 3: 13 leggendari unici con regole speciali, 4 set da 6 pezzi (bonus 2/4/6)
- [x] Varietà 4: crafting con i Frammenti (ritira, migliora tier, trasferisci affisso, fusione 3→1)

## Fase 3 — Skill e build
- [x] Luce e skill attive (4 slot con priorità, 8 skill sbloccate a livello)
- [x] Rune (Essenza di Luce): 12 rune con livelli, 2 incastonature per skill
- [x] Sinergie per tag (oggetti/regole "le skill con tag X ottengono Y")
- [x] Albero delle abilità / perk (Costellazioni, primo lotto 148 nodi)
- [x] Classi e sottoclassi (5 Vie, 2 skill ciascuna, seconda Via con l’Ascensione)

## Fase 4 — Contenuti
- [x] Zone/stage con progressione (10 zone, 5 famiglie con resistenze, 15 nemici, élite, boss di zona con meccaniche)
- [x] Dungeon (chiavi, modificatori, set garantito), Torre dell’Alba (bonus permanenti), Raid in 3 fasi

## Fase 5 — Progressione infinita
- [x] Prestige: Ascensione dallo stage 40, Scintille, 9 potenziamenti permanenti (Rinascita Solare e Paragon: più avanti)
- [x] Numeri grandi: suffissi fino a Dc (1e33) poi notazione esponenziale; double fino a 1e308 (break_infinity solo se servirà)
- [x] Progresso offline senza limite (campione di 5 min, efficienza 75% + Veglia), riepilogo al rientro

## Fase 6 — Estetica e "juice" (base fatta; rifinitura grafica vera **alla fine**, decisione utente)
- [x] Rifinitura della UI minimale (icone SVG degli oggetti, numeri tabellari, schede scorrevoli)
- [x] Feedback: bagliori delle rarità (Divino pulsa), lampi sulle barre, avvisi per livello/bottino raro, suoni WebAudio (spenti di default)
- [x] Crediti aggiornati (`docs/CREDITS.md`): nessun asset esterno oltre al font Cinzel
- [x] UI riorganizzata: 5 schede in basso con sotto-schede, una cosa per schermata (richiesta utente)
- [x] Equip automatico a pulsante e inventario senza limite (richiesta utente)
- [x] Stile "testo puro" B/N (palette, serif, schede in alto, liste apribili, slot e statistiche a puntini, inventario a griglia)
- [x] Guida nel gioco (pulsante «?») e `README.md`
- [ ] Stesso schema per Vie, pannello dettagli delle Stelle, Modalità (dopo il parere dell'utente)

## Fase 7+ — Espansione contenuti
- [ ] Centinaia di skill/oggetti/perk generati per lotti dai file dati
  - [x] Lotto 1 (con le Vie): 10 skill delle Vie, affissi Ombra
  - [x] Lotto 2: regioni delle Vie nelle Costellazioni (~250 nodi, 8 chiavi di volta), 5 unici con le meccaniche delle Vie
  - [x] Lotto 3: skill 18 → 30 (tag Gelo), rune 12 → 24
  - [x] Revisione delle Fasi 3.5-7 con l'utente (2026-10-24), `main` pubblicato; chiavi più rare
  - [x] Lotto 4: rune 24 → 40 (costo di sblocco ×1,6 invariato)
  - [x] Purezza/Corruzione (sistema a parte, salvataggio v15)
  - [x] Collaudo massivo con tutti i sistemi (`scripts/collaudo.ts`, `npm run collaudo`)
  - [x] Codex/Bestiario (salvataggio v16) + Furia contro gli stalli
  - [x] Collezione leggendari (salvataggio v17)
  - [x] Imprese (salvataggio v18, solo bonus permanenti)
  - [x] Lumi (salvataggio v19)
  - [x] Altri unici e set (lotto 5: 30 unici, 8 set, 7 regole nuove)
  - [x] Endgame: Abisso, Paragon, Rinascita Solare (salvataggio v20)
  - [x] Collaudo di 10 giorni simulati

## Fase 8 — Tutto automatico (decisione utente, 2026-10-24)
Manuali restano solo: scelta della Via, quando ascendere/rinascere, modalità (Dungeon/Torre/Raid/Abisso).
- [x] Equipaggiamento automatico: ogni drop si indossa se alza la potenza, il resto (e il pezzo tolto) → Frammenti; niente inventario
- [x] 6 skill fisse (Colpo Sacro, Preghiera, Squarcio, Egida, Lama Rapida, Giudizio), elemento = debolezza del nemico; Essenza spesa da sola (livelli skill, 8 rune in piano, Lumo attivo)
- [x] Crafting automatico (solo tier sull'equipaggiamento indossato, fusione tolta), spese automatiche (oro, Paragon, Ascensione), Lumo attivo automatico, 32 rune inutilizzate tolte
- [x] Albero (Stelle) automatico per priorità finché non è completo
- [x] UI in sola lettura, guida, salvataggio v21 con migrazione, collaudo 8 h / 240 h e ribilanciamento

## Dopo la Fase 8 — Grafica (decisione utente, 2026-10-25; GDD §15)
- [x] Illustrazioni originali: carte-tarocco in xilografia (famiglie, boss di zona, unici) e linee di luce (oggetti, eroe)
- [ ] Revisione dell'utente sul gioco online e ritocchi ai disegni
- [ ] Revisione da telefono (rimandata a dopo la grafica)
