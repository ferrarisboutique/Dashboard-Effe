# PROBLEMI IDENTIFICATI E SOLUZIONI

## Problemi Trovati (Test Browser)

1. **Le vendite ecommerce non compaiono**: 7028 vendite nel database ma 0 ecommerce/marketplace
   - Motivo: Il backend con le correzioni NON è deployato
   - Console log: "Ecommerce sales: 0", "Marketplace sales: 0"

2. **Errore "Errore nel caricamento statistiche"**:
   - L'endpoint `/sales/stats` non esiste nel backend attuale
   - Il nuovo codice è solo su GitHub, non deployato

3. **Tasto "Cerca Duplicati" non funziona**:
   - L'endpoint `/sales/duplicates` non esiste nel backend attuale

## Root Cause

Il backend NON è stato deployato su Supabase. Le modifiche sono solo su GitHub.

## Soluzione Urgente

### 1. Deploy Backend Manuale

**Metodo 1: Dashboard Supabase (RACCOMANDATO)**
1. Vai su: https://supabase.com/dashboard/project/sbtkymupbjyikfwjeumk/functions
2. Clicca sulla funzione "make-server-49468be0"
3. Clicca su "Edit Function"
4. Apri il file "sales.ts" 
5. Sostituisci TUTTO il contenuto con il file aggiornato da:
   `Dashboard-Effe/supabase/functions/make-server-49468be0/sales.ts`
6. Clicca "Deploy"

**Metodo 2: Supabase CLI** (se funziona sul tuo Mac)
```bash
cd Dashboard-Effe
npx supabase login
npx supabase link --project-ref sbtkymupbjyikfwjeumk
npx supabase functions deploy make-server-49468be0 --no-verify-jwt
```

### 2. Dopo il Deploy

1. Ricaricare l'app
2. Verificare che compaiano le statistiche in "Impostazioni"
3. Le vendite ecommerce dovrebbero comparire automaticamente (il backend le identifica tramite documento/numero)

## Perché i Dati Non Compaiono

Il backend attuale NON ha questa logica (righe 173-182 in sales.ts):

```typescript
// For ecommerce sales (identified by documento/numero), ensure channel is set
let channel = value.channel;
// Fix: Handle null, empty string, or 'unknown' channel for ecommerce sales
if (value.documento && value.numero) {
  if (!channel || channel === 'unknown' || channel === '' || channel === null) {
    channel = 'ecommerce';
  }
}
```

Questa logica identifica automaticamente le vendite ecommerce e le mostra nella sezione Online.

## Note

- I duplicati (237k vs 40k) possono essere rimossi DOPO il deploy usando il tasto "Cerca Duplicati" → "Rimuovi Duplicati"
- Il deploy del frontend su Vercel è automatico e già fatto
- Il problema è SOLO il backend che va deployato manualmente




