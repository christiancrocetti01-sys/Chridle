# Game Design Document — Chridle

> Documento di design. Sezioni brevi, una per sistema: leggere solo quella che serve.
> Approvato il 2026-10-23. Ogni modifica futura va confermata con l'utente.
> Fonte iniziale: `docs/BRAINSTORM.md`.

## 1. Visione
Idle RPG dark-fantasy per browser, mobile-first, giocatore singolo, sempre online (niente PWA).
Sei l'ultimo **Guerriero della Luce** in un mondo inghiottito dall'**Eclissi Eterna**.
Combatti senza sosta, anche a gioco chiuso. Profondità enorme di build, progressione infinita,
tutto molto soddisfacente da vedere.

### Pilastri
1. **Build infinite**: skill, oggetti, rune e perk che interagiscono tramite tag e trigger.
2. **Sempre qualcosa che sale**: più strati di progressione, sempre un obiettivo a pochi minuti.
3. **Soddisfazione visiva**: grafica semplice ma curata, molto "juice" (numeri, bagliori, particelle).

## 2. Ambientazione
- Il Sole è stato divorato dall'**Eclissi**; il mondo è avvolto da un'oscurità che corrompe.
- Il protagonista porta l'ultima **Scintilla**: ogni nemico sconfitto ne libera un frammento di luce.
- Obiettivo narrativo: riaccendere il Sole risalendo gli Atti fino al cuore dell'Eclissi.
- Ogni Ascensione (prestige) = il Sole si riaccende un po', ma l'Eclissi ritorna più forte. Giustifica il loop infinito.
- Tono: poche righe di lore per zona/boss, sbloccabili nel Codex. Niente dialoghi lunghi.

## 3. Classe: Guerriero della Luce
Una sola classe. La varietà nasce da **Vie** (sottoclassi) e dalle build.

### Vie (sottoclassi)
Si sceglie una Via a un certo livello; con l'endgame si sblocca una seconda Via (ibrido).
| Via | Fantasia | Stile |
|---|---|---|
| **Paladino del Sole** | scudo e martello sacro | tank, blocco, riflesso danni, aure |
| **Lama dell'Alba** | spada rapida, colpi di luce | velocità d'attacco, critici, multi-colpo |
| **Inquisitore** | fiamma sacra purificatrice | danni nel tempo, bruciature, esplosioni |
| **Custode Stellare** | luce stellare, invocazioni | spiriti/servitori, proiettili, mana |
| **Eclissiarca** | luce corrotta dall'ombra | sacrifica HP/Purezza per danni enormi, rischio/ricompensa |

- **Fatto (Fase 3.5, approvato 2026-10-24):** Via al livello 10, cambio gratis; ogni Via = statistiche + una regola
  (Paladino riflette il 30% del danno subito, Lama 25% colpo doppio, Inquisitore colpi che bruciano, Custode
  spirito stellare, Eclissiarca più danni con meno vita) + 2 skill esclusive (livelli 10 e 22). Seconda Via
  (ibrido) con il potenziamento d'Ascensione "Doppia Via": 50% delle statistiche, regola e skill intere.

### Risorsa di classe: Luce e Purezza
- **Luce**: si accumula colpendo, si spende per le skill attive (barra che si riempie = soddisfazione).
- **Purezza / Corruzione**: alcuni oggetti e la Via Eclissiarca aumentano la Corruzione: più danni, meno difese.
  Crea build "pure" vs "corrotte" senza aggiungere classi.
- **Fatto (2026-10-24, design approvato):** Purezza/Corruzione = **valore fisso** −100…+100 = Corruzione − Purezza
  (statistiche a punti, `src/data/corruption.ts`). Fonti: 6 affissi (3 corrotti, 3 puri), 4 notevoli delle regioni
  delle Vie, Vie (Eclissiarca +30, Paladino −30). Per punto: Corruzione +1% danni, −0,5% difesa e cure; Purezza
  −0,5% danni, +1% difesa e cure. Soglie: +50 skill d'Ombra pagate con la vita (0,1% vita per Luce), −50 cure in
  eccesso → scudo, +100 Eclissi (danni ×2, niente cure), −100 Santità (salva da un colpo mortale ogni 30 s).
  Neutro: nessun bonus (scelta mia, da confermare). Riga in scheda Eroe sopra le Vie. Tag e affissi Ombra approvati.

