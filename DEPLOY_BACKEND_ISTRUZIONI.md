# 🚀 DEPLOY BACKEND SU SUPABASE - ISTRUZIONI

## ✅ COMPLETATO

1. **✅ Duplicati rimossi**: 999 duplicati eliminati (da 7028 a 6029 vendite)
2. **✅ Database corretto**: Tutte le 207 vendite ecommerce hanno `channel="ecommerce"`
3. **✅ Frontend deployato**: Vercel aggiornato automaticamente

## ❌ ANCORA DA FARE

**Deploy del backend su Supabase** - Il backend contiene la logica aggiornata per identificare e ritornare correttamente le vendite ecommerce.

---

## 📋 ISTRUZIONI DEPLOY (5 minuti)

### Step 1: Apri la Dashboard Supabase

1. Vai su: **https://supabase.com/dashboard/project/sbtkymupbjyikfwjeumk/functions**
2. Login con le tue credenziali Supabase

### Step 2: Apri l'Editor della Funzione

1. Nella lista delle funzioni, clicca su **`make-server-49468be0`**
2. Clicca sul pulsante **"Edit"** in alto a destra
3. Si aprirà l'editor online della funzione

### Step 3: Modifica il File `sales.ts`

1. Nell'editor, cerca e apri il file **`sales.ts`**
2. **Seleziona TUTTO il contenuto** (CMD+A o CTRL+A)
3. **CANCELLA tutto** (DELETE)
4. **Apri il file locale** da questo percorso:
   ```
   /Users/ferrarisboutique/Documents/GitHub/Performance Dashboard App/Dashboard-Effe/supabase/functions/make-server-49468be0/sales.ts
   ```
5. **Copia TUTTO il contenuto** del file locale (CMD+A, CMD+C)
6. **Incolla** nel editor della dashboard Supabase (CMD+V)

### Step 4: Deploy

1. Clicca il pulsante **"Deploy"** (o "Save and Deploy")
2. Attendi il completamento del deploy (circa 30-60 secondi)
3. Dovresti vedere un messaggio di successo

### Step 5: Verifica

1. Ricarica l'app: **https://dashboard-effe.vercel.app**
2. Vai nella sezione **"Online"**
3. Dovresti vedere le 207 vendite ecommerce! 🎉

---

## 🔧 ALTERNATIVE (se la Dashboard non funziona)

### Opzione A: Homebrew CLI

```bash
# Installa Supabase CLI (una volta sola)
brew install supabase/tap/supabase

# Login (una volta sola)
supabase login

# Link al progetto (una volta sola)
cd "/Users/ferrarisboutique/Documents/GitHub/Performance Dashboard App/Dashboard-Effe"
supabase link --project-ref sbtkymupbjyikfwjeumk

# Deploy (ogni volta che modifichi il backend)
supabase functions deploy make-server-49468be0 --no-verify-jwt
```

### Opzione B: Fix npm permissions (se vuoi usare npx)

```bash
# Fix permessi npm (UNA VOLTA SOLA)
sudo chown -R $(whoami) /usr/local/lib/node_modules
sudo chown -R $(whoami) /usr/local/bin
sudo chown -R $(whoami) /usr/local/share

# Poi usa npx normalmente
cd "/Users/ferrarisboutique/Documents/GitHub/Performance Dashboard App/Dashboard-Effe"
npx supabase functions deploy make-server-49468be0 --project-ref sbtkymupbjyikfwjeumk --no-verify-jwt
```

---

## 🎯 COSA CAMBIERÀ DOPO IL DEPLOY

### Prima (Attuale)
- ❌ Sezione "Online" vuota
- ❌ E-commerce: €0
- ❌ Marketplace: €0
- Console log: `Ecommerce sales: 0`

### Dopo (Deploy Completato)
- ✅ Sezione "Online" popolata
- ✅ E-commerce: ~207 vendite visibili
- ✅ Marketplace: come mappato
- Console log: `Ecommerce sales: 207`

---

## 📝 NOTE TECNICHE

**Codice Chiave Aggiornato** (righe 174-182 in `sales.ts`):

```typescript
// For ecommerce sales (identified by documento/numero), ensure channel is set
let channel = value.channel;
// Fix: Handle null, empty string, or 'unknown' channel for ecommerce sales
if (value.documento && value.numero) {
  if (!channel || channel === 'unknown' || channel === '' || channel === null) {
    channel = 'ecommerce';
    ecommerceFixed++;
  }
}
```

Questa logica identifica automaticamente le vendite ecommerce (quelle con `documento` e `numero`) e assegna il channel corretto.

---

## ❓ PROBLEMI?

Se dopo il deploy le vendite non compaiono ancora:

1. **Hard refresh** del browser (CMD+SHIFT+R)
2. **Apri Console Chrome** (F12) e verifica i log
3. **Verifica il deploy**: Vai su https://supabase.com/dashboard/project/sbtkymupbjyikfwjeumk/functions e controlla lo stato
4. **Controlla i log** del backend nella dashboard Supabase

---

**Tempo stimato**: 5 minuti ⏱️  
**Difficoltà**: Facile 🟢

Fammi sapere quando hai completato il deploy! 🚀

