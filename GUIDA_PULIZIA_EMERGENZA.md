# 🆘 Guida Pulizia Database di Emergenza

## Come Usare il Nuovo Strumento

### 1. Accedi alla Dashboard
Vai su: **https://dashboard-effe.vercel.app**

### 2. Apri la Pulizia di Emergenza
Nella **sidebar** clicca su:
```
🆘 Pulizia Emergenza
```

### 3. Controlla lo Stato del Database
- Click sul pulsante **"Aggiorna"**
- Vedrai:
  - **Vendite**: Quante vendite ci sono nel database
  - **Inventario**: Quanti prodotti ci sono nell'inventario

### 4. Cancella Tutte le Vendite
Se vedi le **1000 vendite**:

1. Click su **"Cancella Tutte le Vendite (1000)"**
2. Conferma l'operazione (ricorda: è IRREVERSIBILE!)
3. Vedrai una **progress bar** che mostra:
   - Cancellate: X/1000
   - Progresso: XX%
4. Attendi il completamento (può richiedere 2-3 minuti per 1000 vendite)
5. Vedrai un messaggio di successo: **"✅ 1000 vendite cancellate con successo!"**

### 5. Verifica la Pulizia
- Click di nuovo su **"Aggiorna"**
- Le vendite dovrebbero essere **0**
- Vai su **"Panoramica"** nella sidebar
- NON dovrebbero più esserci warning o dati UNDEFINED

### 6. Carica Nuovi Dati Corretti
1. Vai su **"Carica Inventario"** nella sidebar
2. Carica il tuo file inventario (migliaia di righe OK!)
3. Poi vai su **"Carica Dati"**
4. Carica i tuoi dati di vendita corretti

## ⚠️ Avvertenze Importanti

### Cancellazione Irreversibile
- Una volta cancellati, i dati NON possono essere recuperati
- Assicurati di avere backup se necessario

### Tempo di Completamento
- **100 vendite**: ~15 secondi
- **1000 vendite**: ~2-3 minuti
- **10000 vendite**: ~20-30 minuti

### Cosa Succede Durante la Cancellazione
Il sistema:
1. Recupera tutte le vendite dal database
2. Le cancella in lotti di 10 per volta
3. Mostra progresso in tempo reale
4. Aggiorna automaticamente la dashboard

## 🔧 Dettagli Tecnici

### Come Funziona
- Usa **batch delete** con chiamate API dirette
- Elabora **10 vendite alla volta** per performance ottimali
- Piccola pausa tra batch per non sovraccaricare il server
- Gestione errori con contatore fallimenti

### Differenza dal Metodo Normale
- **Metodo Normale** (`/sales/all`): Cancella tutto in un colpo (ma non funziona per bug Edge Functions)
- **Pulizia Emergenza**: Cancella record uno per uno in batch (SEMPRE funziona)

## 📊 Monitoraggio

### Progress Bar Mostra:
- **Progresso**: X/1000 (quante cancellate)
- **Percentuale**: XX%
- **Successi**: Vendite cancellate correttamente
- **Falliti**: Eventuali errori (dovrebbero essere 0)

### Dopo il Completamento
- Messaggio verde di successo
- Ricarica automatica stato database
- Dashboard aggiornata automaticamente

## 🐛 Troubleshooting

### "Le vendite sono ancora presenti"
1. Ricarica la pagina (CTRL/CMD + R)
2. Click su "Aggiorna" nello strumento
3. Se ancora presenti, riprova la cancellazione

### "Operazione troppo lenta"
- Normale per grandi quantità di dati
- NON chiudere la finestra
- Lascia completare l'operazione

### "Alcune vendite fallite"
- Se poche (< 5): Normale, riprova
- Se molte: Problema di connessione, controlla internet

## ✅ Checklist Pulizia Completa

- [ ] Apri dashboard
- [ ] Vai su "🆘 Pulizia Emergenza"
- [ ] Click "Aggiorna" per vedere stato
- [ ] Conferma quante vendite ci sono
- [ ] Click "Cancella Tutte le Vendite"
- [ ] Conferma operazione
- [ ] Attendi completamento (guarda progress bar)
- [ ] Verifica messaggio successo
- [ ] Click "Aggiorna" per confermare database vuoto
- [ ] Vai su "Panoramica" - NO warning
- [ ] Vai su "Stato Dati" - Mostra database vuoto
- [ ] Pronto per caricare nuovi dati!

## 🚀 Prossimi Passi Dopo Pulizia

1. **Carica Inventario**
   - Sidebar → "Carica Inventario"
   - Seleziona file con migliaia di righe
   - OK anche file grandi!

2. **Carica Vendite Corrette**
   - Sidebar → "Carica Dati"
   - File con colonne corrette
   - Verifica mapping canali

3. **Verifica Dashboard**
   - Vai su "Panoramica"
   - Controlla metriche
   - NO warning UNDEFINED

---

**Nota**: Questo strumento è stato creato per risolvere problemi quando il metodo normale non funziona. 
Usa sempre prima i metodi standard nella sezione "Carica Dati".

