# 🚀 Deploy Manuale Edge Functions - 3 Minuti

## Metodo Rapido: Supabase Dashboard

### Step 1: Accedi alla Dashboard
Vai su: https://supabase.com/dashboard/project/sbtkymupbjyikfwjeumk/functions

### Step 2: Trova la Function
Cerca `make-server-49468be0` nella lista delle Edge Functions

### Step 3: Modifica il File sales.tsx

1. Clicca sulla function `make-server-49468be0`
2. Trova il file **`sales.tsx`** nella lista dei file
3. Clicca su "Edit"
4. **Sostituisci tutto il contenuto** con il codice qui sotto:

---

## 📄 CODICE AGGIORNATO sales.tsx

```typescript
import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import * as kv from './kv_store.tsx';

const app = new Hono();

app.use('*', cors({
  origin: ['http://localhost:3000', 'https://*.supabase.co'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

interface SaleData {
  id?: string;
  date: string;
  user?: string;
  channel: 'negozio_donna' | 'negozio_uomo' | 'ecommerce' | 'marketplace';
  sku?: string;
  productId?: string;
  quantity: number;
  price: number;
  amount: number;
  marketplace?: string;
  brand?: string;
  category?: string;
  season?: string;
}

// Get all sales data
app.get('/sales', async (c) => {
  try {
    const salesData = await kv.getByPrefix('sale_');
    return c.json({ success: true, data: salesData });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Save bulk sales data (from upload)
app.post('/sales/bulk', async (c) => {
  try {
    const requestBody = await c.req.json();
    const { sales } = requestBody;
    
    if (!sales) {
      return c.json({ success: false, error: 'No sales data provided' }, 400);
    }
    
    if (!Array.isArray(sales)) {
      return c.json({ success: false, error: 'Sales data must be an array' }, 400);
    }

    // Get existing sales to check for duplicates
    const existingSalesData = await kv.getByPrefix('sale_');
    
    // Create a Set of unique sale signatures (date+sku+quantity+amount)
    const existingSalesSignatures = new Set(
      existingSalesData.map((s: any) => {
        const sale = s.value || s;
        return `${sale.date}_${sale.productId || sale.sku}_${sale.quantity}_${sale.amount}`;
      })
    );

    const salesToSave: Record<string, SaleData> = {};
    const timestamp = Date.now();
    let skippedDuplicates = 0;
    let processedCount = 0;
    
    sales.forEach((sale: any, index: number) => {
      // Map SKU to productId for consistency
      const sku = sale.sku || sale.productId;
      const saleSignature = `${sale.date}_${sku}_${sale.quantity}_${sale.amount}`;
      
      if (existingSalesSignatures.has(saleSignature)) {
        skippedDuplicates++;
        return;
      }
      
      existingSalesSignatures.add(saleSignature);
      
      const saleId = `sale_${timestamp}_${index}`;
      salesToSave[saleId] = {
        id: saleId,
        date: sale.date,
        user: sale.user || 'unknown',
        channel: sale.channel,
        sku: sku,
        productId: sku,
        quantity: sale.quantity,
        price: sale.price,
        amount: sale.amount,
        brand: sale.brand || 'Unknown',
        category: sale.category || 'abbigliamento',
        season: sale.season || 'autunno_inverno',
        marketplace: sale.marketplace
      };
      processedCount++;
    });

    const keys = Object.keys(salesToSave);
    
    if (keys.length > 0) {
      await kv.mset(salesToSave);
    }
    
    let message = `${processedCount} vendite caricate con successo`;
    if (skippedDuplicates > 0) {
      message += ` (${skippedDuplicates} vendite duplicate ignorate)`;
    }
    
    return c.json({ 
      success: true, 
      message,
      savedCount: processedCount,
      skippedDuplicates
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Clear all sales data
app.delete('/sales/all', async (c) => {
  try {
    const salesData = await kv.getByPrefix('sale_');
    const saleIds = salesData.map((sale: any) => sale.id);
    
    if (saleIds.length > 0) {
      await kv.mdel(saleIds);
    }
    
    return c.json({ 
      success: true, 
      deletedCount: saleIds.length,
      message: `Deleted ${saleIds.length} sales records`
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Save single sale
app.post('/sales', async (c) => {
  try {
    const saleData = await c.req.json();
    
    const saleId = `sale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sale: SaleData = {
      ...saleData,
      id: saleId
    };
    
    await kv.set(saleId, sale);
    
    return c.json({ success: true, data: sale });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Delete sale by ID
app.delete('/sales/:id', async (c) => {
  try {
    const saleId = c.req.param('id');
    await kv.del(saleId);
    
    return c.json({ success: true, message: 'Sale deleted' });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;
```

---

### Step 4: Salva e Deploy

1. Clicca su **"Save"** in alto a destra
2. Clicca su **"Deploy"**
3. Attendi che appaia il messaggio "Deployed successfully" (circa 10-20 secondi)

### Step 5: Verifica

Testa che funzioni:
```bash
curl https://sbtkymupbjyikfwjeumk.supabase.co/functions/v1/make-server-49468be0/sales \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNidGt5bXVwYmp5aWtmd2pldW1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDA0MTUsImV4cCI6MjA3NDQ3NjQxNX0.ONl5r0x89QJKQtP9jttBkvESpV6lDpc1ijydxtP7nzo"
```

Dovresti vedere: `{"success":true,"data":[]}`

---

## 🎯 Dopo il Deploy

1. Vai su https://dashboard-effe-2x1yccu6l-paolos-projects-18e1f9ba.vercel.app
2. Vai su **"Carica Vendite"**
3. Carica il tuo file Excel/CSV
4. Verifica che i dati ora appaiano in **"Panoramica"** e **"Negozi"**!

---

## ✨ Cosa Cambia

Il nuovo codice salva **TUTTI i campi** per ogni vendita:
- ✅ `sku` e `productId` - Codice prodotto
- ✅ `user` - Nome venditore
- ✅ `price` - Prezzo unitario
- ✅ `amount` - Importo totale
- ✅ `channel` - Canale vendita
- ✅ `date` - Data vendita
- ✅ `quantity` - Quantità
- ✅ Plus: brand, category, season

Questo permette alla dashboard di visualizzare correttamente tutti i grafici e le statistiche!

---

**Tempo totale: 3 minuti** ⏱️


