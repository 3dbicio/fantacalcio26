/**
 * PAGINA ROSA — FANTACALCIO26
 * ===========================
 * Visualizza la mia rosa (squadra "visitors"), i crediti usati/rimasti
 * e la composizione per ruolo. Permette di rimuovere giocatori.
 */

(function () {
  "use strict";

  const squadEl = document.getElementById("squad-list");
  const creditsUsedEl = document.getElementById("credits-used");
  const creditsRemainingEl = document.getElementById("credits-remaining");
  const totalEl = document.getElementById("credits-total");

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /** Stelline (preferiti) read-only, 0–5. */
  function starsHtml(player) {
    const rating = player.rating || 0;
    if (rating === 0) return "";
    let html = `<div class="stars-row"><span class="stars-label">Preferiti</span><div class="stars stars-readonly">`;
    for (let i = 1; i <= 5; i++) {
      html += `<span class="star ${i <= rating ? "on" : ""}">${i <= rating ? "★" : "☆"}</span>`;
    }
    html += `</div></div>`;
    return html;
  }

  function render() {
    const state = Storage.load();
    const enriched = Storage.getEnrichedPlayers();
    const inSquad = enriched.filter((p) => p.inSquad);

    const used = inSquad.reduce((s, p) => s + (p.paidPrice || 0), 0);
    const remaining = CONFIG.totalCredits - used;

    totalEl.textContent = CONFIG.totalCredits;
    creditsUsedEl.textContent = used;
    creditsRemainingEl.textContent = remaining;

    // Barra crediti
    const pct = Math.max(0, Math.min(100, (used / CONFIG.totalCredits) * 100));
    const bar = document.getElementById("credits-bar");
    if (bar) bar.style.width = pct + "%";

    if (inSquad.length === 0) {
      squadEl.innerHTML =
        '<div class="empty">La rosa è vuota.<br>Aggiungi giocatori dalla pagina <a href="index.html">Giocatori</a>.</div>';
      return;
    }

    let html = "";
    CONFIG.auctionOrder.forEach((role) => {
      const group = inSquad
        .filter((p) => p.role === role)
        .sort((a, b) => (b.paidPrice || 0) - (a.paidPrice || 0));
      if (group.length === 0) return;
      const need = CONFIG.squadComposition[role];
      const ok = group.length >= need;
      html += `<section class="role-section">
        <h2 class="role-title" style="--role-color:${ROLE_COLORS[role]}">
          ${ROLE_LABELS[role]}
          <span class="role-count ${ok ? "ok" : "missing"}">${group.length}/${need}</span>
        </h2>
        <div class="player-grid">`;
      group.forEach((p) => {
        html += `
        <article class="player-card in-squad" data-id="${p.id}">
          <div class="player-head">
            <div>
              <h3 class="player-name">${esc(p.name)}
                <button type="button" class="note-btn ${p.note ? "has-note" : ""}" data-action="note" title="Note" aria-label="Note">i</button>
              </h3>
              <p class="player-team">${esc(p.team)}</p>
            </div>
            <div class="player-value">
              <span class="value-num">${p.paidPrice ?? 0}</span>
              <span class="value-label">pagato</span>
            </div>
          </div>
          ${starsHtml(p)}
          <div class="player-actions">
            <button class="btn btn-remove" data-action="remove">Rimuovi</button>
          </div>
        </article>`;
      });
      html += `</div></section>`;
    });

    squadEl.innerHTML = html;
  }

  squadEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const card = e.target.closest(".player-card");
    if (!card) return;
    const id = card.dataset.id;
    const action = btn.dataset.action;

    if (action === "remove") {
      const player = PLAYERS.find((p) => p.id === id);
      if (confirm(`Rimuovere ${player ? player.name : "il giocatore"} dalla rosa?`)) {
        Storage.removeFromSquad(id);
        render();
      }
    } else if (action === "note") {
      openNoteModal(id);
    }
  });

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

  if (noteSave) noteSave.addEventListener("click", () => {
    if (!noteTargetId) return;
    Storage.setNote(noteTargetId, noteTextarea.value);
    closeNoteModal();
    render();
  });
  if (noteClear) noteClear.addEventListener("click", () => {
    if (!noteTargetId) return;
    Storage.setNote(noteTargetId, "");
    closeNoteModal();
    render();
  });
  if (noteModal) {
    noteModal.addEventListener("click", (e) => {
      if (e.target.dataset.close === "1") closeNoteModal();
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && noteModal && !noteModal.hidden) closeNoteModal();
  });

  // --- Init (asincrono per il cloud) ---
  async function init() {
    if (typeof Cloud !== "undefined") {
      await Cloud.init();
    }
    render();
  }
  init();
})();