## 4. Statistiche
Molte statistiche, raggruppate in schede per non sommergere la UI.
- **Primarie**: Forza, Agilità, Intelletto, Vitalità, Fede (Fede scala danni sacri e cure).
- **Offensive**: danno base, velocità d'attacco, probabilità critica, danno critico, penetrazione,
  multi-colpo, doppio colpo, danno per tipo, danno ad élite/boss, danno nel tempo.
- **Difensive**: HP, armatura, schivata, blocco, resistenze per tipo, rigenerazione, furto vita,
  scudo di luce, riduzione danni.
- **Utilità**: oro trovato, probabilità drop, rarità drop, XP bonus, velocità ricarica skill, generazione Luce.
- **Formula danni**: (base + piatti) × (1 + somma degli "aumentati %") × prodotto dei "più %".
  La distinzione additivo/moltiplicativo (alla Path of Exile) dà profondità alle build.

### Tipi di danno
Fisico, **Sacro**, Fuoco, Fulmine, **Ombra** (solo build corrotte/nemici). Ogni nemico ha resistenze diverse.

### Stati alterati
Bruciatura, Sanguinamento, Stordimento, Accecamento (−precisione), Consacrazione (terreno che danneggia),
Marchio (il prossimo colpo fa più danni), Vulnerabilità.

## 5. Combattimento idle
**Implementato (Fase 1)** in `src/core/combat.ts`: 10 uccisioni per stage poi boss (×6 HP, ×5 ricompense);
morte → stage precedente e "allenamento" finché non si sale di livello; danno = d²/(d+difesa).
- Tick fisso (es. 10/s), deterministico e testabile. Il rendering mostra solo il risultato.
- Il guerriero avanza da solo nello stage: ondate di nemici → boss dello stage → stage successivo.
- Se muori, torni indietro di uno stage e "farmi" lì automaticamente (niente frustrazione).
- Le skill attive si lanciano da sole secondo priorità impostate dal giocatore (stile gambit semplice).
- Il giocatore interviene solo con build, equip e scelte: zero click obbligatori.

## 6. Skill e sinergie
- **Skill attive** (4-6 slot) e **passive**. Ogni skill ha dei **tag**: Sacro, Fuoco, Area, Proiettile,
  Aura, Invocazione, Critico, Tempo, Scudo…
- **Rune** (stile gemme di supporto): si incastonano nelle skill e le modificano
  ("+1 proiettile", "si attiva al critico", "lascia terreno consacrato", "converte in Ombra").
- **Trigger**: al colpo, al critico, all'uccisione, ogni N attacchi, al blocco, sotto il 30% di HP.
  Catene di trigger = combo soddisfacenti.
- Sinergie trasversali: oggetti e perk che dicono "le skill con tag X ottengono Y".
- Contenuti: si parte con ~30 skill e ~40 rune, poi espansione per lotti fino a centinaia.
  **Fatto (lotto 3):** 30 skill (12 nuove fino al livello 60, tag Gelo) e 24 rune (12 nuove: Condanna, Apertura,
  Luminescenza, Consacrazione, Marchio, Rinnovamento, Catena, Fulgore, Incendio, Brina, Tempesta, Custodia).
- **Deciso (Fase 3):** Luce +10 a colpo e +10/s in combattimento (max 100); 4 slot, l'ordine è la priorità;
  skill sbloccate a livello; soglie automatiche (cura < 50% vita, scudo < 10%, velocità se scaduta); scheda
  Skill separata. Rune: Essenza di Luce dai nemici, 2 incastonature per skill, stessa runa su più skill,
  sblocco 50 × 1,6^n, livelli come pozzo infinito. Ordine Fase 3: skill → rune → sinergie per tag →
  Costellazioni (~30 nodi, 1 punto/livello, respec economico) → Vie.
