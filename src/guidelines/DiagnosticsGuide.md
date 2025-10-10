# Guida alla Diagnostica Dati Vendite

## Panoramica
Lo strumento di Diagnostica Vendite è stato creato per identificare e risolvere problemi comuni nei dati di vendita, in particolare le vendite che non sono state correttamente attribuite a un canale di vendita.

## Problema: Vendite Non Attribuite
Quando carichi dati di vendita, può capitare che alcuni record non vengano associati correttamente a uno dei quattro canali validi:
- `negozio_donna`
- `negozio_uomo`
- `ecommerce`
- `marketplace`

Questo può accadere per vari motivi:
- Errori nel mapping utente → canale durante l'upload
- Dati mancanti o mal formattati nel file CSV/XLSX
- Problemi nel processo di conversione dei dati

## Come Utilizzare lo Strumento

### 1. Accedere alla Diagnostica
- Naviga alla sezione **"Diagnostica Vendite"** dalla sidebar
- Lo strumento eseguirà automaticamente un'analisi completa dei tuoi dati

### 2. Interpretare i Risultati

#### Card di Riepilogo
- **Totale Record**: Numero totale di vendite nel database
- **Record Validi**: Vendite con canale correttamente attribuito
- **Record Problematici**: Vendite senza canale valido
- **Stato Salute**: Valutazione generale della qualità dei dati

#### Distribuzione Canali
Mostra quante vendite sono associate a ciascun canale. I canali validi sono evidenziati in verde ✅, mentre i canali problematici (NULL, UNDEFINED, o valori non validi) sono evidenziati in rosso ❌.

#### Dettaglio Problemi
Se vengono trovati problemi, vedrai:
- **Canale NULL**: Vendite con campo canale esplicitamente nullo
- **Canale UNDEFINED**: Vendite senza campo canale definito
- **Canale Non Valido**: Vendite con valori di canale non riconosciuti

### 3. Correggere i Dati

#### Analisi Manuale
Prima di correggere, esamina i "Sample Records" per capire il pattern:
- Controlla il campo `user` nei record problematici
- Usa il mapping standard:
  - `carla` → Negozio Donna
  - `alexander` → Negozio Uomo
  - `paolo` → Negozio Uomo

#### Correzione Automatica
1. I record problematici sono pre-selezionati automaticamente
2. Scegli il canale corretto dal menu a tendina
3. Clicca su **"Correggi X Record"**
4. Conferma l'operazione

⚠️ **Attenzione**: Questa operazione modifica permanentemente i dati nel database. Assicurati di aver selezionato il canale corretto prima di procedere.

#### Esportazione Dati
Se hai bisogno di analizzare i dati problematici esternamente:
1. Clicca sul pulsante **"Esporta"**
2. Verrà scaricato un file JSON con tutti i record problematici
3. Puoi aprirlo con un editor di testo o Excel per un'analisi più approfondita

### 4. Verifica Post-Correzione
Dopo aver corretto i dati:
1. La diagnostica si aggiornerà automaticamente
2. Torna alla sezione **"Panoramica"** per verificare che i dati siano ora visualizzati correttamente
3. Controlla le sezioni **"Negozi"** e **"Online"** per assicurarti che le vendite siano distribuite correttamente

## Indicatori di Problemi

### Nella Dashboard Principale
Se ci sono problemi con i dati, vedrai:
- Un **alert rosso** nella sezione Panoramica con un pulsante "Correggi Ora"
- Un **badge "!"** sulla voce "Stato Dati" nella sidebar
- Un **badge di avviso** sulla voce "Diagnostica Vendite"

### Nella Sezione Stato Dati
- Il conteggio delle vendite per canale mostrerà eventuali discrepanze
- Un pulsante **"Apri Diagnostica Avanzata"** apparirà se vengono rilevati problemi

## Best Practices

1. **Esegui la diagnostica regolarmente**: Dopo ogni upload di dati, controlla lo stato di salute
2. **Correggi subito i problemi**: I dati problematici non vengono visualizzati correttamente nelle dashboard
3. **Verifica il mapping utenti**: Assicurati che il file di upload contenga i nomi utente corretti
4. **Mantieni i dati puliti**: Prima di caricare un nuovo file, verifica che:
   - La colonna "Utente" contenga solo valori mappati (carla, alexander, paolo)
   - La colonna "Data" sia nel formato corretto (dd/mm/aa o dd/mm/aaaa)
   - Tutte le colonne richieste siano presenti

## Troubleshooting

### "Nessun record trovato"
- Verifica di aver caricato i dati di vendita
- Vai alla sezione "Carica Dati" per uploadare un file

### "Tutti i record sono problematici"
- Possibile problema nel file di upload originale
- Controlla che il mapping utente → canale sia configurato correttamente
- Verifica che i nomi utente nel CSV corrispondano al mapping

### "L'operazione di correzione ha fallito"
- Riprova dopo qualche secondo
- Controlla la console del browser per errori
- Assicurati di essere connesso a Internet

## Supporto Tecnico

Per problemi persistenti:
1. Esporta i dati problematici
2. Verifica i log nella console del browser (F12)
3. Controlla la sezione "Stato Dati" per diagnostica dettagliata
4. Se necessario, ri-carica i dati originali dopo averli corretti manualmente

## Funzionalità Future

In sviluppo:
- Correzione batch intelligente basata su pattern automatici
- Suggerimenti automatici di canale basati su analisi del contenuto
- Storia delle correzioni con possibilità di rollback
- Integrazione con Shopify per import automatico con mapping corretto
