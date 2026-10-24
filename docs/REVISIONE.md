# Revisione — sessione autonoma del 2026-10-24

Mi hai chiesto di andare avanti con tutte le fasi e di raccogliere qui i dubbi. Ho fatto le Fasi 3.5 → 6 e due
lotti della Fase 7. Ogni scelta qui sotto è **già nel gioco**: basta rispondere "ok" oppure dirmi cosa cambiare.
Tutto è sul branch `claude/epic-allen-10jgj5` (156 test verdi). **`main` non l'ho toccato**: il gioco online è
ancora fermo alle sinergie per tag. Quando approvi, lo allineo e si ripubblica.

Per rispondere in fretta: scrivi il numero della domanda e la risposta (es. "3: sì, 7: 50 invece di 40").

---

## Fase 3.5 — Vie (sottoclassi)

**Fatto.** Al livello 10 si sceglie una Via nella scheda Eroe; cambiarla è gratis. Ogni Via dà statistiche,
una regola propria e 2 skill esclusive (ai livelli 10 e 22):

| Via | Regola | Skill |
|---|---|---|
| Paladino del Sole | restituisce il 30% del danno subito | Martello Sacro, Baluardo |
| Lama dell'Alba | 25% di probabilità di colpire due volte | Danza delle Lame, Mille Tagli |
| Inquisitore | ogni colpo brucia per il 25% del danno | Rogo, Condanna |
| Custode Stellare | uno spirito colpisce ogni secondo (50% attacco, sacro) | Pioggia Stellare, Benedizione delle Stelle |
| Eclissiarca | più vita manca, più danni (fino a +100%) | Lama del Vuoto, Eclissi Totale |

La seconda Via (ibrido) si sblocca con l'Ascensione: dà metà delle statistiche, ma regola e skill intere.

1. **Va bene il livello 10 e il cambio gratuito?** (alternativa: cambio a pagamento in oro)
2. **Seconda Via al 50% delle statistiche**: ok, o la vuoi intera / più debole?
3. Ho aggiunto il tag skill **Ombra** (e 2 affissi "del Crepuscolo" / "dell'Ombra Lunga") per l'Eclissiarca. Ok?
4. **Purezza/Corruzione** (GDD §3) non l'ho fatta: l'Eclissiarca usa la vita come rischio. La vuoi come
   sistema a parte?

## Fase 4 — Contenuti

