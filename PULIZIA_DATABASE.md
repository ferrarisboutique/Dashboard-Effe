# 🧹 Guida alla Pulizia del Database

## Problema Attuale
Il database contiene **1000 vendite con canale "UNDEFINED"** che causano warning nella dashboard.

## ✅ Soluzione: Usa l'Interfaccia Web

### Opzione 1: Dashboard Settings (Consigliata)
1. Vai su **https://dashboard-effe.vercel.app**
2. Click sulla **Sidebar** → **"Impostazioni"** (icona ingranaggio ⚙️)
3. Scorri fino alla sezione **"Cancellazione Dati"** (sfondo rosso)
4. Click su **"Cancella Vendite"** 
5. Conferma l'operazione
6. ✅ I 1000 record verranno eliminati

### Opzione 2: Dalla Sezione Upload
1. Vai su **https://dashboard-effe.vercel.app**
2. Click sulla **Sidebar** → **"Carica Dati"**
3. Scorri fino alla card **"Gestione Dati di Vendita"**
4. Click sul pulsante **"Cancella Tutto"**
5. Conferma l'eliminazione

### Opzione 3: Fix dei Dati (Se vuoi correggerli invece di eliminarli)
1. Vai su **https://dashboard-effe.vercel.app**
2. Click sulla **Sidebar** → **"Diagnostica Vendite"**
3. La diagnostica ti mostrerà i 1000 record problematici
4. Seleziona il canale corretto dal dropdown
5. Click su **"Correggi Tutti"**

## 🔍 Verifica Pulizia
Dopo aver eseguito la pulizia:
1. Vai su **"Stato Dati"** nella sidebar
2. Verifica che mostri **"Nessun dato"** invece dei warning
3. La **"Panoramica"** dovrebbe mostrare lo stato vuoto corretto

## 📝 Note Tecniche
Il problema è che le Edge Functions di Supabase non sono state aggiornate automaticamente.
Le correzioni al codice sono state fatte ma richiedono un redeploy manuale delle Edge Functions
usando Supabase CLI, che al momento non è configurato.

L'interfaccia web usa le API esistenti che FUNZIONANO correttamente per la cancellazione tramite l'app React.