- **Deciso (sinergie per tag):** per ora solo affissi, 2 per tag di skill: effetto (+10% al T1) e riduzione
  ricarica (−5% al T1); i bonus dei tag di una skill si sommano. Unici/set con sinergie: più avanti.

## 7. Albero delle abilità: Costellazioni
- Grande albero a stelle (tema luce): nodi piccoli (+statistiche), notevoli (meccaniche), **chiave di volta**
  (cambiano le regole, es. "i critici non esistono più, ogni colpo fa +80%").
- Punti da livello. Respec economico (non punire la sperimentazione).
- Ogni Via ha la sua regione dell'albero; le regioni si toccano per gli ibridi.
- **Deciso (Fase 3):** dimensioni stile PoE (migliaia di nodi a regime), nodi **generati** da dati
  (`src/data/constellations.ts`: rami → spina + ammassi ad anello con notevole al centro, ponti tra le punte).
  Primo lotto 148 nodi: rami Offesa / Difesa / Luce, 12 notevoli, 3 chiavi di volta (Colpo Assoluto: niente
  critici, +80% ai colpi; Martirio: cura in eccesso → danno sacro; Luce Perpetua: skill gratis, ricarica ×2).
  1 punto per livello, respec gratuito, si restituisce una stella solo se non stacca le altre.
  Espansione a lotti in Fase 7 (regioni delle Vie).
- **Deciso (utente, 2026-10-27):** niente compattazione, più contenuto. Punti extra: 1 ogni 10 piani di Torre, 1 ogni 3
  Ascensioni in tutto. Scelta automatica che guarda avanti verso notevoli/chiavi di volta. Regione **«Oltre»** (~60 stelle,
  una notevole ogni 3) con 15 notevoli: Catena di Luce (ogni 5° colpo fulmine 150% att.), Respiro della Battaglia
  (uccisione di élite/boss → ricarica la skill più lontana), Scudo Ardente (scudo rotto esplode), Mietitore (uccisione +10% danni 5 s,
  max +30%), Sole Nascente (ogni 10 s colpo ×5), Gelo Profondo (gelo 10% congela 1 s), Fiamme Vive (bruciature passano al
  nemico dopo), Contrattacco (schivata → colpo subito), Vampiro di Luce (rubavita in eccesso → scudo), Ultima Preghiera
  (sotto 20% vita Preghiera da sola, ogni 20 s), Colpo Spezzante (critico −10% difesa nemica, max −50%), Eco delle Skill
  (20% doppio lancio), Martello del Giudizio (boss: +0,5% per colpo, fino a +150%), Luce Incessante (skill → +25% Luce),
  Sangue Freddo (vita piena +20% danni); 3 chiavi di volta: Supernova (Luce piena skill ×3, Luce a metà velocità),
  Fortezza Vivente (niente schivata, colpi subiti −40%), Tempo Fermo (ogni 30 s nemico fermo 3 s, −30% vel. att.).
  **Fatto (2026-10-27):** `BEYOND` in `src/data/constellations.ts` (3 regioni dal centro dei ponti, spina di 11, notevoli
  a lato dei nodi dispari, 51 stelle), regole in `combat.ts`/`skills.ts`/`stats.ts`, costanti in fondo a `src/data/uniques.ts`.
  Luce Incessante = +25 Luce fissa; Supernova: le skill di danno aspettano la Luce piena. Salvataggio v24.

## 8. Equipaggiamento
- **Slot**: arma principale, mano secondaria (scudo/tomo/seconda arma), elmo, armatura, guanti, stivali,
  cintura, mantello, 2 anelli, amuleto, reliquia.
- **Rarità**: Comune, Magico, Raro, Epico, Leggendario, Mitico, **Divino** (colori + bagliori sempre più intensi).
- **Affissi casuali** (prefissi/suffissi) con tier; livello oggetto che scala con lo stage.
- **Leggendari unici** con effetti che definiscono una build ("le Bruciature si propagano alla morte").
- **Set** (2/4/6 pezzi) legati alle Vie.
- **Crafting**: smantella → Frammenti; rerolla un affisso, aggiungi affisso, potenzia +1…+15,
  trasferisci un effetto leggendario (rende utile ogni drop).
