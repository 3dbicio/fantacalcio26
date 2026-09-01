/**
 * PAGINA GIOCATORI — FANTACALCIO26
 * ================================
 * Elenco giocatori ordinati per ruolo (ordine asta) e poi per valore.
 * Controlli: toggle "Nascondi/Mostra Chiamati".
 * Azioni per giocatore: segna "già chiamato", aggiungi alla rosa (con prezzo).
 */

(function () {
  "use strict";

  let state = Storage.load();
  let hideCalled = false; // se true, nascondi i giocatori già chiamati
  let activeRole = "PORTIERI"; // scheda ruolo attiva
  let sortBy = "spend"; // "spend" | "name" | "tit" | "stars"
  let searchQuery = ""; // testo di ricerca (case-insensitive)
  let onlyFav = false; // se true, mostra solo i giocatori con stelline (rating >= 1)

  // --- Elementi DOM ---
  const listEl = document.getElementById("players-list");
  const tabsEl = document.getElementById("role-tabs");
  const searchEl = document.getElementById("player-search");
  const sortNameBtn = document.getElementById("sort-name");
  const sortSpendBtn = document.getElementById("sort-spend");
  const sortTitBtn = document.getElementById("sort-tit");
  const sortStarsBtn = document.getElementById("sort-stars");
  const btnOnlyFav = document.getElementById("btn-only-fav");
  const creditsEl = document.getElementById("credits-remaining");
  const spendableEl = document.getElementById("credits-spendable");
  const squadCountEl = document.getElementById("squad-count");
  const btnToggleCalled = document.getElementById("btn-toggle-called");
  const btnReset = document.getElementById("btn-reset");

  // Modale acquisto
  const buyModal = document.getElementById("buy-modal");
  const buyPlayerName = document.getElementById("buy-player-name");
  const buyHint = document.getElementById("buy-hint");
  const buySlider = document.getElementById("buy-slider");
  const buyNumber = document.getElementById("buy-number");
  const buyConfirm = document.getElementById("buy-confirm");
  let buyTargetId = null;

  // --- Utility ---
  function creditsUsed() {
    return state.squad.reduce((sum, id) => {
      const st = state.players[id] || {};
      return sum + (st.paidPrice || 0);
    }, 0);
  }

  function creditsRemaining() {
    return CONFIG.totalCredits - creditsUsed();
  }

  /**
   * Crediti "disponibili da spendere": crediti rimasti meno i crediti minimi
   * ancora necessari per completare la rosa.
   * Ogni slot costa almeno 1 credito, TRATTO il 3° portiere (0 crediti).
   */
  function spendableCredits() {
    const counts = squadCountByRole();
    let minNeeded = 0;
    CONFIG.auctionOrder.forEach((role) => {
      const need = CONFIG.squadComposition[role];
      const have = counts[role] || 0;
      const slotsLeft = Math.max(0, need - have);
      if (role === "PORTIERI") {
        // il 3° portiere (ultimo slot) costa 0, gli altri 2 costano almeno 1
        const paidSlots = Math.max(0, slotsLeft - 1);
        minNeeded += paidSlots * 1;
      } else {
        minNeeded += slotsLeft * 1;
      }
    });
    return Math.max(0, creditsRemaining() - minNeeded);
  }

  function squadCountByRole() {
    const counts = { PORTIERI: 0, DIFENSORI: 0, CENTROCAMPISTI: 0, ATTACCANTI: 0 };
    const enriched = Storage.getEnrichedPlayers();
    enriched.forEach((p) => {
      if (p.inSquad && counts[p.role] !== undefined) counts[p.role]++;
    });
    return counts;
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /**
   * TITOLARITÀ
   * ------------------------------------------------
   * Valore preso dal file xlsx "Carmy Classic" (scala 0–5, campo `titolarita`).
   * Fallback (solo per i giocatori non presenti nell'xlsx): stima indicativa
   * dalla quotazione, mostrata in percentuale.
   */
  function maxRoleValue(role) {
    const vals = PLAYERS.filter((p) => p.role === role).map((p) => p.value || 0);
    return vals.length ? Math.max.apply(null, vals) : 1;
  }

  /** Punteggio numerico di titolarità (0-5) per l'ordinamento. */
  function titScore(player) {
    if (player.titolarita != null) return player.titolarita;
    // Fallback: stima dalla quotazione mappata su 0-5
    const max = maxRoleValue(player.role) || 1;
    return Math.round(((player.value || 0) / max) * 5);
  }

  /** Ritorna { label, color } per la badge di titolarità. */
  function startingInfo(player) {
    if (player.titolarita != null) {
      const t = player.titolarita; // 0..5
      let color;
      if (t <= 1) color = "#ef4444"; // rosso
      else if (t === 2) color = "#eab308"; // giallo
      else if (t === 3) color = "#f97316"; // arancione
      else color = "#22c55e";              // verde (4-5)
      return { label: t + "/5", color: color };
    }
    // Fallback: stima dalla quotazione (5%–95%)
    const max = maxRoleValue(player.role) || 1;
    const pct = Math.round(5 + ((player.value || 0) / max) * 90);
    let color;
    if (pct < 35) color = "#ef4444";
    else if (pct < 55) color = "#eab308";
    else if (pct < 75) color = "#f97316";
    else color = "#22c55e";
    return { label: pct + "%", color: color };
  }

  /**
   * STELLINE (preferenza personale 0–5)
   * ------------------------------------------------
   * 5 stelline cliccabili. Il rating è salvato nello stato utente
   * (localStorage) e persiste tra le sessioni.
   */
  function starsHtml(player) {
    const rating = player.rating || 0;
    let html = `<div class="stars-row">
      <span class="stars-label">Preferiti</span>
      <div class="stars" data-id="${player.id}" role="radiogroup" aria-label="Preferiti ${rating} su 5">`;
    for (let i = 1; i <= 5; i++) {
      const filled = i <= rating;
      html += `<button type="button" class="star ${filled ? "on" : ""}" data-star="${i}" aria-label="${i} stelle">${filled ? "★" : "☆"}</button>`;
    }
    html += `</div></div>`;
    return html;
  }

  /**
   * Scomposizione nome/cognome.
   * Il campo "CALCIATORE" del listone è di norma il COGNOME.
   * - Se inizia con una PARTICELLA (DE, DA, DEL, DI, VAN, DER, EL, ...)
   *   l'intero nome è il cognome (es. DE GEA, VAN DER BREMPT, DA SILVA MOREIRA).
   * - Se inizia con un NOME PROPRIO noto, lo separo come nome (es. NUNO TAVARES).
   * - Altrimenti l'intero nome è il cognome.
   */
  const NAME_PARTICLES = new Set([
    "DE", "DA", "DEL", "DI", "VAN", "VANDER", "DER", "DEN", "EL", "BIN",
    "AL", "FITZ", "ST", "SAN", "TER", "TEN", "VON", "LA", "LE", "LOS", "LAS",
  ]);
  const KNOWN_FIRST_NAMES = new Set([
    "NUNO", "TCHATO", "CARLOS", "DOUGLAS", "GIORGIO", "JOAO", "JOÃO",
    "LUIS", "LUIZ", "PEDRO", "PAULO", "RAFAEL", "FABIO", "FABIO",
  ]);

  function splitName(full) {
    const parts = String(full).trim().split(/\s+/);
    if (parts.length <= 1) return { surname: parts[0] || "", firstname: "" };
    const first = parts[0].toUpperCase();
    if (NAME_PARTICLES.has(first)) {
      // particella -> tutto cognome
      return { surname: parts.join(" "), firstname: "" };
    }
    if (KNOWN_FIRST_NAMES.has(first)) {
      // primo nome -> separa
      return { surname: parts.slice(1).join(" "), firstname: parts[0] };
    }
    // default: tutto cognome (convenzione listone)
    return { surname: parts.join(" "), firstname: "" };
  }

  // --- Rendering ---
  function render() {
    state = Storage.load();
    const enriched = Storage.getEnrichedPlayers();
    const counts = squadCountByRole();

    creditsEl.textContent = creditsRemaining();
    if (spendableEl) spendableEl.textContent = spendableCredits();
    squadCountEl.textContent = state.squad.length;

    // Aggiorna badge composizione rosa
    CONFIG.auctionOrder.forEach((role) => {
      const badge = document.getElementById("count-" + role);
      if (badge) badge.textContent = counts[role] + "/" + CONFIG.squadComposition[role];
    });

    // Contatori per le schede (giocatori disponibili per ruolo)
    CONFIG.auctionOrder.forEach((role) => {
      const el = document.getElementById("tab-count-" + role);
      if (el) {
        const n = enriched.filter((p) => p.role === role && !p.inSquad).length;
        el.textContent = n;
      }
    });

    // Mostra solo la scheda attiva, escludi acquistati e (opz) già chiamati
    const q = searchQuery.trim().toUpperCase();
    const group = enriched
      .filter((p) => p.role === activeRole)
      .filter((p) => !p.inSquad) // acquistati nascosti dalla lista
      .filter((p) => !hideCalled || !p.called)
      .filter((p) => !onlyFav || (p.rating || 0) >= 1)
      .filter((p) => !q || p.name.toUpperCase().includes(q) || p.team.toUpperCase().includes(q))
      .sort((a, b) => {
        // I giocatori senza titolarità (campo 0-5) vanno sempre in fondo
        const aHasTit = a.titolarita != null;
        const bHasTit = b.titolarita != null;
        if (aHasTit !== bHasTit) return aHasTit ? -1 : 1;

        if (sortBy === "stars") {
          // per stelline (rating 0-5), poi spesa max, poi nome
          const ra = a.rating || 0;
          const rb = b.rating || 0;
          if (rb !== ra) return rb - ra;
          const sa = a.maxSpend ?? a.value ?? 0;
          const sb = b.maxSpend ?? b.value ?? 0;
          if (sb !== sa) return sb - sa;
          return a.name.localeCompare(b.name, "it");
        }
        if (sortBy === "name") {
          return a.name.localeCompare(b.name, "it");
        }
        if (sortBy === "tit") {
          // per titolarità (0-5 dall'xlsx, fallback stima dalla quotazione)
          const ta = titScore(a);
          const tb = titScore(b);
          if (tb !== ta) return tb - ta;
          // secondo criterio: spesa massima (maxSpend, fallback value)
          const sa = a.maxSpend ?? a.value ?? 0;
          const sb = b.maxSpend ?? b.value ?? 0;
          if (sb !== sa) return sb - sa;
          return a.name.localeCompare(b.name, "it");
        }
        // per spesa massima (maxSpend, fallback value)
        const sa = a.maxSpend ?? a.value ?? 0;
        const sb = b.maxSpend ?? b.value ?? 0;
        if (sb !== sa) return sb - sa;
        return a.name.localeCompare(b.name, "it");
      });

    if (group.length === 0) {
      listEl.innerHTML = q
        ? `<div class="empty">Nessun giocatore trovato per "<strong>${esc(searchQuery)}</strong>" in ${ROLE_LABELS[activeRole]}.</div>`
        : '<div class="empty">Nessun giocatore disponibile in questa scheda.</div>';
      return;
    }

    const roleFull = counts[activeRole] >= CONFIG.squadComposition[activeRole];
    let html = `<section class="role-section">
      <h2 class="role-title" style="--role-color:${ROLE_COLORS[activeRole]}">
        ${ROLE_LABELS[activeRole]}
        <span class="role-count ${roleFull ? "ok" : ""}">${counts[activeRole]}/${CONFIG.squadComposition[activeRole]}</span>
      </h2>
      <div class="player-grid">`;
    group.forEach((p) => {
      const { label: titLabel, color: titColor } = startingInfo(p);
      // Cognome (grande) + Nome (piccolo, come l'età)
      const { surname, firstname } = splitName(p.name);
      const altRoleBadge = p.altRole
        ? ` <span class="alt-role" title="Ruolo secondo la valutazione (Carmy Classic): ${ROLE_LABELS[p.altRole]}">⚠ ${ROLE_LABELS[p.altRole]}</span>`
        : "";
      html += `
      <article class="player-card ${p.called ? "called" : ""}" data-id="${p.id}">
        <div class="player-head">
          <div class="player-id">
            <h3 class="player-name">${esc(surname)}${firstname ? ` <span class="player-firstname">${esc(firstname)}</span>` : ""} <span class="player-age">${p.age ?? ""} anni</span>${altRoleBadge}
              <button type="button" class="note-btn ${p.note ? "has-note" : ""}" data-action="note" title="Note" aria-label="Note">i</button>
            </h3>
            <p class="player-team">${esc(p.team)}</p>
          </div>
          <div class="player-values">
            <div class="pv-box pv-max" title="Media dei 3 file (Carmy, Profeta, Tattico)">
              <span class="pv-num">${p.maxSpend ?? "—"}</span>
              <span class="pv-label">max</span>
            </div>
            <div class="pv-row">
              <span class="pv-mini" title="Carmy">${p.valCarmy ?? "–"}</span>
              <span class="pv-mini" title="Profeta">${p.valProfeta ?? "–"}</span>
              <span class="pv-mini" title="Tattico">${p.valTattico ?? "–"}</span>
            </div>
            <div class="pv-legend">C · P · T</div>
          </div>
        </div>
        <div class="starting-row">
          <span class="starting-label">Titolarità</span>
          <span class="starting-badge" style="background:${titColor}">${titLabel}</span>
        </div>
        ${starsHtml(p)}
        ${p.notes ? `<p class="player-notes">${esc(p.notes)}</p>` : ""}
        <div class="player-actions">
          <button class="btn btn-call ${p.called ? "active" : ""}" data-action="toggle-called">
            ${p.called ? "✓ Già Chiamato!" : "Già Chiamato!"}
          </button>
          <button class="btn btn-squad" data-action="add-squad" ${roleFull ? "disabled" : ""}>
            ${roleFull ? "Reparto Completo" : "Acquistato a..."}
          </button>
        </div>
      </article>`;
    });
    html += `</div></section>`;

    listEl.innerHTML = html;
  }

  // --- Modale acquisto ---
  function openBuyModal(playerId) {
    const player = PLAYERS.find((p) => p.id === playerId);
    if (!player) return;

    // Limite per reparto: non si può superare la composizione rosa
    const need = CONFIG.squadComposition[player.role];
    const have = squadCountByRole()[player.role] || 0;
    if (have >= need) {
      alert(`Reparto Completo\n\n${ROLE_LABELS[player.role]}: ${have}/${need}\nNon puoi aggiungere altri ${ROLE_LABELS[player.role].toLowerCase()}.`);
      return;
    }

    buyTargetId = playerId;

    buyPlayerName.textContent = `${player.name} · ${player.team}`;

    const remaining = creditsRemaining();
    const isThirdKeeper =
      player.role === "PORTIERI" &&
      squadCountByRole().PORTIERI >= 2; // 3° portiere → può costare 0

    const maxSpend = player.maxSpend ?? player.value ?? 0;
    let hint = `Massimo di spesa: ${maxSpend} · Crediti rimanenti: ${remaining}`;
    if (player.altRole) hint += ` · ⚠ Ruolo valutazione: ${ROLE_LABELS[player.altRole]}`;
    if (isThirdKeeper) hint += ` · 3° portiere (min. 0)`;
    else hint += ` · Minimo 1 credito`;
    buyHint.textContent = hint;

    // Valore di base = 1 (o 0 per il 3° portiere), mai oltre i crediti rimanenti
    const base = isThirdKeeper ? 0 : 1;
    const start = Math.min(Math.max(base, 0), Math.min(250, remaining));
    buySlider.value = String(start);
    buyNumber.value = String(start);

    buyModal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeBuyModal() {
    buyModal.hidden = true;
    buyTargetId = null;
    document.body.style.overflow = "";
  }

  // --- Modale note ---
  const noteModal = document.getElementById("note-modal");
  const notePlayerName = document.getElementById("note-player-name");
  const noteTextarea = document.getElementById("note-textarea");
  const noteSave = document.getElementById("note-save");
  const noteClear = document.getElementById("note-clear");
  let noteTargetId = null;

  function openNoteModal(playerId) {
    const player = PLAYERS.find((p) => p.id === playerId);
    if (!player) return;
    noteTargetId = playerId;
    notePlayerName.textContent = `${player.name} · ${player.team}`;
    noteTextarea.value = Storage.getNote(playerId);
    noteModal.hidden = false;
    document.body.style.overflow = "hidden";
    setTimeout(() => noteTextarea.focus(), 50);
  }

  function closeNoteModal() {
    noteModal.hidden = true;
    noteTargetId = null;
    document.body.style.overflow = "";
  }

  function saveNote() {
    if (!noteTargetId) return;
    Storage.setNote(noteTargetId, noteTextarea.value);
    closeNoteModal();
    render();
  }

  function clearNote() {
    if (!noteTargetId) return;
    Storage.setNote(noteTargetId, "");
    closeNoteModal();
    render();
  }

  if (noteSave) noteSave.addEventListener("click", saveNote);
  if (noteClear) noteClear.addEventListener("click", clearNote);
  if (noteModal) {
    noteModal.addEventListener("click", (e) => {
      if (e.target.dataset.close === "1") closeNoteModal();
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && noteModal && !noteModal.hidden) closeNoteModal();
  });

  function confirmBuy() {
    if (!buyTargetId) return;
    const player = PLAYERS.find((p) => p.id === buyTargetId);
    if (!player) return;

    let price = parseInt(buyNumber.value, 10);
    if (isNaN(price)) price = parseInt(buySlider.value, 10);
    if (isNaN(price) || price < 0) price = 0;
    if (price > 250) price = 250;

    const remaining = creditsRemaining();
    if (price > remaining) {
      alert(`Crediti insufficienti! Rimanenti: ${remaining}`);
      return;
    }

    Storage.addToSquad(buyTargetId, price);
    closeBuyModal();
    render();
  }

  // Sync slider <-> number
  buySlider.addEventListener("input", () => {
    buyNumber.value = buySlider.value;
  });
  buyNumber.addEventListener("input", () => {
    let v = parseInt(buyNumber.value, 10);
    if (isNaN(v)) v = 0;
    if (v < 0) v = 0;
    if (v > 250) v = 250;
    buySlider.value = String(v);
  });
  buyConfirm.addEventListener("click", confirmBuy);
  buyModal.addEventListener("click", (e) => {
    if (e.target.dataset.close === "1") closeBuyModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !buyModal.hidden) closeBuyModal();
  });

  // --- Eventi ---
  listEl.addEventListener("click", (e) => {
    // Stelline (preferiti)
    const star = e.target.closest("button.star");
    if (star) {
      const starsBox = star.closest(".stars");
      const id = starsBox.dataset.id;
      const current = Storage.getRating(id);
      const value = parseInt(star.dataset.star, 10);
      // click sulla stessa stellina già attiva -> azzera
      Storage.setRating(id, value === current ? 0 : value);
      render();
      return;
    }

    const btn = e.target.closest("button[data-action]");
    if (!btn || btn.disabled) return;
    const card = e.target.closest(".player-card");
    if (!card) return;
    const id = card.dataset.id;
    const action = btn.dataset.action;

    if (action === "toggle-called") {
      const st = state.players[id] || {};
      Storage.setCalled(id, !st.called);
      render();
    } else if (action === "add-squad") {
      openBuyModal(id);
    } else if (action === "note") {
      openNoteModal(id);
    }
  });

  // --- Ricerca (in tempo reale) ---
  if (searchEl) {
    searchEl.addEventListener("input", () => {
      searchQuery = searchEl.value;
      render();
    });
  }

  // --- Ordinamento ---
  function updateSortButtons() {
    if (!sortNameBtn || !sortSpendBtn || !sortTitBtn) return;
    sortNameBtn.classList.toggle("active", sortBy === "name");
    sortSpendBtn.classList.toggle("active", sortBy === "spend");
    sortTitBtn.classList.toggle("active", sortBy === "tit");
    if (sortStarsBtn) sortStarsBtn.classList.toggle("active", sortBy === "stars");
  }
  if (sortNameBtn) {
    sortNameBtn.addEventListener("click", () => {
      sortBy = "name";
      updateSortButtons();
      render();
    });
  }
  if (sortSpendBtn) {
    sortSpendBtn.addEventListener("click", () => {
      sortBy = "spend";
      updateSortButtons();
      render();
    });
  }
  if (sortTitBtn) {
    sortTitBtn.addEventListener("click", () => {
      sortBy = "tit";
      updateSortButtons();
      render();
    });
  }
  if (sortStarsBtn) {
    sortStarsBtn.addEventListener("click", () => {
      sortBy = "stars";
      updateSortButtons();
      render();
    });
  }

  // --- Filtro "Solo preferiti" ---
  if (btnOnlyFav) {
    btnOnlyFav.addEventListener("click", () => {
      onlyFav = !onlyFav;
      btnOnlyFav.classList.toggle("active", onlyFav);
      render();
    });
  }

  // --- Schede (tab) per ruolo ---
  function updateTabs() {
    if (!tabsEl) return;
    tabsEl.querySelectorAll(".tab").forEach((t) => {
      t.classList.toggle("active", t.dataset.role === activeRole);
    });
  }

  if (tabsEl) {
    tabsEl.addEventListener("click", (e) => {
      const tab = e.target.closest(".tab");
      if (!tab) return;
      activeRole = tab.dataset.role;
      updateTabs();
      render();
    });
  }

  btnToggleCalled.addEventListener("click", () => {
    hideCalled = !hideCalled;
    updateFilterButtons();
    render();
  });

  btnReset.addEventListener("click", () => {
    if (confirm("Reset completo? Verranno cancellati rosa, flag 'chiamati' e stelline.")) {
      Storage.reset();
      hideCalled = false;
      updateFilterButtons();
      render();
    }
  });

  function updateFilterButtons() {
    // Il tasto mostra l'AZIONE che farà il click:
    //   chiamati visibili  → "Nascondi Chiamati" (clicca per nascondere)
    //   chiamati nascosti  → "Mostra Chiamati"  (clicca per mostrare)
    btnToggleCalled.textContent = hideCalled ? "Mostra Chiamati" : "Nascondi Chiamati";
    btnToggleCalled.classList.toggle("active", !hideCalled);
    btnToggleCalled.setAttribute("aria-pressed", String(hideCalled));
  }

  // --- Init ---
  async function init() {
    if (typeof Cloud !== "undefined") {
      await Cloud.init();
      state = Storage.load(); // ricarica lo stato dal cloud
    }
    updateFilterButtons();
    updateTabs();
    updateSortButtons();
    render();
  }
  init();
})();
