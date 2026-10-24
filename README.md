# Chridle

Idle RPG dark-fantasy testuale per browser e telefono. Il Sole è stato divorato dall'Eclissi: sei il guerriero
della luce e combatti da solo, anche a gioco chiuso. Tu scegli oggetti, skill, rune, Stelle e Vie per costruire
build sempre più assurde.

**Gioca:** https://christiancrocetti01-sys.github.io/Chridle/

## Come si gioca
- Il guerriero avanza da solo: 10 nemici e un boss per stage, poi lo stage successivo.
- Indossa gli oggetti migliori (12 slot, 7 rarità, unici e set), smantella il resto e usa i Frammenti per il crafting.
- Metti le skill nei 4 slot (l'ordine è la priorità) e incastonaci le rune.
- Spendi i punti nelle Stelle e scegli una Via al livello 10.
- Dungeon, Torre dell'Alba, Raid e Abisso danno ricompense speciali.
- Quando ti blocchi, ascendi: ricominci più forte. Poi Rinascita Solare e Paragon.

La guida completa è nel gioco, dal pulsante **?** in alto.

## Sviluppo
```bash
npm install
npm run dev     # gioco in locale
npm test        # test (Vitest) della logica in src/core
npm run build   # tsc + vite
```
Struttura: `src/core` logica pura e deterministica, `src/data` contenuti, `src/ui` interfaccia DOM.
Documenti di progetto in `docs/` (GDD, ROADMAP, STATO), crediti degli asset in `docs/CREDITS.md`.
