/**
 * CONFIGURAZIONE FANTACALCIO26
 * ============================
 * Squadra, budget e composizione rosa.
 *
 * ⚠️ REGOLA FONDAMENTALE SUI RUOLI:
 * Il ruolo di ogni giocatore viene SEMPRE preso dalla lista ufficiale (PDF).
 * Mai dai ruoli presenti in altre fonti/dati. Se un dato esterno riporta un
 * ruolo diverso, va sovrascritto con quello della lista ufficiale.
 *
 * I ruoli ammessi sono ESCLUSIVAMENTE quelli in ROLES.
 */

const CONFIG = {
  teamName: "visitors",
  totalCredits: 300,

  // Composizione rosa obbligatoria
  squadComposition: {
    PORTIERI: 3,
    DIFENSORI: 10,
    CENTROCAMPISTI: 10,
    ATTACCANTI: 8,
  },

  // Ordine di svolgimento dell'asta (per ruolo)
  auctionOrder: ["PORTIERI", "DIFENSORI", "CENTROCAMPISTI", "ATTACCANTI"],

  // Protezione con password (da togliere in futuro: basta mettere enabled=false)
  auth: {
    enabled: true,
    password: "Ft26!xK9#mQz",
  },

  // Cloud sync (jsonbin.io) — per salvare le modifiche su tutti i dispositivi
  cloud: {
    enabled: true,
    masterKey: "$2a$10$oR3Ad8nz2TF.UtQMshtr4eMWjZf98A9HfzlsSMIAsKt5ffM4UvjtK",
    binId: "6a96ec1ada38895dfe2b938b",
  },
};

// Ruoli ammessi (fonte di verità = lista PDF)
const ROLES = ["PORTIERI", "DIFENSORI", "CENTROCAMPISTI", "ATTACCANTI"];

// Etichette leggibili per i ruoli
const ROLE_LABELS = {
  PORTIERI: "Portieri",
  DIFENSORI: "Difensori",
  CENTROCAMPISTI: "Centrocampisti",
  ATTACCANTI: "Attaccanti",
};

// Colore associato a ogni ruolo (usato in UI)
const ROLE_COLORS = {
  PORTIERI: "#f59e0b",      // ambra
  DIFENSORI: "#3b82f6",     // blu
  CENTROCAMPISTI: "#22c55e",// verde
  ATTACCANTI: "#ef4444",    // rosso
};
