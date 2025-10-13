# 🚀 Istruzioni per Deploy Edge Functions

## File Preparati

Nella cartella `functions/make-server-49468be0/` trovi i file aggiornati delle Edge Functions:
- `index.tsx` - Router principale
- `sales.tsx` - **AGGIORNATO** con correzione campi vendite
- `inventory.tsx` - Gestione inventario
- `kv_store.tsx` - Gestione database

## 📋 Deploy su Supabase

### Metodo 1: Supabase Dashboard (Più Semplice)

1. Vai su [https://supabase.com/dashboard/project/sbtkymupbjyikfwjeumk](https://supabase.com/dashboard/project/sbtkymupbjyikfwjeumk)

2. Nel menu laterale, clicca su **"Edge Functions"**

3. Trova la function **`make-server-49468be0`**

4. Clicca su **"Edit Function"** o **"Deploy New Version"**

5. Copia il contenuto di ciascun file nella rispettiva sezione:
   - `index.tsx` → Sezione index
   - `sales.tsx` → Sezione sales
   - `inventory.tsx` → Sezione inventory
   - `kv_store.tsx` → Sezione kv_store

6. Clicca su **"Deploy"** per applicare le modifiche

7. Attendi il completamento del deploy (circa 30 secondi)

### Metodo 2: Supabase CLI (Avanzato)

Se preferisci usare la CLI:

```bash
# 1. Installa Supabase CLI (se non l'hai già)
npm install -g supabase

# 2. Login a Supabase
supabase login

# 3. Link al progetto
supabase link --project-ref sbtkymupbjyikfwjeumk

# 4. Deploy della function
cd deploy-package
supabase functions deploy make-server-49468be0 --project-ref sbtkymupbjyikfwjeumk
```

## ✅ Verifica Deploy Completato

Dopo il deploy, verifica che tutto funzioni:

```bash
# Test endpoint sales
curl https://sbtkymupbjyikfwjeumk.supabase.co/functions/v1/make-server-49468be0/health

# Dovrebbe rispondere con:
# {"status":"ok"}
```

Oppure dalla Dashboard:
1. Vai su "Carica Vendite"
2. Clicca "Verifica Dati Esistenti"
3. Dovresti vedere "Database check: Trovati 0 record di vendita nel database"

## 🔄 Dopo il Deploy

1. Vai su [Dashboard App](https://dashboard-effe-2x1yccu6l-paolos-projects-18e1f9ba.vercel.app)

2. Vai su **"Carica Vendite"**

3. Carica nuovamente il file Excel/CSV con i dati di vendita

4. Verifica che ora i dati vengano visualizzati correttamente in:
   - ✅ **Panoramica** - Grafici e metriche
   - ✅ **Negozi** - Dati per negozio donna/uomo

## 🐛 Troubleshooting

### "Function not found"
- Assicurati di aver fatto il deploy
- Controlla di essere sul progetto corretto (sbtkymupbjyikfwjeumk)

### "Unauthorized"
- Verifica di aver fatto login con `supabase login`
- Controlla che il token API sia valido

### "Deploy failed"
- Controlla i log nella Supabase Dashboard → Edge Functions
- Verifica che non ci siano errori di sintassi nei file

## 📞 Supporto

Se hai problemi, controlla:
1. Supabase Dashboard → Edge Functions → Logs
2. Browser Console (F12) per errori frontend
3. Il file `CORREZIONE_VENDITE.md` per dettagli sulla correzione

---

**Una volta completato il deploy, ricarica i dati di vendita e tutto dovrebbe funzionare perfettamente!** ✨


