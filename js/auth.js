/**
 * AUTH GATE — FANTACALCIO26
 * ==========================
 * Protezione con password (debole, solo client-side).
 * - Il sito resta VISIBILE, ma le interazioni (pulsanti, stelline,
 *   ricerca, acquisto, rimozione) sono bloccate finché non si inserisce
 *   la password corretta.
 * - La password corretta viene salvata in sessionStorage: resta valida
 *   per la sessione di navigazione, ma si chiede di nuovo a ogni
 *   nuova apertura del sito.
 *
 * Per togliere la protezione in futuro:
 *   1) in config.js metti  auth.enabled = false
 *   2) (opzionale) rimuovi <script src="js/auth.js"> dalle pagine
 */
(function () {
  "use strict";

  const AUTH = (typeof CONFIG !== "undefined" && CONFIG.auth) || { enabled: false, password: "" };
  if (!AUTH.enabled) return; // protezione disattivata

  const SESSION_KEY = "fantacalcio26_auth_ok";
  const ok = sessionStorage.getItem(SESSION_KEY) === "1";

  // --- Costruisci il gate ---
  const overlay = document.createElement("div");
  overlay.id = "auth-overlay";
  overlay.innerHTML = `
    <div class="auth-card" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <div class="auth-lock">🔒</div>
      <h2 id="auth-title">Area riservata</h2>
      <p class="auth-sub">Il sito è visibile, ma per <strong>modificare</strong> (stelline, rosa, acquisti) inserisci la password.</p>
      <form id="auth-form" autocomplete="off">
        <input type="password" id="auth-pass" class="auth-input" placeholder="Password" required />
        <button type="submit" class="btn auth-btn">Entra</button>
      </form>
      <p class="auth-error" id="auth-error" hidden>Password errata, riprova.</p>
    </div>`;
  document.body.appendChild(overlay);

  // Se già autenticato in questa sessione, rimuovi subito il gate.
  if (ok) {
    overlay.remove();
    return;
  }

  // --- Blocca le interazioni sotto il gate ---
  // Il layer copre tutto (z-index alto) e intercetta i click, quindi i
  // pulsanti/stelline non sono raggiungibili. Blocciamo anche la tastiera
  // per i campi di input e i tentativi di click "a vuoto" sul contenuto.
  function block(e) {
    // consenti solo l'interazione con il form di auth
    if (overlay.contains(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
  }
  document.addEventListener("click", block, true);
  document.addEventListener("input", block, true);
  document.addEventListener("keydown", (e) => {
    if (overlay.contains(document.activeElement)) return;
    // non bloccare la digitazione nel campo password
    if (document.activeElement && document.activeElement.id === "auth-pass") return;
  }, true);

  // --- Gestione form ---
  const form = overlay.querySelector("#auth-form");
  const passInput = overlay.querySelector("#auth-pass");
  const errorEl = overlay.querySelector("#auth-error");

  function unlock() {
    sessionStorage.setItem(SESSION_KEY, "1");
    document.removeEventListener("click", block, true);
    document.removeEventListener("input", block, true);
    overlay.remove();
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (passInput.value === AUTH.password) {
      unlock();
    } else {
      errorEl.hidden = false;
      passInput.value = "";
      passInput.focus();
    }
  });

  // Focus iniziale sul campo password
  setTimeout(() => passInput.focus(), 50);
})();
