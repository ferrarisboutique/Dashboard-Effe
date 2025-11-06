# 🚀 Guida Completa al Deploy - Aggiornamenti Applicati

Data: $(date)

## 📋 Riepilogo Modifiche

Le seguenti correzioni sono state applicate al codice e richiedono un nuovo deploy:

### ✅ Correzioni Applicate

1. **Sicurezza**: Gestione migliorata delle variabili d'ambiente
2. **Edge Functions**: Path routing corretti
3. **Error Handling**: Migliorata gestione errori
4. **Performance**: Rimossi console.log da produzione
5. **Vercel Config**: Headers di sicurezza e cache aggiunti

---

## 🔧 STEP 1: Deploy Edge Functions su Supabase

### File Modificati che Richiedono Deploy:
- `supabase/functions/make-server-49468be0/index.ts`

### Modifiche Principali:
- Health check endpoint: `/health` (prima: `/make-server-49468be0/health`)
- Route mounting: `/` (prima: `/make-server-49468be0`)

### Opzione A: Deploy via Dashboard (Più Semplice)

1. **Vai al Dashboard Supabase**:
   ```
   https://supabase.com/dashboard/project/sbtkymupbjyikfwjeumk/functions
   ```

2. **Apri la funzione esistente**:
   - Cerca `make-server-49468be0`
   - Clicca sulla funzione

3. **Aggiorna il codice**:
   - Vai alla tab "Code"
   - Apri il file `index.ts`
   - Sostituisci tutto il contenuto con il contenuto di:
     ```
     supabase/functions/make-server-49468be0/index.ts
     ```
   - **Salva** (Ctrl+S / Cmd+S)

4. **Deploy**:
   - Clicca il pulsante "Deploy" o "Save & Deploy"
   - Attendi il completamento (30-60 secondi)

5. **Verifica**:
   ```bash
   curl 'https://sbtkymupbjyikfwjeumk.supabase.co/functions/v1/make-server-49468be0/health' \
     -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNidGt5bXVwYmp5aWtmd2pldW1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDA0MTUsImV4cCI6MjA3NDQ3NjQxNX0.ONl5r0x89QJKQtP9jttBkvESpV6lDpc1ijydxtP7nzo'
   ```
   
   Risposta attesa:
   ```json
   {"status":"ok","timestamp":"...","message":"Server and database are healthy"}
   ```

### Opzione B: Deploy via CLI

```bash
# 1. Installa Supabase CLI (se non già installato)
brew install supabase/tap/supabase

# 2. Login
supabase login

# 3. Link progetto
cd "/Users/ferrarisboutique/Documents/GitHub/Performance Dashboard App/Dashboard-Effe"
supabase link --project-ref sbtkymupbjyikfwjeumk

# 4. Deploy funzione
supabase functions deploy make-server-49468be0 --project-ref sbtkymupbjyikfwjeumk
```

---

## 🌐 STEP 2: Verifica Configurazione Vercel

### Variabili d'Ambiente Richieste

Verifica che su Vercel siano configurate queste variabili per **tutti gli ambienti** (Production, Preview, Development):

```
VITE_SUPABASE_URL=https://sbtkymupbjyikfwjeumk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNidGt5bXVwYmp5aWtmd2pldW1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDA0MTUsImV4cCI6MjA3NDQ3NjQxNX0.ONl5r0x89QJKQtP9jttBkvESpV6lDpc1ijydxtP7nzo
VITE_SUPABASE_PROJECT_ID=sbtkymupbjyikfwjeumk
NODE_ENV=production
```

### Come Verificare/Aggiornare:

1. Vai su: https://vercel.com/dashboard
2. Seleziona il progetto
3. Settings → Environment Variables
4. Verifica che tutte le variabili siano presenti
5. Se mancanti, aggiungile per tutti gli ambienti

---

## 🚀 STEP 3: Deploy su Vercel

### Opzione A: Deploy Automatico (Git Push)

Se hai un repository GitHub collegato:

```bash
cd "/Users/ferrarisboutique/Documents/GitHub/Performance Dashboard App/Dashboard-Effe"
git add .
git commit -m "fix: Correzione path routing edge functions e miglioramenti sicurezza"
git push origin main
```

