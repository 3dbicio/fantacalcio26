/**
 * STORAGE — FANTACALCIO26
 * =======================
 * Persistenza locale (localStorage) dello stato dell'asta:
 *  - players:  stato di ogni giocatore (called, inSquad, paidPrice)
 *  - squad:    la mia rosa (array di id giocatore)
 *
 * I dati restano sul dispositivo (telefono), ideali per un'asta personale
 * e per un hosting statico gratuito senza backend.
 */

const STORAGE_KEY = "fantacalcio26_state_v1";

const Storage = {
  /** Carica lo stato salvato (o crea lo stato iniziale). */
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          players: parsed.players || {},
          squad: parsed.squad || [],
          ratings: parsed.ratings || {},
        };
      }
    } catch (e) {
      console.warn("Impossibile leggere lo stato salvato:", e);
    }
    return { players: {}, squad: [], ratings: {} };
  },

  /** Salva lo stato corrente. */
  save(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  },

  /** Stato iniziale vuoto. */
  initialState() {
    return { players: {}, squad: [], ratings: {} };
  },

  /** Reset completo (cancella rosa, flag e stelline). */
  reset() {
    localStorage.removeItem(STORAGE_KEY);
    return this.initialState();
  },

  /** Imposta la stellina (rating 0–5) di un giocatore. */
  setRating(playerId, rating) {
    const state = this.load();
    let r = parseInt(rating, 10);
    if (isNaN(r)) r = 0;
    r = Math.max(0, Math.min(5, r));
    if (r === 0) {
      delete state.ratings[playerId];
    } else {
      state.ratings[playerId] = r;
    }
    this.save(state);
  },

  /** Ritorna il rating (0–5) di un giocatore. */
  getRating(playerId) {
    const state = this.load();
    return state.ratings[playerId] || 0;
  },

  /**
   * Ritorna lo stato "arricchito": per ogni giocatore della lista PLAYERS
   * aggiunge i campi called / inSquad / paidPrice dallo stato salvato.
   */
  getEnrichedPlayers() {
    const state = this.load();
    return PLAYERS.map((p) => {
      const st = state.players[p.id] || {};
      return {
        ...p,
        called: !!st.called,
        inSquad: state.squad.includes(p.id),
        paidPrice: st.paidPrice ?? null,
        rating: state.ratings[p.id] || 0,
      };
    });
  },

  /** Segna un giocatore come "già chiamato da altri". */
  setCalled(playerId, called) {
    const state = this.load();
    state.players[playerId] = { ...(state.players[playerId] || {}), called: !!called };
    this.save(state);
  },

  /** Aggiunge un giocatore alla mia rosa pagando `price`. */
  addToSquad(playerId, price) {
    const state = this.load();
    if (!state.squad.includes(playerId)) {
      state.squad.push(playerId);
    }
    state.players[playerId] = {
      ...(state.players[playerId] || {}),
      inSquad: true,
      paidPrice: price,
    };
    this.save(state);
  },

  /** Rimuove un giocatore dalla mia rosa (restituisce i crediti). */
  removeFromSquad(playerId) {
    const state = this.load();
    state.squad = state.squad.filter((id) => id !== playerId);
    if (state.players[playerId]) {
      state.players[playerId].inSquad = false;
      state.players[playerId].paidPrice = null;
    }
    this.save(state);
  },
};