**Fatto.**
- **10 zone** da 10 stage (Cimitero dei Caduti → Cuore dell'Eclissi), una famiglia di nemici ciascuna; dopo lo
  stage 100 si ricomincia ("Cimitero dei Caduti II"). Scheda **Mondo** con zona, lore e resistenze.
- **5 famiglie** con resistenze (es. Non-morti: sacro +50%, ombra −50%), 3 nemici ciascuna (15 in tutto).
- **Élite** dallo stage 5 (8% dei nemici): Veloce, Corazzato, Vampirico, Robusto, Furioso; ×3 ricompense.
- **Boss di zona** all'ultimo stage di ogni zona, con meccaniche: furia col tempo, scudo a metà vita,
  evocazioni, rigenerazione. Danno sempre una **chiave**.
- **Dungeon**: 1 chiave, 8 nemici + boss, 2 modificatori casuali su 6 che alzano i premi; premio: Frammenti,
  Essenza e un **pezzo di set garantito**. Se muori la chiave è persa.
- **Torre dell'Alba**: gratis, 30 s per piano; ogni 5 piani di record **+3% attacco e vita per sempre**.
- **Raid** (dallo stage 50): 3 chiavi, 120 s, boss in 3 fasi; premio: Leggendario garantito (15% Mitico, 2% Divino).
- Durante Dungeon/Torre/Raid la Campagna è in pausa; si può abbandonare in qualsiasi momento.

5. **Nomi** di zone, nemici e boss (in `src/data/enemies.ts`): ti piacciono?
6. **Le chiavi abbondano** dopo qualche Ascensione (i boss di zona si rifanno ogni volta): nel collaudo
   ~80 dungeon in 4 ore. Le rendo più rare (es. chiave solo la prima volta che batti un boss di zona)?
7. **Muro allo stage 50**: il boss di zona (scudo + rigenerazione) blocca per ore un giocatore senza
   Ascensione. L'ho già ammorbidito (rigenerazione 1,5% → 1%/s). Lo vuoi così (spinge ad ascendere) o più morbido?
8. Raid: **3 chiavi e 120 s** vanno bene? Il premio Divino al 2% è giusto?
9. **Abisso** (endgame infinito con difficoltà scalabili) non l'ho fatto: lo vuoi presto o dopo i contenuti?

## Fase 5 — Progressione infinita

**Fatto.**
- **Ascensione** dallo stage 40 (scheda Ascensione, doppio tocco per confermare). Valuta:
  **Scintille** = ((record − 30) / 10)² → stage 50: 4, stage 60: 9, stage 100: 49.
  Si azzerano livello, oro, potenziamenti, stage e Costellazioni (i punti tornano salendo); restano oggetti,
  Frammenti, Essenza, rune, chiavi, Torre e Vie.
- **9 potenziamenti permanenti**: Fiamma Interiore (+20% attacco e vita/lv, infinito), oro, esperienza, Essenza,
  ritrovamento magico, Balzo Solare (riparti dallo stage 6, 11…), Veglia Eterna (offline), Quinto Sole
  (+1 slot skill, max 2), Doppia Via.
- **Progresso offline senza limite**: al rientro il gioco simula 5 minuti sullo stage attuale (senza avanzare),
  misura il ritmo e lo moltiplica per il tempo passato. Efficienza **75%** (fino a 100% con Veglia Eterna).
  Massimo 30 oggetti veri, il resto diventa Frammenti. Schermata "Bentornato" con il riepilogo.
- **Numeri grandi**: K, M, B, T, Qa, Qi, Sx, Sp, Oc, No, Dc, poi notazione esponenziale (1.23e40).

10. **Nome della valuta**: il GDD diceva "Stelle", ma "Stelle" è già la scheda delle Costellazioni, quindi ho
    usato **Scintille**. Ok, o preferisci un altro nome?
11. **Ascensione allo stage 40** e la formula delle Scintille: ok? Nel collaudo la prima arriva in meno di 1 ora.
12. **Efficienza offline 75%**: ok, o la vuoi al 100% fin da subito?
13. **Numeri oltre 1e308** (libreria tipo break_infinity): per ora non servono (ci vorrebbe lo stage ~3800).
    Rimando finché non ci arriviamo?
14. **Paragon** (livelli oltre un limite) e **Rinascita Solare** (meta-prestigio): li faccio dopo?

## Fase 6 — Estetica

**Fatto.** Icone SVG minimali per gli 11 tipi di oggetto, colorate con la rarità; bagliore attorno agli slot
Leggendari e Mitici, il **Divino pulsa**; lampo sulla barra del nemico ai critici e scossa sulla tua quando
vieni colpito; avvisi in alto per livello, bottino Leggendario+ e Dungeon completati. **Suoni** sintetizzati
(niente file): pulsante ♪ accanto al titolo.

15. ~~Suoni~~ e 16. ~~icone~~: **risolte**, la grafica si rifinisce alla fine (resta lo stile minimo).

## Fase 7 — Contenuti a lotti

**Fatto.**
- Lotto 1 (con le Vie): 10 skill delle Vie.
- Lotto 2: **regioni delle Vie nelle Costellazioni**: 5 rami esterni (~100 nodi, totale ~250), 10 notevoli e
  5 nuove chiavi di volta (Giuramento, Mille Soli, Rogo Eterno, Costellazione Vivente, Sangue Nero);
  **5 leggendari unici** che danno la regola di una Via a chiunque (utili per gli ibridi).

17. Le **regioni delle Vie sono aperte a tutti** (PoE-style), non solo a chi segue quella Via. Ok, o le rendo
    esclusive?
18. **Lotto 3 fatto dopo la tua risposta sulla grafica**: skill 18 → 30 (12 nuove dal livello 28 al 60, nuovo
    tag Gelo) e rune 12 → 24 (Condanna, Apertura, Luminescenza, Consacrazione, Marchio, Rinnovamento, Catena,
    Fulgore, Incendio, Brina, Tempesta, Custodia). Prossimo lotto: altre rune fino a ~40, oppure prima
    Codex/Bestiario, Imprese e Lumi (GDD §14)?
23. **Costo di sblocco delle rune**: con 24 rune la crescita ×1,6 per runa porta l'ultima a ~2,5 milioni di
    Essenza. La abbasso (es. ×1,35) o va bene come obiettivo a lungo termine?

## Domande rimaste aperte dalle sessioni precedenti

19. **Costellazioni** (passo 4): le hai provate? Le approvi?
20. **Sinergie per tag**: avevi detto 10/20/30%, io ho usato i moltiplicatori di tier esistenti
    (10/15/20/27/35%). Va bene così?
21. **Revisione dal telefono** (Fase 1): mai fatta. Appena pubblico su `main`, riesci a provarlo dal telefono?
22. **Posso allineare `main`** e pubblicare tutto online?

---

## Note tecniche (per sapere cosa c'è)

- Salvataggio **v13**: i salvataggi vecchi si migrano da soli (il nemico in corso al momento dell'aggiornamento
  viene rigenerato).
- Il **confronto tra oggetti** ora tiene conto di Costellazioni, Vie, Torre e Ascensione (prima solo gli oggetti).
- Entrando in una modalità la vita si ripristina; morire in una modalità non fa perdere stage.
- Test: 156 verdi; collaudo di 4 ore simulate con tutti i sistemi senza errori.