Vercel deployerà automaticamente.

### Opzione B: Deploy Manuale via CLI

```bash
# 1. Installa Vercel CLI (se non già installato)
npm i -g vercel

# 2. Login
vercel login

# 3. Deploy
cd "/Users/ferrarisboutique/Documents/GitHub/Performance Dashboard App/Dashboard-Effe"
vercel --prod
```

### Opzione C: Deploy via Dashboard

1. Vai su: https://vercel.com/dashboard
2. Seleziona il progetto
3. Clicca "Deployments"
4. Clicca "Redeploy" sull'ultimo deployment
5. Oppure fai push al repository collegato

---

## ✅ STEP 4: Verifica Post-Deploy

### 1. Test Health Check

```bash
curl 'https://sbtkymupbjyikfwjeumk.supabase.co/functions/v1/make-server-49468be0/health' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNidGt5bXVwYmp5aWtmd2pldW1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDA0MTUsImV4cCI6MjA3NDQ3NjQxNX0.ONl5r0x89QJKQtP9jttBkvESpV6lDpc1ijydxtP7nzo'
```

✅ Risposta attesa: `{"status":"ok",...}`

### 2. Test Endpoint Sales

```bash
curl 'https://sbtkymupbjyikfwjeumk.supabase.co/functions/v1/make-server-49468be0/sales' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNidGt5bXVwYmp5aWtmd2pldW1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDA0MTUsImV4cCI6MjA3NDQ3NjQxNX0.ONl5r0x89QJKQtP9jttBkvESpV6lDpc1ijydxtP7nzo'
```

✅ Risposta attesa: `{"success":true,"data":[...]}`

### 3. Test Applicazione Web

1. Apri l'URL dell'app su Vercel
2. Verifica che la dashboard si carichi correttamente
3. Testa upload vendite
4. Testa upload inventario
5. Verifica che non ci siano errori nella console del browser

### 4. Verifica Headers di Sicurezza

```bash
curl -I https://[YOUR-VERCEL-URL].vercel.app
```

Verifica presenza di:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

---

## 🔍 Troubleshooting

### Edge Function non risponde dopo deploy

1. Verifica i log su Supabase Dashboard:
   ```
   https://supabase.com/dashboard/project/sbtkymupbjyikfwjeumk/functions/make-server-49468be0/logs
   ```

2. Verifica che il codice sia stato salvato correttamente

3. Riprova il deploy

### Vercel Build Fallisce

1. Verifica i log di build su Vercel Dashboard
2. Esegui build locale:
   ```bash
   npm run build
   ```
3. Verifica errori TypeScript:
   ```bash
   npm run lint
   ```

### Variabili d'Ambiente Non Funzionano

1. Verifica che le variabili siano configurate per l'ambiente corretto
2. Assicurati che inizino con `VITE_`
3. Riavvia il deployment dopo aver aggiunto/modificato variabili

---

## 📝 Checklist Finale

- [ ] Edge Functions deployate su Supabase
- [ ] Health check endpoint funzionante
- [ ] Variabili d'ambiente configurate su Vercel
- [ ] Deploy Vercel completato
- [ ] Applicazione web funzionante
- [ ] Test upload vendite OK
- [ ] Test upload inventario OK
- [ ] Nessun errore nella console browser
- [ ] Headers di sicurezza presenti

---

## 🎯 Risultati Attesi

Dopo il deploy completo:

✅ **Sicurezza migliorata**: Variabili d'ambiente gestite correttamente
✅ **Performance migliorata**: Cache headers configurati
✅ **Routing corretto**: Edge functions funzionano correttamente
✅ **Error handling**: Gestione errori migliorata
✅ **Debug**: Console.log solo in sviluppo

---

## 📞 Supporto

Se riscontri problemi:

1. Controlla i log su Supabase Dashboard
2. Controlla i log su Vercel Dashboard
3. Verifica la console del browser per errori client-side
4. Consulta `ANALISI_BUG_E_ERRORI.md` per dettagli tecnici

