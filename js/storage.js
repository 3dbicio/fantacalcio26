/**
 * STORAGE — FANTACALCIO26
 * =======================
 * Stato dell'asta, sincronizzato con il cloud (jsonbin.io) e con
 * cache locale (localStorage):
 *  - players:  stato di ogni giocatore (called, inSquad, paidPrice)
 *  - squad:    la mia rosa (array di id giocatore)
 *  - ratings:  stelline personali (0–5)
 *  - notes:    note libere per giocatore (es. "rigorista 1")
 *
 * Le modifiche sono visibili da qualsiasi dispositivo (stesso link).
 */

const Storage = {
  /** Carica lo stato (dal cloud via Cloud.getState, fallback locale). */
  load() {
    if (typeof Cloud !== "undefined") return Cloud.getState();
    return { players: {}, squad: [], ratings: {}, notes: {} };
  },

  /** Salva lo stato (cloud + cache locale). */
  save(state) {
    if (typeof Cloud !== "undefined") {
      Cloud.saveDebounced(state);
    } else {
      localStorage.setItem("fantacalcio26_state_v1", JSON.stringify(state));
    }
  },

  /** Stato iniziale vuoto. */
  initialState() {
    return { players: {}, squad: [], ratings: {}, notes: {} };
  },

  /** Reset completo (cancella rosa, flag, stelline e note). */
  reset() {
    const empty = this.initialState();
    this.save(empty);
    return empty;
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

  /** Imposta la nota libera di un giocatore (stringa, "" per cancellare). */
  setNote(playerId, text) {
    const state = this.load();
    const t = String(text == null ? "" : text).trim();
    if (t === "") {
      delete state.notes[playerId];
    } else {
      state.notes[playerId] = t;
    }
    this.save(state);
  },

  /** Ritorna la nota di un giocatore ("" se assente). */
  getNote(playerId) {
    const state = this.load();
    return state.notes[playerId] || "";
  },

  /**
   * Ritorna lo stato "arricchito": per ogni giocatore della lista PLAYERS
   * aggiunge i campi called / inSquad / paidPrice / rating / note.
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
        note: state.notes[p.id] || "",
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
