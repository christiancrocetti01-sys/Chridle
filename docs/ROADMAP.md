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
- [ ] Prestige / rinascita con valuta meta
- [ ] Scaling numerico infinito (numeri grandi) e bilanciamento
- [ ] Progresso offline

## Fase 6 — Estetica e "juice"
- [ ] Rifinitura della UI minimale (tipografia, icone degli oggetti)
- [ ] Feedback soddisfacenti nella UI (bagliori delle rarità, suoni)
- [ ] Rifinitura asset e crediti (`docs/CREDITS.md`)

## Fase 7+ — Espansione contenuti
- [ ] Centinaia di skill/oggetti/perk generati per lotti dai file dati
