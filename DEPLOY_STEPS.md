# Guida Rapida al Deploy - Dashboard-Effe

## ✅ Pre-requisiti Completati

- ✅ Tutti i bug critici risolti
- ✅ TypeScript compila senza errori
- ✅ Build production funzionante
- ✅ Dipendenze installate
- ✅ Codice pushato su GitHub

---

## 🚀 Deploy Frontend su Vercel

### Passo 1: Connetti Repository
1. Vai su https://vercel.com/dashboard
2. Click su "Add New Project"
3. Importa repository: `ferrarisboutique/Dashboard-Effe`
4. Autorizza Vercel ad accedere al repository

### Passo 2: Configura Build Settings
Vercel dovrebbe auto-detectare le impostazioni da `vercel.json`, ma verifica:

```
Framework Preset: Vite
Build Command: npm run build
Output Directory: build
Install Command: npm ci --include=dev
```

### Passo 3: Aggiungi Environment Variables
**IMPORTANTE**: Nel dashboard Vercel, vai su Settings > Environment Variables e aggiungi:

```env
VITE_SUPABASE_URL=https://jmurucsmsdkmstjsamvd.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptdXJ1Y3Ntc2RrbXN0anNhbXZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzODY5NzksImV4cCI6MjA3Njk2Mjk3OX0.9MYIw-LxtWdQDda31ZWlgwACZzhoY0AmaaE79AMERts
VITE_SUPABASE_PROJECT_ID=jmurucsmsdkmstjsamvd
```

**Opzionale** (per error tracking):
```env
VITE_SENTRY_DSN=your-sentry-dsn-here
```

### Passo 4: Deploy
1. Click su "Deploy"
2. Attendi 2-3 minuti per il build
3. Verifica che non ci siano errori nel log

### Passo 5: Verifica Deploy
Una volta completato:
1. Apri l'URL assegnato da Vercel (es. `dashboard-effe.vercel.app`)
2. Verifica che la pagina si carichi
3. Apri DevTools (F12) e controlla la console
4. Prova a navigare tra le sezioni

---

## 🔧 Deploy Backend (Supabase Edge Functions)

### Prerequisito: Supabase CLI
Installa se non l'hai già:
```bash
npm install -g supabase
```

### Passo 1: Login a Supabase
```bash
supabase login
```

### Passo 2: Link al Progetto
```bash
cd Dashboard-Effe
supabase link --project-ref jmurucsmsdkmstjsamvd
```

