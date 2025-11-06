# 🚀 Deploy Automatico Edge Function

## Prerequisiti

Per eseguire il deploy automatico, hai bisogno di un **Access Token** di Supabase.

### Come ottenere il token:

1. Vai su: https://supabase.com/dashboard/account/tokens
2. Clicca su **"Generate new token"**
3. Dai un nome al token (es. "Deploy Script")
4. Copia il token generato

## Opzione 1: Deploy con Token come Variabile d'Ambiente

```bash
cd "/Users/ferrarisboutique/Documents/GitHub/Performance Dashboard App/Dashboard-Effe"

# Imposta il token
export SUPABASE_ACCESS_TOKEN="il-tuo-token-qui"

# Esegui lo script
./deploy-edge-function-completo.sh
```

## Opzione 2: Deploy con Token come Parametro

```bash
cd "/Users/ferrarisboutique/Documents/GitHub/Performance Dashboard App/Dashboard-Effe"

# Passa il token come parametro
./deploy-edge-function-completo.sh "il-tuo-token-qui"
```

## Opzione 3: Deploy con Token Inline

```bash
cd "/Users/ferrarisboutique/Documents/GitHub/Performance Dashboard App/Dashboard-Effe"

SUPABASE_ACCESS_TOKEN="il-tuo-token-qui" ./deploy-edge-function-completo.sh
```

## Cosa fa lo script:

1. ✅ Verifica che tutti i file necessari siano presenti
2. 🔐 Esegue login a Supabase con il token
3. 🔗 Collega il progetto locale a quello remoto
4. 📦 Deploya la funzione `make-server-49468be0`
5. 🔍 Verifica che l'endpoint risponda correttamente

## Dopo il Deploy

Una volta completato il deploy, esegui:

```bash
./aggiorna-vendite-esistenti.sh
```

Questo aggiornerà tutte le vendite esistenti con i brand dall'inventario.

## Troubleshooting

### Errore: "Access token not provided"
- Verifica di aver fornito il token correttamente
- Controlla che il token non sia scaduto

### Errore: "Link fallito"
- Potrebbe essere già collegato, lo script continua comunque
- Se necessario, puoi eseguire manualmente: `npx supabase link --project-ref sbtkymupbjyikfwjeumk`

### Errore: "Deploy fallito"
- Controlla i log dell'errore
- Verifica che tutti i file nella directory `supabase/functions/make-server-49468be0/` siano presenti
- Controlla che non ci siano errori di sintassi nei file TypeScript

### Health check restituisce 404
- Attendi 30-60 secondi per la propagazione
- Verifica nel dashboard Supabase che la funzione sia deployata correttamente



