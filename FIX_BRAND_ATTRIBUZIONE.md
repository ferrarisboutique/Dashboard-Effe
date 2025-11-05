# 🔧 Fix: Attribuzione Brand da Inventario

## 🐛 Problema Identificato

Molte vendite (quasi tutte) non avevano lo SKU correttamente attribuito al brand, impedendo statistiche corrette per brand.

### Causa Root

1. **Frontend**: La funzione `convertToSaleFormat` impostava sempre `brand: 'Unknown'` hardcoded
2. **Backend durante salvataggio**: Cercava solo i mapping salvati (`mapping_brand_*`), **NON controllava l'inventario**
3. **Backend durante lettura**: Il matching con l'inventario avveniva solo in GET `/sales`, non durante il salvataggio

### Impatto

- Le vendite venivano salvate con `brand: 'Unknown'`
- Il brand veniva recuperato dall'inventario solo durante la lettura
- Le statistiche per brand erano incomplete/errate

## ✅ Soluzione Implementata

### 1. Modifica Backend `/sales/bulk` (POST)

**File**: `supabase/functions/make-server-49468be0/sales.ts`

**Modifiche**:
- ✅ Caricamento inventario durante il salvataggio delle vendite
- ✅ Priorità 1: Controllo inventario se brand è Unknown o mancante
- ✅ Priorità 2: Controllo mapping salvati se ancora Unknown
- ✅ Conteggio brand attribuiti dall'inventario nel messaggio di risposta

**Codice chiave**:
```typescript
// Carica inventario insieme alle vendite esistenti
const [existingSalesData, invMap] = await Promise.all([
  getAllSalesItems(),
  getInventoryMap()
]);

// Per ogni vendita:
// Priority 1: Check inventory map
if ((brand === 'Unknown' || !brand) && sku) {
  const normSku = normalizeSku(sku);
  const invItem = invMap[normSku];
  if (invItem && invItem.brand) {
    brand = invItem.brand;
    brandsFromInventory++;
  }
}
```

### 2. Nuovo Endpoint per Aggiornare Vendite Esistenti

**Endpoint**: `POST /sales/update-brands-from-inventory`

**Funzionalità**:
- Trova tutte le vendite con `brand: 'Unknown'` o mancante
- Cerca gli SKU nell'inventario
- Aggiorna le vendite con il brand dall'inventario
- Ritorna il numero di vendite aggiornate

**Utilizzo**:
```bash
curl -X POST 'https://sbtkymupbjyikfwjeumk.supabase.co/functions/v1/make-server-49468be0/sales/update-brands-from-inventory' \
  -H 'Authorization: Bearer [ANON_KEY]'
```

## 🚀 Deploy Necessario

### 1. Deploy Edge Function su Supabase

```bash
# Opzione A: Via Dashboard
# Vai su: https://supabase.com/dashboard/project/sbtkymupbjyikfwjeumk/functions
# Aggiorna il file sales.ts

# Opzione B: Via CLI
supabase functions deploy make-server-49468be0 --project-ref sbtkymupbjyikfwjeumk
```

### 2. Aggiornare Vendite Esistenti

Dopo il deploy, chiama l'endpoint per aggiornare le vendite già caricate:

```bash
curl -X POST 'https://sbtkymupbjyikfwjeumk.supabase.co/functions/v1/make-server-49468be0/sales/update-brands-from-inventory' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNidGt5bXVwYmp5aWtmd2pldW1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDA0MTUsImV4cCI6MjA3NDQ3NjQxNX0.ONl5r0x89QJKQtP9jttBkvESpV6lDpc1ijydxtP7nzo'
```

Oppure aggiungi un pulsante nell'interfaccia "Qualità Dati" per chiamare questo endpoint.

## 📊 Risultati Attesi

### Prima del Fix:
- ❌ Vendite salvate con `brand: 'Unknown'`
- ❌ Brand recuperato solo durante lettura
- ❌ Statistiche per brand incomplete

### Dopo il Fix:
- ✅ Vendite salvate con brand corretto dall'inventario
- ✅ Brand disponibile immediatamente dopo upload
- ✅ Statistiche per brand corrette e complete
- ✅ Messaggio di upload mostra quanti brand sono stati attribuiti

## 🔍 Verifica

1. **Carica nuove vendite**: Verifica che il messaggio mostri "X brand attribuiti dall'inventario"
2. **Controlla statistiche**: Le statistiche per brand dovrebbero essere corrette
3. **Aggiorna vendite esistenti**: Chiama l'endpoint di aggiornamento per correggere le vendite vecchie

## 📝 Note Tecniche

- La normalizzazione SKU usa `.trim().toUpperCase()` per garantire matching corretto
- Il matching avviene durante il salvataggio, non solo durante la lettura
- Priorità: Inventario > Mapping salvati > Unknown
- Le vendite esistenti possono essere aggiornate con l'endpoint dedicato

