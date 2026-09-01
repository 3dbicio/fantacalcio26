/**
 * CLOUD SYNC — FANTACALCIO26
 * ==========================
 * Sincronizza lo stato (rosa, stelline, note, flag) con jsonbin.io,
 * così le modifiche sono visibili da qualsiasi dispositivo.
 *
 * - init(): carica lo stato dal cloud (fallback: localStorage).
 * - save(): salva su cloud + aggiorna la cache locale.
 * - saveDebounced(): salva con debounce (evita troppi request).
 *
 * ⚠️ La Master Key è nel codice (sito statico): chiunque può leggerla.
 *    Adatto a uso personale; per sicurezza reale servirebbe un backend.
 */
(function () {
  "use strict";

  const C = (typeof CONFIG !== "undefined" && CONFIG.cloud) || { enabled: false };
  const API = "https://api.jsonbin.io/v3/b/" + C.binId;
  const LS_KEY = "fantacalcio26_state_v1";

  let state = null; // stato in memoria (fonte di verità runtime)

  function emptyState() {
    return { players: {}, squad: [], ratings: {}, notes: {} };
  }

  function readLocal() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        return {
          players: p.players || {},
          squad: p.squad || [],
          ratings: p.ratings || {},
          notes: p.notes || {},
        };
      }
    } catch (e) {
      console.warn("Lettura locale fallita:", e);
    }
    return emptyState();
  }

  function writeLocal(s) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(s));
    } catch (e) {
      console.warn("Scrittura locale fallita:", e);
    }
  }

  /** Carica lo stato dal cloud (o dalla cache locale se offline). */
  async function init() {
    if (!C.enabled) {
      state = readLocal();
      return state;
    }
    try {
      const res = await fetch(API + "/latest", {
        headers: { "X-Master-Key": C.masterKey },
      });
      if (res.ok) {
        const data = await res.json();
        state = {
          players: (data && data.players) || {},
          squad: (data && data.squad) || [],
          ratings: (data && data.ratings) || {},
          notes: (data && data.notes) || {},
        };
        writeLocal(state); // aggiorna cache locale
      } else {
        state = readLocal();
      }
    } catch (e) {
      console.warn("Cloud non raggiungibile, uso cache locale:", e);
      state = readLocal();
    }
    return state;
  }

  /** Ritorna lo stato corrente in memoria. */
  function getState() {
    if (!state) state = readLocal();
    return state;
  }

  /** Salva lo stato su cloud + cache locale. */
  async function save(newState) {
    state = newState || state;
    writeLocal(state);
    if (!C.enabled) return;
    try {
      await fetch(API, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Master-Key": C.masterKey,
        },
        body: JSON.stringify(state),
      });
    } catch (e) {
      console.warn("Salvataggio cloud fallito (resterà in cache locale):", e);
    }
  }

  // Debounce: raggruppa i salvataggi ravvicinati
  let _t = null;
  function saveDebounced(newState, ms) {
    if (newState) state = newState;
    clearTimeout(_t);
    _t = setTimeout(() => save(state), ms || 600);
  }

  window.Cloud = { init, getState, save, saveDebounced };
})();