- **Auto-smantellamento** con filtri per rarità/statistiche (fondamentale in un idle).
- **Deciso (2026-10-24):** tutti i 12 slot e le 7 rarità da subito; drop 1 ogni ~8 nemici, boss sempre
  (almeno Magico); inventario senza limite (dal 2026-10-24, richiesta utente; prima 40); statistiche piatte +10% per livello oggetto;
  obiettivo: **varietà "infinita"** di armi, statistiche e sinergie (è il cuore del gioco).
- **Deciso (varietà 1-3):** affissi con tag e tipi ammessi, ibridi a 2 statistiche; effetti a scatto solo da
  Epico in su, max 1 per oggetto, effetti uguali **si sommano**; leggendari unici = effetto/regola fissa +
  affissi casuali (25% dei drop da Leggendario); 4 set da 6 pezzi legati agli stili (Paladino, Piromante,
  Assassino, Pestilenza; 8% dei drop da Epico).
- **Deciso (varietà 4, crafting):** ritira affisso, migliora tier (max T5), trasferisci affisso (donatore
  distrutto), fusione 3 uguali → rarità successiva (max Mitico); niente "aggiungi affisso"; unici e set non si
  modificano; ogni modifica sullo stesso oggetto costa ×1,5.
- **Deciso (2026-10-24):** pulsante «Equipaggia il meglio» (`src/core/autoequip.ts`): indossa per ogni slot il pezzo che
  alza `gearPower` (dps × resistenza, set inclusi); le regole degli unici non entrano nel conto (si scelgono a mano).
- **Visione:** nemici sempre più forti, ma il giocatore arriva a build **assurde** combinando statistiche,
  skill e sinergie (numeri che esplodono).

## 9. Nemici
- **Famiglie**: Non-morti, Demoni, Bestie corrotte, Culto dell'Eclissi, Creature del Vuoto.
  Ognuna con resistenze e comportamenti propri (es. i Non-morti sono deboli al Sacro).
- **Élite** con affissi casuali (Veloce, Corazzato, Vampirico, Esplosivo…) e drop migliori.
- **Boss** a fine Atto con fasi e meccaniche (scudo da rompere, invocazioni, enrage a tempo).

- **Fatto (Fase 4, approvato 2026-10-24):** 10 zone da 10 stage (2 per famiglia), poi si ricomincia ("… II");
  3 nemici per famiglia, un campione per famiglia come boss di stage, un boss di zona con meccaniche (furia,
  scudo a metà vita, evocazioni, rigenerazione) all'ultimo stage della zona. Resistenze per famiglia (fisico ed
  elementi). Élite dallo stage 5 (8%): 5 affissi, ×3 ricompense, 50% di bottino, 5% di chiave.
- **Deciso (2026-10-24):** il muro al boss di zona 50 resta (spinge ad ascendere). Nomi approvati.
- **Fatto (zone 11-20, delega dell'utente, 2026-10-27):** stage 101-200 con 10 zone e boss nuovi (Necropoli Sommersa →
  Il Sole Spento), stesso ordine delle famiglie e stesso numero di meccaniche della zona 100 stage prima, combinazioni
  diverse; carte in `BOSS_ART`. Dallo stage 201 si ricomincia col numero romano.

## 10. Modalità di gioco
| Modalità | Descrizione | Ricompensa principale |
|---|---|---|
| **Campagna** | Atti → zone → stage, progressione lineare | XP, oro, equip base |
| **Dungeon** | run con chiavi e modificatori casuali, boss finale | set, rune, Frammenti |
| **Torre dell'Alba** | piani infiniti a difficoltà crescente, record personale | bonus permanenti a ogni traguardo |
| **Raid / Assedi** | boss enormi multi-fase con timer, si sbloccano a soglie | leggendari e Divini |
| **Abisso** | endgame infinito con livelli di difficoltà scalabili | Paragon, materiali rari |

