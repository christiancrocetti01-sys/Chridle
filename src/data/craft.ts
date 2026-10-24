/** Crafting con i Frammenti. Il costo base è il valore di smantellamento dell'oggetto × il moltiplicatore. */
export const CRAFT_COST = {
  /** Ritira un affisso (ne esce un altro dello stesso genere: normale o a scatto). */
  reroll: 1,
  /** Alza il tier di un affisso: × il tier attuale. */
  upgrade: 2,
  /** Sostituisce un affisso con quello di un oggetto donatore, che viene distrutto. */
  transfer: 3,
};

/** Ogni modifica già fatta sullo stesso oggetto moltiplica il costo della successiva. */
export const CRAFT_GROWTH = 1.5;

/** Fusione: tanti oggetti dello stesso tipo e rarità → uno nuovo della rarità successiva. */
export const FUSE_COUNT = 3;
/** Rarità massima ottenibile con la fusione (indice in RARITIES: 5 = Mitico). */
export const FUSE_MAX_RARITY = 5;
/** Costo della fusione: valore di smantellamento della rarità ottenuta × questo. */
export const FUSE_COST = 1;
