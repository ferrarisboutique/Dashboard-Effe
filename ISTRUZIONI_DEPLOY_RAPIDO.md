# ⚡ ISTRUZIONI DEPLOY RAPIDO - Fix Brand

## 🎯 Obiettivo
Deployare l'edge function aggiornata che attribuisce automaticamente il brand dall'inventario alle vendite.

## 📋 STEP 1: Deploy Edge Function (MANUALE - 2 minuti)

### Opzione A: Via Dashboard Supabase (CONSIGLIATO)

1. **Apri questo link**:
   ```
   https://supabase.com/dashboard/project/sbtkymupbjyikfwjeumk/functions/make-server-49468be0
   ```

2. **Vai alla tab "Code"**

3. **Trova il file `sales.ts`** nella lista dei file

4. **Clicca su `sales.ts`** per aprirlo

5. **Seleziona tutto** (Ctrl+A / Cmd+A) e **elimina**

6. **Apri il file locale**:
   ```
   supabase/functions/make-server-49468be0/sales.ts
   ```
   Oppure:
   ```
   SALES_TS_FOR_DEPLOY.txt
   ```

7. **Copia tutto il contenuto** (Ctrl+A, Ctrl+C)

8. **Incolla nel dashboard** (Ctrl+V)

9. **Salva** (Ctrl+S / Cmd+S) o clicca "Save"

10. **Deploy**: Clicca il pulsante "Deploy" o "Save & Deploy"

11. **Attendi**: 30-60 secondi per il completamento

### Opzione B: Via CLI (se disponibile)

```bash
cd "/Users/ferrarisboutique/Documents/GitHub/Performance Dashboard App/Dashboard-Effe"
supabase functions deploy make-server-49468be0 --project-ref sbtkymupbjyikfwjeumk
```

## 📋 STEP 2: Aggiornare Vendite Esistenti

**DOPO** il deploy completato, esegui:

```bash
cd "/Users/ferrarisboutique/Documents/GitHub/Performance Dashboard App/Dashboard-Effe"
./aggiorna-vendite-esistenti.sh
```

Oppure manualmente:

```bash
curl -X POST \
  'https://sbtkymupbjyikfwjeumk.supabase.co/functions/v1/make-server-49468be0/sales/update-brands-from-inventory' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNidGt5bXVwYmp5aWtmd2pldW1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDA0MTUsImV4cCI6MjA3NDQ3NjQxNX0.ONl5r0x89QJKQtP9jttBkvESpV6lDpc1ijydxtP7nzo'
```

## ✅ Verifica

Dopo entrambi gli step:

1. **Controlla le statistiche**: Le statistiche per brand dovrebbero essere corrette
2. **Nuove vendite**: Dovrebbero avere brand automatico durante l'upload
3. **Messaggio upload**: Dovrebbe mostrare "X brand attribuiti dall'inventario"

## 📊 Stato Attuale

- **Vendite totali**: ~5822
- **File sales.ts**: Pronto per deploy (17KB, 520 righe)
- **Endpoint aggiornamento**: `/sales/update-brands-from-inventory`

## ⚠️ Note

- Il deploy deve essere fatto manualmente perché non abbiamo accesso diretto a Supabase CLI
- L'endpoint di aggiornamento funzionerà solo DOPO il deploy
- Le vendite future avranno automaticamente il brand corretto





