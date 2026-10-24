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

### Risorsa di classe: Luce e Purezza
- **Luce**: si accumula colpendo, si spende per le skill attive (barra che si riempie = soddisfazione).
- **Purezza / Corruzione**: alcuni oggetti e la Via Eclissiarca aumentano la Corruzione: più danni, meno difese.
  Crea build "pure" vs "corrotte" senza aggiungere classi.

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
- **Deciso (Fase 3):** Luce +10 a colpo e +10/s in combattimento (max 100); 4 slot, l'ordine è la priorità;
  skill sbloccate a livello; soglie automatiche (cura < 50% vita, scudo < 10%, velocità se scaduta); scheda
  Skill separata. Rune: Essenza di Luce dai nemici, 2 incastonature per skill, stessa runa su più skill,
  sblocco 50 × 1,6^n, livelli come pozzo infinito. Ordine Fase 3: skill → rune → sinergie per tag →
  Costellazioni (~30 nodi, 1 punto/livello, respec economico) → Vie.

## 7. Albero delle abilità: Costellazioni
- Grande albero a stelle (tema luce): nodi piccoli (+statistiche), notevoli (meccaniche), **chiave di volta**
  (cambiano le regole, es. "i critici non esistono più, ogni colpo fa +80%").
- Punti da livello. Respec economico (non punire la sperimentazione).
- Ogni Via ha la sua regione dell'albero; le regioni si toccano per gli ibridi.

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
  (almeno Magico); inventario 40 (pieno → smantella); statistiche piatte +10% per livello oggetto;
  obiettivo: **varietà "infinita"** di armi, statistiche e sinergie (è il cuore del gioco).
- **Deciso (varietà 1-3):** affissi con tag e tipi ammessi, ibridi a 2 statistiche; effetti a scatto solo da
  Epico in su, max 1 per oggetto, effetti uguali **si sommano**; leggendari unici = effetto/regola fissa +
  affissi casuali (25% dei drop da Leggendario); 4 set da 6 pezzi legati agli stili (Paladino, Piromante,
  Assassino, Pestilenza; 8% dei drop da Epico).
- **Deciso (varietà 4, crafting):** ritira affisso, migliora tier (max T5), trasferisci affisso (donatore
  distrutto), fusione 3 uguali → rarità successiva (max Mitico); niente "aggiungi affisso"; unici e set non si
  modificano; ogni modifica sullo stesso oggetto costa ×1,5.
- **Visione:** nemici sempre più forti, ma il giocatore arriva a build **assurde** combinando statistiche,
  skill e sinergie (numeri che esplodono).

## 9. Nemici
- **Famiglie**: Non-morti, Demoni, Bestie corrotte, Culto dell'Eclissi, Creature del Vuoto.
  Ognuna con resistenze e comportamenti propri (es. i Non-morti sono deboli al Sacro).
- **Élite** con affissi casuali (Veloce, Corazzato, Vampirico, Esplosivo…) e drop migliori.
- **Boss** a fine Atto con fasi e meccaniche (scudo da rompere, invocazioni, enrage a tempo).

## 10. Modalità di gioco
| Modalità | Descrizione | Ricompensa principale |
|---|---|---|
| **Campagna** | Atti → zone → stage, progressione lineare | XP, oro, equip base |
| **Dungeon** | run con chiavi e modificatori casuali, boss finale | set, rune, Frammenti |
| **Torre dell'Alba** | piani infiniti a difficoltà crescente, record personale | bonus permanenti a ogni traguardo |
| **Raid / Assedi** | boss enormi multi-fase con timer, si sbloccano a soglie | leggendari e Divini |
| **Abisso** | endgame infinito con livelli di difficoltà scalabili | Paragon, materiali rari |

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
- Numeri grandi: supporto oltre 1e308 (libreria tipo `break_infinity.js`), formattazione 1.2K, 3.4M, poi notazione.

## 13. Progresso offline
- Sì, **senza limite di tempo**.
- Calcolo analitico (non simulazione tick per tick): stima uccisioni/ora sullo stage migliore "sicuro".
- Al rientro: schermata riepilogo soddisfacente (oro, XP, oggetti, livelli guadagnati).

## 14. Meta e collezione
- **Codex/Bestiario**: uccidere N nemici di un tipo dà bonus permanenti contro quella famiglia.
- **Collezione leggendari**: ogni leggendario trovato almeno una volta dà un piccolo bonus permanente.
- **Imprese** (achievement) con ricompense.
- **Lumi**: piccoli spiriti compagni con bonus passivi, si fanno salire di livello.

## 15. Direzione artistica
- **Deciso (2026-10-24): grafica minimale.** Non si vede il personaggio combattere: il gioco è
  numeri, oggetti, statistiche e sinergie, in un'interfaccia DOM/CSS pulita e leggibile.
- **Manichino**: sagoma SVG sobria del guerriero al centro, i 12 slot attorno con bordo del colore della rarità.
- **Combattimento**: barre vita di eroe e nemico + registro degli eventi importanti (critici, uccisioni, bottino).
- **Rarità**: colore del nome e del bordo; le più alte (Leggendario, Mitico, Divino) con bagliore.
- La vecchia scena PixiJS con filtro "inchiostro" resta nella storia di git (commit `caa9a3b`, `f43ab28`).
- Ispirazioni (solo concettuali): Diablo, Path of Exile, Melvor Idle, NGU Idle, Idle Champions.

