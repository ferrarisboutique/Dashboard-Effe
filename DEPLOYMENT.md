# Guida al Deployment

Questa guida spiega come deployare l'applicazione Fashion Performance Dashboard su Vercel e configurare Supabase.

## Prerequisiti

1. Account Vercel (https://vercel.com)
2. Account Supabase (https://supabase.com)
3. Supabase CLI installato (opzionale, per il deploy delle Edge Functions)

## 1. Setup Supabase

### 1.1 Creare/Verificare il Database

La tabella `kv_store_49468be0` dovrebbe già esistere. Se non esiste, crearla con:

```sql
CREATE TABLE kv_store_49468be0 (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL
);

-- Crea indice per performance
CREATE INDEX idx_kv_store_key_prefix ON kv_store_49468be0 (key text_pattern_ops);
```

### 1.2 Deploy Edge Functions

#### Opzione A: Deploy manuale con Supabase CLI

```bash
# Installa Supabase CLI se non l'hai già fatto
npm install -g supabase

# Login a Supabase
supabase login

# Link il progetto
supabase link --project-ref sbtkymupbjyikfwjeumk

# Deploy della Edge Function
supabase functions deploy make-server-49468be0
```

#### Opzione B: Deploy via Dashboard

1. Vai su https://supabase.com/dashboard/project/sbtkymupbjyikfwjeumk/functions
2. Crea una nuova funzione chiamata `make-server-49468be0`
3. Copia il contenuto dei file da `supabase/functions/make-server-49468be0/`
4. Deploy

### 1.3 Configurare le Variabili d'Ambiente

Nel dashboard Supabase (Settings > API):
- `SUPABASE_URL`: https://sbtkymupbjyikfwjeumk.supabase.co
- `SUPABASE_SERVICE_ROLE_KEY`: (trovalo in Settings > API > Service Role Key)
- `SUPABASE_ANON_KEY`: (trovalo in Settings > API > anon public)

## 2. Deploy su Vercel

### 2.1 Collegare il Repository

1. Vai su https://vercel.com/new
2. Importa il repository GitHub
3. Configura il progetto:
   - **Framework Preset**: Vite
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`

### 2.2 Configurare le Environment Variables

Nel dashboard Vercel (Settings > Environment Variables), aggiungi:

```
VITE_SUPABASE_URL=https://sbtkymupbjyikfwjeumk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNidGt5bXVwYmp5aWtmd2pldW1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDA0MTUsImV4cCI6MjA3NDQ3NjQxNX0.ONl5r0x89QJKQtP9jttBkvESpV6lDpc1ijydxtP7nzo
VITE_SUPABASE_PROJECT_ID=sbtkymupbjyikfwjeumk
NODE_ENV=production
```

**IMPORTANTE**: Assicurati che queste variabili siano impostate per tutti gli ambienti (Production, Preview, Development)

### 2.3 Deploy

1. Click su **Deploy**
2. Attendi il completamento del build
3. Verifica che il sito sia online

## 3. Configurazione Post-Deploy

### 3.1 Verificare CORS

Assicurati che il dominio Vercel sia autorizzato nelle configurazioni CORS di Supabase:

1. Vai su Supabase Dashboard > Authentication > URL Configuration
2. Aggiungi il dominio Vercel (es: `https://your-app.vercel.app`) a "Site URL"
3. Aggiungi lo stesso dominio anche in "Redirect URLs"

### 3.2 Test della Dashboard

1. Visita il sito su Vercel
2. Prova a caricare dati di vendita e inventario
3. Verifica che i dati vengano salvati correttamente

## 4. Deploy Continuo

Ogni push al branch `main` su GitHub triggererà automaticamente un nuovo deploy su Vercel.

Per fare deploy di branch specifici:
- Push su qualsiasi branch creerà un Preview Deployment
- Solo i push al branch di produzione (`main`) creeranno un Production Deployment

## 5. Troubleshooting

### Build Errors

Se il build fallisce:
1. Verifica che tutte le dipendenze siano installate: `npm install`
2. Esegui `npm run build` localmente per vedere gli errori
3. Controlla i log di build su Vercel

### Edge Functions non funzionano

1. Verifica che la Edge Function sia deployata su Supabase
2. Controlla i log delle funzioni nel Supabase Dashboard
3. Verifica che le variabili d'ambiente siano configurate correttamente

### CORS Errors

1. Aggiungi il dominio Vercel alle configurazioni CORS di Supabase
2. Verifica che le Edge Functions abbiano CORS configurato correttamente

### Database Timeout

Se ottieni timeout:
1. Verifica la connessione al database Supabase
2. Controlla i limiti di rate nella dashboard Supabase
3. Considera di aumentare i timeout nelle chiamate API

## 6. Monitoraggio

### Vercel Analytics

Vercel fornisce analytics di default. Per vederle:
- Vai su Vercel Dashboard > Analytics

### Supabase Logs

Per vedere i log delle Edge Functions:
- Vai su Supabase Dashboard > Functions > make-server-49468be0 > Logs

### Error Tracking (Opzionale)

Per aggiungere Sentry:
1. Crea un progetto su https://sentry.io
2. Aggiungi `VITE_SENTRY_DSN` alle environment variables di Vercel
3. Redeploy l'applicazione

## 7. Comandi Utili

```bash
# Build locale
npm run build

# Test locale
npm run dev

# Lint
npm run lint

# Test
npm test

# Deploy Edge Function (con Supabase CLI)
supabase functions deploy make-server-49468be0

# Rollback Edge Function (con Supabase CLI)
supabase functions delete make-server-49468be0 --version <version>
```

## 8. Best Practices

1. **Environment Variables**: Mai committare file `.env` con credenziali reali
2. **Testing**: Testa sempre in un ambiente di preview prima del deploy in produzione
3. **Backups**: Considera di fare backup regolari del database Supabase
4. **Monitoring**: Configura alerting per errori critici
5. **Performance**: Monitora i tempi di risposta delle Edge Functions

## Supporto

Per problemi o domande:
- Vercel: https://vercel.com/docs
- Supabase: https://supabase.com/docs
- Repository Issues: [Link al tuo repository]
