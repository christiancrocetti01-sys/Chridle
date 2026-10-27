/** Guida del giocatore (menu ≡ in alto): sezioni brevi, testo con poco HTML; {rarita} = elenco colorato. */
export interface GuideSection { id: string; title: string; text: string[] }

export const GUIDE_INTRO =
  "Il Sole è stato divorato dall'Eclissi. Tu sei il guerriero della luce: combatti da solo, anche a gioco chiuso. " +
  'Il guerriero fa quasi tutto da solo: tu scegli la Via, quando ascendere e le modalità.';

export const GUIDE: GuideSection[] = [
  {
    id: 'combattimento', title: 'Combattimento e stage', text: [
      'Il guerriero attacca da solo. Ogni stage ha <b>10 nemici</b> e poi un <b>boss</b>: battuto il boss si passa allo stage successivo.',
      "Se muori torni indietro di uno stage e ti alleni lì finché non sali di livello, poi riparti da solo.",
      "Ogni 10 stage cambia zona e famiglia di nemici; l'ultimo stage della zona ha un boss con meccaniche (scudo, furia, evocazioni, rigenerazione).",
      'Ogni famiglia è debole o resistente ad alcuni elementi: lo leggi sotto la barra del nemico.',
      'Dopo 2 minuti contro lo stesso nemico scatta la <b>Furia</b>: il suo attacco raddoppia ogni 10 s, così nessuno scontro dura per sempre.',
    ],
  },
  {
    id: 'valute', title: 'Valute', text: [
      '<b>Oro</b>: dai nemici, compra da solo il Potenziamento più economico (Eroe).',
      '<b>Essenza</b>: dai nemici, si spende da sola in skill, rune e Lumi.',
      '<b>Frammenti</b>: dagli oggetti scartati, per il crafting.',
      '<b>Chiavi</b>: dai boss di zona (al record, ogni 20 stage), dalla Torre e a volte dalle élite. Aprono Dungeon e Raid.',
      "<b>Scintille</b> e <b>Soli</b>: dall'Ascensione e dalla Rinascita, per i bonus permanenti.",
    ],
  },
  {
    id: 'oggetti', title: 'Oggetti', text: [
      '12 slot e 7 rarità: {rarita}. Più è rara, più affissi ha.',
      "Tutto automatico: ogni oggetto che cade si indossa da solo nello slot dove aumenta di più la potenza (danni × resistenza), il pezzo tolto diventa Frammenti.",
      'Tocca uno slot per vedere l\'oggetto che indossi.',
      "Da Epico in su un oggetto può avere un effetto a scatto (al critico, ogni N colpi…). I <b>leggendari unici</b> hanno una regola fissa, i <b>set</b> danno bonus a 2, 4 e 6 pezzi.",
      'Gli oggetti che non migliorano nulla si smantellano subito in Frammenti. Gli unici nuovi entrano comunque nella Collezione.',
      '<b>Crafting</b> automatico: i Frammenti alzano il tier degli affissi indossati (fino a T5), sempre il più economico. Ogni modifica sullo stesso oggetto costa di più. Unici e set non si modificano.',
    ],
  },
  {
    id: 'skill', title: 'Skill e rune', text: [
      'Colpendo accumuli <b>Luce</b> (max 100); le skill la spendono e partono da sole.',
      '6 skill fisse, sbloccate salendo di livello: Colpo Sacro (1), Preghiera (5), Squarcio (12), Egida (20), Lama Rapida (30), Giudizio (45). Cure e scudi aspettano il momento giusto (vita bassa).',
      'Le esplosioni usano da sole l\'elemento a cui il nemico è più debole, e ne prendono anche il tag (Fuoco, Gelo, Fulmine, Ombra o Sacro).',
      'Tutto automatico: l\'<b>Essenza</b> compra sempre la cosa più economica tra livelli delle skill (+10% ciascuno), <b>rune</b> (2 per skill, scelte e incastonate da sole) e livelli del Lumo attivo.',
      'I tag (Sacro, Fuoco, Nel tempo…) contano: alcuni affissi potenziano tutte le skill con un certo tag.',
    ],
  },
  {
    id: 'stelle', title: 'Stelle (Costellazioni)', text: [
      'Ogni livello dà <b>1 punto</b>, e altri arrivano dalla Torre (1 ogni 10 piani di record) e dalle Ascensioni (1 ogni 3, per sempre). Il gioco prende da solo la stella che rende l\'eroe più forte, e punta alle notevoli e alle chiavi di volta vicine.',
      'Le stelle piccole danno statistiche, le <b>notevoli</b> (al centro degli anelli) bonus forti, le <b>chiavi di volta</b> cambiano le regole.',
      'Cambiando Via le stelle si restituiscono e l\'albero si rifà da solo.',
    ],
  },
  {
    id: 'vie', title: 'Vie', text: [
      'Al <b>livello 10</b> scegli una Via (Eroe › Via): Paladino, Lama dell\'Alba, Inquisitore, Custode Stellare o Eclissiarca.',
      'Ogni Via dà statistiche, una regola speciale e una regione delle Stelle. Cambiarla è gratis.',
      "Con il potenziamento d'Ascensione «Doppia Via» ne aggiungi una seconda.",
      '<b>Purezza e Corruzione</b>: alcuni oggetti e Vie spostano l\'ago. Corruzione = più danni, meno difesa e cure; Purezza = il contrario. Agli estremi si sbloccano effetti speciali.',
    ],
  },
  {
    id: 'mondo', title: 'Modalità', text: [
      'Durante una modalità la Campagna è in pausa; puoi abbandonare quando vuoi.',
      '<b>Dungeon</b> (1 chiave): 8 nemici e un boss con modificatori casuali. Premio: Frammenti, Essenza e un pezzo di set.',
      '<b>Torre dell\'Alba</b> (gratis): un nemico per piano, 30 s ciascuno; si riparte 5 piani sotto il record. Ogni 5 piani di record +3% attacco e vita per sempre.',
      '<b>Raid</b> (dallo stage 50, 3 chiavi): boss in 3 fasi in 120 s. Premio: un Leggendario garantito, a volte Mitico o Divino; un quarto delle volte è l\'unico proprio di quel boss, che non cade altrove.',
      "<b>Abisso</b> (dopo 3 Ascensioni): profondità infinite. Dà esperienza <b>Paragon</b>.",
    ],
  },
  {
    id: 'progressi', title: 'Codex e Lumi', text: [
      '<b>Bestiario</b>: uccidendo una famiglia sali di grado e fai +5% danni contro di lei, per sempre.',
      '<b>Collezione</b>: ogni leggendario unico trovato almeno una volta dà un bonus permanente, più premi al 25/50/100%.',
      '<b>Imprese</b>: traguardi a gradini (uccisioni, stage, livello…), ognuno con un piccolo bonus permanente.',
      '<b>Lumi</b> (Eroe › Lumi): spiriti sbloccati dai traguardi. È attivo (bonus pieno + effetto) il preferito della tua Via, se l\'hai, altrimenti quello di livello più alto; gli altri danno il 25%. L\'Essenza fa salire da solo il Lumo attivo.',
    ],
  },
  {
    id: 'ascensione', title: 'Ascensione, Rinascita, Paragon', text: [
      "<b>Ascensione</b> (dallo stage 40): ricominci da livello 1 e stage 1 in cambio di <b>Scintille</b>, che comprano da sole potenziamenti permanenti (sempre il più economico). " +
        'Tieni oggetti, Frammenti, Essenza, rune, chiavi, Torre e Vie; perdi oro, Potenziamenti e Stelle (i punti tornano salendo).',
      'Più alto è il record, più Scintille: conviene ascendere quando ti blocchi.',
      '<b>Rinascita Solare</b>: azzera anche le Ascensioni in cambio di <b>Soli</b>, moltiplicatori enormi e permanenti.',
      '<b>Paragon</b>: livelli infiniti dall\'Abisso, 1 punto per livello, speso da solo a giro su attacco, vita, critico e difesa.',
    ],
  },
  {
    id: 'offline', title: 'Offline e consigli', text: [
      'A gioco chiuso il guerriero continua (come a gioco aperto): avanza di stage, se cade torna indietro e poi riprova. Al rientro il gioco lo calcola (dopo tanto tempo ci vuole un po\') e trovi il riepilogo.',
      'Il gioco salva da solo nel browser. Il menu ≡ in alto accende i suoni.',
      'I pallini rossi sulle schede indicano qualcosa da fare (punti liberi, Ascensione pronta…).',
      'Bloccato? Prova, in ordine: punti nelle Stelle → Torre → Ascensione.',
    ],
  },
];
