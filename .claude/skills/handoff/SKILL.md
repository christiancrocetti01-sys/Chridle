---
name: handoff
description: Prepara il passaggio di consegne prima di un /clear. Usare quando l'utente scrive /handoff, dice che il contesto è pieno, o vuole chiudere la sessione.
---

Prepara tutto perché una nuova sessione possa ripartire **senza** questa conversazione.

1. Aggiorna `docs/STATO.md` (resta sotto ~60 righe, sostituisci invece di accumulare):
   - data, fase corrente, **prossimo passo concreto** (file e azione)
   - cosa è stato fatto in questa sessione (punti brevi)
   - decisioni prese con l'utente (sposta quelle stabili in `docs/GDD.md` e toglile da STATO)
   - domande aperte e problemi noti / test che falliscono
2. Spunta i task completati in `docs/ROADMAP.md`.
3. Se è cambiata una convenzione tecnica, aggiornala in `CLAUDE.md` (resta breve).
4. Esegui i test se esistono e annota l'esito in STATO.md.
5. Commit (`docs: handoff <data>`) e push sul branch corrente.
6. Rispondi con 3 righe: cosa è salvato, prossimo passo, "ora puoi fare /clear e poi /riprendi".
