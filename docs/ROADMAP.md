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
- [ ] Revisione dell'utente giocando dal telefono

## Fase 1.5 — Identità visiva (scena vetrina)
- [ ] Scelta asset con l'utente (budget, 3-4 opzioni con anteprime e licenze)
- [ ] Scena di combattimento con asset veri, parallasse, nebbia, luce, particelle ambientali
- [ ] UI con cornici ornamentali vere (riferimento manga anni '80)
- [ ] Approvazione dell'utente: diventa lo standard visivo

## Fase 2 — Equipaggiamento
- [ ] Slot (arma, armatura, accessori…) e rarità
- [ ] Affissi casuali sugli oggetti, inventario, confronto
- [ ] Generatore di oggetti data-driven

## Fase 3 — Skill e build
- [ ] Sistema di skill attive/passive con trigger e sinergie (tag)
- [ ] Albero delle abilità / perk
- [ ] Classi e sottoclassi

## Fase 4 — Contenuti
- [ ] Zone/stage con progressione
- [ ] Dungeon, Torre infinita, Raid/boss

## Fase 5 — Progressione infinita
- [ ] Prestige / rinascita con valuta meta
- [ ] Scaling numerico infinito (numeri grandi) e bilanciamento
- [ ] Progresso offline

## Fase 6 — Estetica e "juice"
- [ ] Direzione artistica dark + luce, palette, asset
- [ ] Animazioni, particellari, suoni, feedback soddisfacenti
- [ ] Rifinitura asset e crediti (`docs/CREDITS.md`)

## Fase 7+ — Espansione contenuti
- [ ] Centinaia di skill/oggetti/perk generati per lotti dai file dati