- **Fatto (Fase 4, approvato 2026-10-24):** Dungeon (1 chiave, livello = record − 3, 8 nemici + boss di zona,
  2 modificatori su 6, premio: Frammenti, Essenza, pezzo di set garantito); Torre dell'Alba (gratis, 30 s per
  piano, ogni 5 piani di record +3% attacco e vita permanenti); Raid (dallo stage 50, 3 chiavi, 120 s, 3 fasi,
  Leggendario garantito, 15% Mitico, 2% Divino). La Campagna resta in pausa durante le modalità.
- **Deciso (chiavi, 2026-10-24):** il boss di zona dà la chiave solo al **record** dell'Ascensione corrente
  (ribatterlo dopo una morte non ne dà); la Torre dà 1 chiave ogni 10 piani di record; élite 5% invariato.
- **Deciso (collaudo, 2026-10-24):** boss di zona: chiave solo ogni 20 stage (`ZONE_KEY_EVERY`): ~5-6 chiavi/h invece
  di 8-10. Raid al livello record − 5 (`RAID_LEVEL_OFFSET`): vinti ~60% invece di ~45%. Corruzione invariata
  (un profilo che cerca le soglie arriva a +70 / −90).
- **Fatto (chiavi accumulate e Torre, scelte di Claude su delega dell'utente, 2026-10-27):** **Spedizione** (bottoni
  «10 chiavi» / «Tutte» nella sezione Dungeon, dopo il primo Dungeon completato): ogni chiave dà subito Frammenti ed
  Essenza di un Dungeon senza modificatori (×1, giocato ~×1,45) al livello record − 3 e un pezzo di set; conta come
  Dungeon completato. Torre: ogni 25 piani di record (`TOWER_GRAND_EVERY`) un oggetto **Mitico**. Imprese: Predone V
  (1000 Dungeon), Scalatore V-VI (piani 150 e 200).
