# 🚀 DEPLOY IMMEDIATO - Fix Brand Attribuzione

## ⚡ Azione Richiesta: Deploy Edge Function

**IMPORTANTE**: Prima di aggiornare le vendite esistenti, devi deployare l'edge function aggiornata.

### Passi per Deploy:

1. **Apri Supabase Dashboard**:
   ```
   https://supabase.com/dashboard/project/sbtkymupbjyikfwjeumk/functions/make-server-49468be0
   ```

2. **Copia il contenuto del file `sales.ts`**:
   - Il file completo è in: `supabase/functions/make-server-49468be0/sales.ts`
   - Contiene tutte le modifiche per il fix brand

3. **Incolla nel dashboard**:
   - Tab "Code" → File `sales.ts`
   - Sostituisci tutto il contenuto
   - Salva e Deploy

4. **Attendi il completamento** (30-60 secondi)

### Dopo il Deploy:

Esegui questo comando per aggiornare le vendite esistenti:

```bash
curl -X POST \
  'https://sbtkymupbjyikfwjeumk.supabase.co/functions/v1/make-server-49468be0/sales/update-brands-from-inventory' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNidGt5bXVwYmp5aWtmd2pldW1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDA0MTUsImV4cCI6MjA3NDQ3NjQxNX0.ONl5r0x89QJKQtP9jttBkvESpV6lDpc1ijydxtP7nzo'
```

**Oppure usa lo script automatico**:
```bash
./deploy-fix-brand.sh
```

## 📊 Statistiche Attuali

- **Vendite totali**: ~5822
- **Vendite con brand Unknown**: Da verificare dopo deploy
- **Brand disponibili in inventario**: Vari

## ✅ Risultato Atteso

Dopo il deploy e l'aggiornamento:
- ✅ Tutte le vendite con SKU nell'inventario avranno il brand corretto
- ✅ Le statistiche per brand saranno accurate
- ✅ Nuove vendite avranno brand automatico dall'inventario



