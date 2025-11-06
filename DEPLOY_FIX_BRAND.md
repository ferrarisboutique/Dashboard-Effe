# 🚀 Deploy Fix Brand Attribuzione - Istruzioni

## ⚠️ IMPORTANTE: Deploy Manuale Necessario

L'edge function deve essere aggiornata manualmente nel dashboard Supabase perché non abbiamo accesso diretto via CLI.

## 📋 Step 1: Deploy Edge Function

1. **Vai al Dashboard Supabase**:
   ```
   https://supabase.com/dashboard/project/sbtkymupbjyikfwjeumk/functions
   ```

2. **Apri la funzione**:
   - Cerca `make-server-49468be0`
   - Clicca sulla funzione

3. **Aggiorna il file `sales.ts`**:
   - Vai alla tab "Code"
   - Trova il file `sales.ts`
   - **Sostituisci tutto il contenuto** con il contenuto del file locale:
     ```
     supabase/functions/make-server-49468be0/sales.ts
     ```
   - **Salva** (Ctrl+S / Cmd+S)

4. **Deploy**:
   - Clicca il pulsante "Deploy" o "Save & Deploy"
   - Attendi il completamento (30-60 secondi)

## 📋 Step 2: Aggiornare Vendite Esistenti

Dopo il deploy, esegui questo comando per aggiornare tutte le vendite esistenti:

```bash
curl -X POST \
  'https://sbtkymupbjyikfwjeumk.supabase.co/functions/v1/make-server-49468be0/sales/update-brands-from-inventory' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNidGt5bXVwYmp5aWtmd2pldW1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDA0MTUsImV4cCI6MjA3NDQ3NjQxNX0.ONl5r0x89QJKQtP9jttBkvESpV6lDpc1ijydxtP7nzo' \
  -H 'Content-Type: application/json'
```

**Risposta attesa**:
```json
{
  "success": true,
  "message": "X vendite aggiornate con brand dall'inventario",
  "updatedCount": X
}
```

## ✅ Verifica

Dopo l'aggiornamento, verifica:

1. **Controlla le statistiche**: Le statistiche per brand dovrebbero essere corrette
2. **Carica nuove vendite**: Dovrebbero avere il brand corretto automaticamente
3. **Messaggio upload**: Dovrebbe mostrare "X brand attribuiti dall'inventario"

## 🔍 Troubleshooting

Se l'endpoint non funziona:
- Verifica che il deploy sia completato
- Controlla i log della funzione su Supabase Dashboard
- Verifica che l'inventario contenga i prodotti con brand



