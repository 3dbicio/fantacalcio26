# ⚽ Fantacalcio26

App **mobile-first** per gestire l'asta del Fantacalcio 2026.
Squadra: **visitors** · Budget: **300 crediti**

## 🎯 Obiettivo
Inserire i giocatori man mano che arrivano i dati e fare un'asta perfetta,
tenendo d'occhio i crediti rimasti e la composizione della rosa.

## 📋 Composizione rosa obbligatoria
| Ruolo | N° |
|---|---|
| Portieri | 3 |
| Difensori | 10 |
| Centrocampisti | 10 |
| Attaccanti | 8 |
| **Totale** | **31** |

Ordine dell'asta: **Portieri → Difensori → Centrocampisti → Attaccanti**.

## ⚠️ REGOLA FONDAMENTALE SUI RUOLI
Il ruolo di ogni giocatore viene **SEMPRE** preso dalla **lista ufficiale (PDF)**.
**Mai** dai ruoli riportati in altre fonti/dati. In caso di conflitto,
vince **sempre** la lista PDF.

## 🚀 Come usarla
1. Inserisci i giocatori in `js/players.js` (formato già documentato nel file).
2. Apri `index.html` nel browser (o usa `npm start` per un server locale).
3. Per ogni giocatore:
   - **Chiamato?** → segna che è già stato preso da altri (lo nascondi con il filtro).
   - **+ Rosa** → aggiungilo alla tua rosa inserendo il prezzo offerto.
4. Controlla i **crediti rimasti** in alto e la pagina **Rosa** per il riepilogo.

### Pulsanti visibilità
- **Nascondi Chiamati / Mostra Chiamati** → toggle: nasconde o mostra i giocatori già chiamati.

## 💾 Dove sono salvati i dati
Lo stato (rosa + flag "chiamati") è salvato nel **`localStorage`** del browser.
I giocatori di base vivono in `js/players.js`.
> ⚠️ I dati sono per-dispositivo: se cambi telefono/browser, ricominci da zero.

## 🌐 Pubblicazione gratuita
Essendo un sito **statico puro** (HTML/CSS/JS, nessun backend), puoi caricarlo su:
- **GitHub Pages**
- **Netlify**
- **Vercel**

Basta caricare la cartella `fantacalcio26/` e aprire `index.html`.

## 📁 Struttura
```
fantacalcio26/
├── index.html          # Pagina giocatori (asta)
├── squad.html          # Pagina rosa
├── css/
│   └── style.css       # Stile mobile-first
└── js/
    ├── config.js       # Squadra, budget, composizione, ruoli ammessi
    ├── players.js      # ⬅️ I giocatori (da compilare con i dati)
    ├── storage.js      # Persistenza localStorage
    ├── app.js          # Logica pagina giocatori
    └── squad.js        # Logica pagina rosa
```

## 🧮 Valore dei giocatori
Il campo `value` in `js/players.js` è la **cifra massima** a cui possiamo
pagare quel giocatore. La decideremo **insieme** via via che arrivano i dati.