- **Fatto (Abisso, scelte di Claude su delega dell'utente):** si sblocca dopo 3 Ascensioni (o con una Rinascita). Profondità
  infinite: 10 nemici (25% élite) + un Guardiano (boss di zona), poi la profondità successiva finché non si cade.
  Profondità d = stage 40 + 3d, vita ×2, attacco ×1,5. Si riparte da record − 3. Ricompense: bottino normale + esperienza
  Paragon = profondità per uccisione (Guardiano ×10). Valori in `src/data/endgame.ts`.

## 11. Valute ed economia
- **Oro**: base, per potenziamenti e acquisti.
- **Essenza di Luce**: dai nemici, per skill e rune.
- **Frammenti**: dallo smantellamento, per il crafting.
- **Chiavi**: accesso ai Dungeon.
- **Stelle**: valuta di prestige (Ascensione).
- **Lacrime del Sole**: rarissima, per oggetti Divini e chiavi di volta.
- Regola: ogni valuta ha un "pozzo" infinito, così non diventa mai inutile.

## 12. Progressione infinita (strati)
1. **Livello** del personaggio (limite morbido) → punti Costellazione.
2. **Paragon / Livelli Stellari** dopo il limite: infiniti, piccoli bonus a scelta.
3. **Ascensione** (prestige): reset di campagna e livello, ottieni Stelle → albero permanente.
4. **Rinascita Solare** (meta-prestige): reset delle Ascensioni per moltiplicatori enormi e nuove meccaniche.
- **Fatto (Fase 5, approvato 2026-10-24):** Ascensione dallo stage 40, valuta **Scintille** (non "Stelle": il nome
  è già delle Costellazioni) = ((record − 30) / 10)²; 9 potenziamenti permanenti in `src/data/ascension.ts`.
  Si azzerano livello, oro, potenziamenti, stage e Costellazioni; restano oggetti, valute, rune, Torre, Vie.
  ~~Offline 75%~~ → **100%**, Veglia Eterna tolta, Scintille rimborsate (decisione utente 2026-10-26, v22).
  Torre: si riparte `TOWER_BACK` = 5 piani sotto il record (decisione utente 2026-10-26).
- **Fatto (Paragon):** livelli infiniti solo dall'Abisso (costo 100 × (l+1)^1,5), 1 punto per livello su 8 bonus a scelta
  (+2% attacco/vita/difesa/danno critico/elementale, +0,5% velocità, +1% ritrovamento, +3% oro e +2% XP); i punti si
  riprendono gratis. Permanente.
- **Fatto (Rinascita Solare):** da 400 Scintille guadagnate nel ciclo; Soli = √(Scintille / 100), contate senza il bonus dei Soli (dopo il collaudo di 10 giorni: senza, ~70 Rinascite in 240 h). Azzera Ascensioni, Scintille
  e potenziamenti (tranne Quinto Sole e Doppia Via) e riparte da capo. Ogni Sole, per sempre: attacco/vita/difesa +100%,
  oro/XP/Essenza/Paragon +50%, Scintille +25%. Imprese nuove: Abissale, Paragone, Rinato.
- Numeri grandi: supporto oltre 1e308 (libreria tipo `break_infinity.js`) **rimandato** finché non serve
  (stage ~3800); formattazione 1.2K, 3.4M… fino a Dc, poi notazione.

## 13. Progresso offline
- Sì, **senza limite di tempo**.
- ~~Calcolo analitico~~ → **simulazione vera tick per tick** (decisione utente 2026-10-26, nessun tetto: il
  caricamento può durare, ~13k tick/s su PC).
- Al rientro: schermata riepilogo soddisfacente (oro, XP, oggetti, livelli guadagnati).
- **Fatto (Fase 5, approvato 2026-10-24):** 5 minuti simulati sullo stage attuale senza avanzare, poi ritmo × tempo ×
  efficienza (75%, +5% per livello di "Veglia Eterna", max 100%); max 30 oggetti veri, il resto in Frammenti.
- **Fatto (2026-10-26):** si simula tempo × efficienza con `step` come a gioco aperto (avanza, cade e torna indietro,
  sale di livello e riprova). `startOffline`/`runOffline` a blocchi da 40 ms in `main.ts` con barra di avanzamento;
  `lastSeen` avanza col tempo simulato, così un salvataggio a metà calcolo riprende da lì. Riepilogo con stage e cadute.
- **Deciso (2026-10-26):** efficienza **100%** (`OFFLINE_EFFICIENCY`), niente potenziamento per l'offline.

## 14. Meta e collezione
- **Codex/Bestiario**: uccidere N nemici di un tipo dà bonus permanenti contro quella famiglia.
  **Fatto (2026-10-24):** uccisioni per famiglia (`state.codex`, restano all'Ascensione, contano anche offline),
  5 gradi a 50/500/2,5K/10K/50K, +5% danni per grado contro la famiglia (`src/data/codex.ts`); sezione Bestiario
  nella scheda Mondo. Collaudo: ~1.500 uccisioni per famiglia in 8 h.
- **Fatto (Furia contro gli stalli):** dopo 120 s di combattimento ogni nemico raddoppia l'attacco ogni 10 s
  (il collaudo ha trovato un Dungeon bloccato per 6 h: boss che rigenera, eroe che non muore).
- **Collezione leggendari**: ogni leggendario trovato almeno una volta dà un piccolo bonus permanente.
  **Fatto (2026-10-24):** `state.collection` (id degli unici, resta all'Ascensione; conta anche smantellati, fusi,
  offline e, alla migrazione v17, quelli già posseduti). Bonus a tema per unico (`src/data/collection.ts`, solo %)
  + premi di completamento al 25/50/100% (+5/+10/+15% attacco e vita, al 100% anche +10% ritrovamento magico).
  Elenco nella scheda Mondo, avviso alla scoperta. Collaudo: 7-10 unici su 18 in 8 h.
  **Lotto 6 (2026-10-27):** 11 unici con le notevoli di «Oltre» (mai le chiavi di volta), set Gladiatore (Spezzascudi)
  e Araldo dell'Alba (Luce Incessante): 41 unici, 10 set. Collezionista VI a 40 unici. I premi al 25/50/100% si
  ricalcolano sul totale nuovo (chi aveva il 100% lo riprende trovando i nuovi).
- **Imprese** (achievement) con ricompense.
  **Fatto (2026-10-24):** 11 tracce a gradini, 54 imprese (`src/data/achievements.ts`): uccisioni, stage, livello,
  Ascensioni, Dungeon, Raid, Torre, gradi del Bestiario, collezione, rune, oro. Ricompensa (decisione utente): solo
  bonus permanenti a tema per gradino. Controllo ogni secondo in `step` e dopo l'offline; restano all'Ascensione.
  Collaudo: ~25 imprese in 8 h.
- **Lumi**: piccoli spiriti compagni con bonus passivi, si fanno salire di livello.
  **Fatto (2026-10-24):** 6 Lumi (`src/data/lumi.ts`) sbloccati da traguardi (stage 15, primo Dungeon, Torre 10,
  prima Ascensione, primo Raid, 9 unici). Livelli con l'Essenza (100 × 1,35^lv), restano all'Ascensione.
  **Uno attivo** (decisione utente): bonus per livello pieno + effetto fisso; gli altri danno il 25% del bonus.
  Sezione nella scheda Eroe. Collaudo: Lumo preferito ~Lv 17 in 8 h, rune invariate (13-14), Ascensioni 6-9.

## 15. Direzione artistica
- **Deciso (2026-10-24): grafica minimale.** Non si vede il personaggio combattere: il gioco è
  numeri, oggetti, statistiche e sinergie, in un'interfaccia DOM/CSS pulita e leggibile.
- **Combattimento**: barre vita di eroe e nemico + registro degli eventi importanti (critici, uccisioni, bottino).
- **Rarità**: colore del nome e del bordo; le più alte (Leggendario, Mitico, Divino) con bagliore.
- La vecchia scena PixiJS con filtro "inchiostro" resta nella storia di git (commit `caa9a3b`, `f43ab28`).
- **Deciso (2026-10-24, sera):** la grafica si rifinisce **alla fine**, a gioco finito; fino ad allora stile minimo.
- **Fatto (Fase 6):** icone SVG minimali degli oggetti, bagliore di Leggendario/Mitico, Divino che pulsa,
  lampi sulle barre, avvisi per livello e bottino raro, suoni sintetizzati WebAudio (spenti di default).
- **Deciso (2026-10-25): illustrazioni originali** (SVG disegnati a mano, niente asset esterni), subito dopo aver
  completato il gioco. Mix di due stili: **tarocchi miniati** (xilografia a tratteggio su carta antica, dettagli in oro,
  cornice con numero romano e nome) per nemici, boss e leggendari; **linee di luce** (tratti luminosi su nero, rosso per
  i nemici) per il guerriero e le icone piccole dell'equipaggiamento. Luce contro Eclissi anche nello stile.
- **Fatto (2026-10-25):** `src/ui/art/` — `subjects.ts` (geometria a strati fill/shade/ink/line/gold/eye: 11 oggetti,
  5 famiglie, 10 boss di zona, eroe), `render.ts` (xilografia, linea di luce, carta, dorso), `index.ts` (carte di nemici,
  famiglie, boss, unici). Icone oggetti/avvisi in luce; ritratti in combattimento; gallerie in Bestiario e Collezione.
- **Deciso (2026-10-24, UI divisa):** "una cosa per schermata". Header compatto sempre visibile (valute, livello/stage,
  combattimento affiancato, log 3 righe, Abbandona); 5 schede fisse in basso con sotto-schede a pillola:
  Eroe (Oggetti/Potenziamenti/Statistiche), Build (Skill/Rune/Stelle/Via/Lumi), Mondo (Zona/Modalità),
  Progressi (Bestiario/Collezione/Imprese), Ascensione (Ascensione/Rinascita/Paragon). Pallini rossi = cose da fare.
- **Deciso (2026-10-24, stile "testo puro", sostituisce manichino e schede in basso):** ispirazione Kittens Game/Evolve/
  A Dark Room. Bianco e nero; colore **solo** a rarità (nome e cornice), barre vita (verde eroe, rosso nemico), elementi
  (Fuoco arancio, Gelo azzurro, Fulmine giallo, Sacro avorio, Ombra viola) e avvisi (pallini rossi). Font EB Garamond
  (titolo Cinzel). Schede in alto come parole, fisse allo scorrimento, sotto-schede in corsivo. Niente riquadri: linee
  sottili. Equipaggiamento come righe con i puntini (sagoma tolta), statistiche e potenziamenti a puntini, inventario a
  griglia di icone con cornice della rarità. Liste lunghe = una riga per elemento, dettagli al tocco; i bloccati riassunti.
- **Deciso:** guida per i giocatori nel gioco (pulsante «?»), `README.md` per GitHub.
- Ispirazioni (solo concettuali): Diablo, Path of Exile, Melvor Idle, NGU Idle, Idle Champions.


## 16. Tutto automatico (decisione utente, 2026-10-24, Fase 8)
- Manuali restano solo: scelta della Via, quando ascendere/rinascere, modalità (Dungeon/Torre/Raid/Abisso).
  Il resto (equip, smantellamento, skill, rune, crafting, spese permanenti, albero) lo fa il gioco.
- Equip: ogni drop si indossa nello slot dove alza di più `gearPower` (danni × resistenza), altrimenti → Frammenti;
  niente inventario. Le regole degli unici non entrano nel confronto (bonus fisso agli unici: proposto, non deciso).
- Skill: 6 fisse (Colpo Sacro 1, Preghiera 5, Squarcio 12, Egida 20, Lama Rapida 30, Giudizio 45), priorità fissa
  (difese → velocità → danno); le esplosioni usano l'elemento più debole del nemico. Niente skill delle Vie.
- Essenza: ogni secondo compra la cosa più economica tra livelli delle skill (+10%, costo 25×1,4^(lv−1)),
  8 rune in piano (2 per skill) e livelli del Lumo attivo. Perk "Quinto Sole" = +5 livelli a tutte le skill.
  Corrotto: le skill di danno costano vita invece di Luce.
- Rune: solo le 8 del piano (Potenza, Custodia, Esecuzione, Ferita Aperta, Purificazione, Bastione, Pazienza,
  Persistenza); le altre 32 tolte (2026-10-25). Lumo attivo: il preferito della Via (Paladino Aureola, Lama ed
  Eclissiarca Ombretta, Inquisitore Fiammella, Custode Scintilla), altrimenti quello di livello più alto.
- Crafting: solo l'aumento di tier sugli oggetti indossati, sempre il più economico (`autoCraft`); tolti Ritira,
  Trasferisci e Fusione. Oro: il Potenziamento più economico. Paragon: a giro Forza, Vigore, Forza, Precisione,
  Vigore, Tempra. Ascensione: sempre il più economico (decisione utente 2026-10-26). Tutto in `autoSpend` (`src/core/auto.ts`).
- Stelle (`autoStars`, prima voce di `autoSpend`): finché ci sono punti, il percorso (una stella collegata o la strada
  fino a una notevole/chiave di volta entro `STAR_LOOKAHEAD` = 6) che alza di più `gearPower` per punto (2026-10-27);
  notevoli con regola ×1,06, chiavi di volta ×0,98 (quella della propria Via ×1,06), regole annullate da una già attiva
  (`CLASH_PAIRS`: niente critici ↔ regole dei critici, Eclissi ↔ cure, Fortezza Vivente ↔ schivata) ×0,5. Cambiare Via azzera l'albero.
- Ritmo (collaudo 240 h, 2026-10-25): inizio veloce lasciato così (decisione utente). Fine gioco: dallo stage
  `LATE_STAGE` = 150 i nemici crescono ×1,15 (vita/difesa) e ×1,1 (attacco) per stage invece di ×1,2/×1,13
  (`stageEnemy`, `src/core/stats.ts`): record 10 giorni da ~175 a ~220.