### Passo 3: Configura Environment Variables
Nel dashboard Supabase (https://supabase.com/dashboard):
1. Vai al progetto `jmurucsmsdkmstjsamvd`
2. Settings > Edge Functions > Environment Variables
3. Aggiungi:

```env
SUPABASE_URL=https://jmurucsmsdkmstjsamvd.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptdXJ1Y3Ntc2RrbXN0anNhbXZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTM4Njk3OSwiZXhwIjoyMDc2OTYyOTc5fQ.XgqAec1IZrQzMb-tWqvpsT9N8PF3_VT9YDykQXCRSEE
```

### Passo 4: Deploy Edge Function
```bash
supabase functions deploy make-server-49468be0
```

### Passo 5: Verifica Deploy
```bash
# Test health check
curl https://jmurucsmsdkmstjsamvd.supabase.co/functions/v1/make-server-49468be0/health
```

Dovresti vedere:
```json
{"status":"ok","timestamp":"2025-10-27T..."}
```

---

## 🧪 Test Post-Deploy

### Frontend (Vercel)
1. ✅ Home page carica
2. ✅ Sidebar navigation funziona
3. ✅ Console non mostra errori CORS
4. ✅ Puoi navigare tra "Overview", "Negozi", "Online", "Inventario"

### Backend (Supabase)
Testa gli endpoint:

```bash
# Health check
curl https://jmurucsmsdkmstjsamvd.supabase.co/functions/v1/make-server-49468be0/health

# Get sales
curl -H "Authorization: Bearer eyJhbGc..." \
     https://jmurucsmsdkmstjsamvd.supabase.co/functions/v1/make-server-49468be0/sales

# Get inventory
curl -H "Authorization: Bearer eyJhbGc..." \
     https://jmurucsmsdkmstjsamvd.supabase.co/functions/v1/make-server-49468be0/inventory
```

### Test Upload
1. Vai su "Carica Vendite"
2. Carica un file Excel/CSV di test
3. Verifica che:
   - ✅ Progress bar si muove
   - ✅ Toast di successo appare
   - ✅ Dati appaiono in "Overview"

---

## 🐛 Troubleshooting

### Build Fallisce su Vercel
**Problema**: "Module not found" o errori TypeScript

**Soluzione**:
```bash
# Verifica localmente
npm ci
npm run build
# Se funziona localmente, pusha package-lock.json aggiornato
git add package-lock.json
git commit -m "Update package-lock"
git push
```

### CORS Errors
**Problema**: Console mostra errori "CORS blocked"

**Causa**: Edge function non risponde correttamente

**Soluzione**:
1. Verifica che l'edge function sia deployata: `supabase functions list`
2. Controlla i log: Dashboard Supabase > Edge Functions > Logs
3. Verifica environment variables nel dashboard Supabase

### Environment Variables Non Caricate
**Problema**: App mostra "Missing environment variable"

**Soluzione Vercel**:
1. Settings > Environment Variables
2. Verifica che TUTTE le variabili siano presenti
3. Click "Redeploy" per applicare

**Soluzione Supabase**:
1. Dashboard > Settings > Edge Functions > Environment Variables
2. Aggiungi variabili mancanti
3. Rideploy: `supabase functions deploy make-server-49468be0`

### Upload Non Funziona
**Problema**: Upload fallisce con errore 500

**Causa**: Probabile problema con service_role_key

**Soluzione**:
1. Verifica che `SUPABASE_SERVICE_ROLE_KEY` sia configurata in Supabase
2. Controlla i log dell'edge function nel dashboard Supabase
3. Verifica che la tabella `kv_store_49468be0` esista nel database

---

## 📊 Verifica Database

### Controlla Tabella KV Store
Nel dashboard Supabase > SQL Editor:

```sql
-- Verifica che la tabella esista
SELECT * FROM kv_store_49468be0 LIMIT 10;

-- Conta le vendite
SELECT COUNT(*) FROM kv_store_49468be0 WHERE key LIKE 'sale_%';

-- Conta l'inventario
SELECT COUNT(*) FROM kv_store_49468be0 WHERE key LIKE 'inventory_%';
```

### Crea Tabella se Mancante
Se la tabella non esiste:

```sql
CREATE TABLE IF NOT EXISTS kv_store_49468be0 (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index per performance
CREATE INDEX idx_kv_store_key_pattern ON kv_store_49468be0 (key text_pattern_ops);
```

---

## 🔒 Sicurezza Post-Deploy

### ✅ Checklist Sicurezza

- [x] ✅ Credenziali rimosse dal codice sorgente
- [x] ✅ Environment variables configurate correttamente
- [ ] 🔄 Cambia Supabase anon key (quella vecchia hardcoded era esposta)
- [ ] 🔄 Aggiungi Row Level Security (RLS) alle tabelle
- [ ] 🔄 Limita CORS solo al dominio Vercel

### Come Rotare le Chiavi (CONSIGLIATO)
1. Dashboard Supabase > Settings > API
2. "Regenerate anon key"
3. Aggiorna la chiave in:
   - Vercel Environment Variables
   - `.env.local` locale
4. Redeploy frontend

---

## 📈 Monitoring

### Vercel Analytics
Abilita nel dashboard:
- Settings > Analytics > Enable
- Monitora performance e errori

### Supabase Logs
Controlla regolarmente:
- Dashboard > Edge Functions > Logs
- Dashboard > Database > Query Performance
- Dashboard > Storage > Usage

### Sentry (Opzionale)
Se hai configurato Sentry:
1. Crea progetto su sentry.io
2. Copia DSN
3. Aggiungi `VITE_SENTRY_DSN` su Vercel
4. Redeploy

---

## 🎉 Deploy Completato!

Una volta completati tutti i passi:

✅ Frontend su Vercel: `https://dashboard-effe.vercel.app` (o tuo dominio)
✅ Backend su Supabase: `https://jmurucsmsdkmstjsamvd.supabase.co/functions/v1/make-server-49468be0`
✅ Database configurato e funzionante

**Prossimi passi**:
1. Testa tutte le funzionalità
2. Carica dati reali
3. Configura backup automatici in Supabase
4. Aggiungi dominio custom (opzionale)

---

## 📞 Support

**Documentazione**:
- Frontend: `README.md`, `CLAUDE.md`
- Backend: `DEPLOY_MANUALE_SUPABASE.md`
- Problemi risolti: `FIXES_SUMMARY.md`

**Link Utili**:
- Vercel Dashboard: https://vercel.com/dashboard
- Supabase Dashboard: https://supabase.com/dashboard/project/jmurucsmsdkmstjsamvd
- Repository: https://github.com/ferrarisboutique/Dashboard-Effe

**In caso di problemi**:
1. Controlla i log di Vercel
2. Controlla i log di Supabase Edge Functions
3. Apri DevTools (F12) e controlla Console/Network
4. Verifica environment variables
