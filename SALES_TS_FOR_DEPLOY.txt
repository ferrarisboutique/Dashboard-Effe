import { Hono } from 'npm:hono';
import * as kv from './kv_store.ts';
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

const app = new Hono();

// CORS is handled globally in index.ts - no need to configure it here

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

// Helper: fetch all sales with pagination to bypass 1000 row limit
const getAllSalesItems = async (): Promise<Array<{ key: string; value: any }>> => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  );

  // Get exact count first
  const { count, error: countError } = await supabase
    .from("kv_store_49468be0")
    .select("*", { count: 'exact', head: true })
    .like("key", "sale_%");

  if (countError) {
    throw new Error(countError.message);
  }

  if (!count || count === 0) return [];

  // If <= 1000, fetch all in one go
  if (count <= 1000) {
    const { data, error } = await supabase
      .from("kv_store_49468be0")
      .select("key, value")
      .like("key", "sale_%")
      .limit(count);
    if (error) throw new Error(error.message);
    return data?.map(d => ({ key: d.key, value: d.value })) ?? [];
  }

  // Paginate in chunks of 1000
  const pageSize = 1000;
  const pages = Math.ceil(count / pageSize);
  const all: Array<{ key: string; value: any }> = [];
  for (let i = 0; i < pages; i++) {
    const from = i * pageSize;
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("kv_store_49468be0")
      .select("key, value")
      .like("key", "sale_%")
      .range(from, to);
    if (error) throw new Error(error.message);
    if (data && data.length) all.push(...data.map(d => ({ key: d.key, value: d.value })));
  }
  return all;
};

// Helper: build inventory map sku -> { brand, purchasePrice }
const getInventoryMap = async (): Promise<Record<string, { brand?: string; purchasePrice?: number }>> => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  );
  const normalizeSku = (s?: string) => (s || '').toString().trim().toUpperCase();
  const map: Record<string, { brand?: string; purchasePrice?: number }> = {};

  const { count, error: countError } = await supabase
    .from("kv_store_49468be0")
    .select("*", { count: 'exact', head: true })
    .like("key", "inventory_%");
  if (countError) throw new Error(countError.message);
  if (!count || count === 0) return map;

  const pageSize = 1000;
  const pages = Math.ceil(count / pageSize);
  for (let i = 0; i < pages; i++) {
    const from = i * pageSize;
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("kv_store_49468be0")
      .select("value")
      .like("key", "inventory_%")
      .range(from, to);
    if (error) throw new Error(error.message);
    (data || []).forEach((row: any) => {
      const v = row.value || {};
      const key = normalizeSku(v.sku);
      if (key) {
        map[key] = { brand: v.brand, purchasePrice: v.purchasePrice };
      }
    });
  }
  return map;
};

// Get all sales data - return flat Sale objects (no KV wrappers)
app.get('/sales', async (c) => {
  try {
    const [kvItems, invMap] = await Promise.all([
      getAllSalesItems(),
      getInventoryMap()
    ]);
    const sales = kvItems.map((item: any) => {
      const value = item.value || {};
      // Ensure id exists inside value; fallback to key suffix
      const id = value.id || item.key || `sale_${Math.random().toString(36).substr(2, 9)}`;
      const normSku = ((value.productId || value.sku || '') + '').trim().toUpperCase();
      const inv = invMap[normSku];
      const brandFromInv = inv?.brand;
      const purchasePrice = inv?.purchasePrice;
      return {
        id,
        date: value.date,
        user: value.user,
        channel: value.channel,
        sku: value.sku || value.productId,
        productId: value.productId || value.sku,
        quantity: value.quantity,
        price: value.price,
        amount: value.amount,
        brand: value.brand && value.brand !== 'Unknown' ? value.brand : (brandFromInv || 'Unknown'),
        category: value.category || 'abbigliamento',
        season: value.season || 'autunno_inverno',
        marketplace: value.marketplace,
        // supply purchasePrice to help client margin if needed
        purchasePrice
      } as SaleData;
    });
    return c.json({ success: true, data: sales });
  } catch (error) {
    return c.json({ success: false, error: (error as Error).message }, 500);
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

    // Get existing sales to check for duplicates (all pages)
    // ALSO load inventory map to match SKUs to brands during save
    const [existingSalesData, invMap] = await Promise.all([
      getAllSalesItems(),
      getInventoryMap()
    ]);
    
    // Load learned mappings for auto-correction
    const normalizeSku = (s?: string) => (s || '').toString().trim().toUpperCase();
    const userKey = (u?: string) => (u || '').toString().trim().toLowerCase();
    
    // Create a Set of unique sale signatures (date+sku+quantity+amount)
    const existingSalesSignatures = new Set(
      existingSalesData.map((s: any) => {
        const sale = s.value || s;
        // Include time in date if present to ensure uniqueness per second
        return `${sale.date}_${sale.productId || sale.sku}_${sale.quantity}_${sale.amount}`;
      })
    );

    const salesToSave: Record<string, SaleData> = {};
    const timestamp = Date.now();
    let skippedDuplicates = 0;
    let processedCount = 0;
    let mappingsApplied = 0;
    let brandsFromInventory = 0;
    
    for (let index = 0; index < sales.length; index++) {
      const sale = sales[index];
      
      // Map SKU to productId for consistency
      const sku = sale.sku || sale.productId;
      // sale.date can be ISO with time if provided by upload; this keeps distinct timestamps unique
      const saleSignature = `${sale.date}_${sku}_${sale.quantity}_${sale.amount}`;
      
      if (existingSalesSignatures.has(saleSignature)) {
        skippedDuplicates++;
        continue;
      }
      
      existingSalesSignatures.add(saleSignature);
      
      // Auto-apply learned mappings and inventory lookup
      let brand = sale.brand || 'Unknown';
      let channel = sale.channel;
      
      // Priority 1: Check inventory map if brand is Unknown or missing
      if ((brand === 'Unknown' || !brand) && sku) {
        const normSku = normalizeSku(sku);
        const invItem = invMap[normSku];
        if (invItem && invItem.brand) {
          brand = invItem.brand;
          brandsFromInventory++;
        }
      }
      
      // Priority 2: Check learned brand mapping if still Unknown
      if (brand === 'Unknown' && sku) {
        try {
          const brandMapping = await kv.get(`mapping_brand_${normalizeSku(sku)}`);
          if (brandMapping && brandMapping.brand) {
            brand = brandMapping.brand;
            mappingsApplied++;
          }
        } catch (e) {
          // Mapping not found, continue with Unknown
        }
      }
      
      // Check channel mapping if channel is missing or user mapping exists
      if (sale.user && (!channel || channel === 'unknown')) {
        try {
          const channelMapping = await kv.get(`mapping_channel_${userKey(sale.user)}`);
          if (channelMapping && channelMapping.channel) {
            channel = channelMapping.channel;
            mappingsApplied++;
          }
        } catch (e) {
          // Mapping not found, continue with provided channel
        }
      }
      
      const saleId = `sale_${timestamp}_${index}`;
      salesToSave[saleId] = {
        id: saleId,
        date: sale.date,
        user: sale.user || 'unknown',
        channel: channel,
        sku: sku,
        productId: sku,
        quantity: sale.quantity,
        price: sale.price,
        amount: sale.amount,
        brand: brand,
        category: sale.category || 'abbigliamento',
        season: sale.season || 'autunno_inverno',
        marketplace: sale.marketplace
      };
      processedCount++;
    }

    const keys = Object.keys(salesToSave);
    
    if (keys.length > 0) {
      await kv.mset(salesToSave);
    }
    
    let message = `${processedCount} vendite caricate con successo`;
    if (skippedDuplicates > 0) {
      message += ` (${skippedDuplicates} vendite duplicate ignorate)`;
    }
    if (brandsFromInventory > 0) {
      message += ` (${brandsFromInventory} brand attribuiti dall'inventario)`;
    }
    if (mappingsApplied > 0) {
      message += ` (${mappingsApplied} mapping auto-applicati)`;
    }
    
    return c.json({ 
      success: true, 
      message,
      savedCount: processedCount,
      skippedDuplicates,
      brandsFromInventory,
      mappingsApplied
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

// Clear all sales data (batched)
app.delete('/sales/all', async (c) => {
  try {
    // Prefer a single statement delete by prefix
    // If delByPrefix is unavailable, fallback to batched delete
    let deleted = 0;
    if ((kv as any).delByPrefix) {
      deleted = await (kv as any).delByPrefix('sale_');
    } else {
      const salesData = await kv.getByPrefix('sale_');
      const saleKeys = salesData.map((sale: any) => sale.key);
      const BATCH = 500;
      for (let i = 0; i < saleKeys.length; i += BATCH) {
        const batch = saleKeys.slice(i, i + BATCH);
        if (batch.length > 0) {
          await kv.mdel(batch);
          deleted += batch.length;
        }
      }
    }
    return c.json({ 
      success: true, 
      deletedCount: deleted,
      message: `Deleted ${deleted} sales records`
    });
  } catch (error) {
    return c.json({ success: false, error: (error as Error).message }, 500);
  }
});

// Save single sale
app.post('/sales', async (c) => {
  try {
    const saleData = await c.req.json();
    
    // Load inventory map to match SKU to brand
    const invMap = await getInventoryMap();
    const normalizeSku = (s?: string) => (s || '').toString().trim().toUpperCase();
    
    let brand = saleData.brand || 'Unknown';
    const sku = saleData.sku || saleData.productId;
    
    // Priority 1: Check inventory map if brand is Unknown or missing
    if ((brand === 'Unknown' || !brand) && sku) {
      const normSku = normalizeSku(sku);
      const invItem = invMap[normSku];
      if (invItem && invItem.brand) {
        brand = invItem.brand;
      }
    }
    
    // Priority 2: Check learned brand mapping if still Unknown
    if (brand === 'Unknown' && sku) {
      try {
        const brandMapping = await kv.get(`mapping_brand_${normalizeSku(sku)}`);
        if (brandMapping && brandMapping.brand) {
          brand = brandMapping.brand;
        }
      } catch (e) {
        // Mapping not found, continue with Unknown
      }
    }
    
    const saleId = `sale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sale: SaleData = {
      ...saleData,
      id: saleId,
      brand: brand
    };
    
    await kv.set(saleId, sale);
    
    return c.json({ success: true, data: sale });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

// Delete sale by ID
app.delete('/sales/:id', async (c) => {
  try {
    const saleId = c.req.param('id');
    await kv.del(saleId);
    
    return c.json({ success: true, message: 'Sale deleted' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

// Update existing sales with brands from inventory
// This fixes sales that were uploaded before the inventory lookup was implemented
app.post('/sales/update-brands-from-inventory', async (c) => {
  try {
    const [kvItems, invMap] = await Promise.all([
      getAllSalesItems(),
      getInventoryMap()
    ]);
    
    const normalizeSku = (s?: string) => (s || '').toString().trim().toUpperCase();
    const updates: Record<string, SaleData> = {};
    let updatedCount = 0;
    
    for (const item of kvItems) {
      const value = item.value || {};
      const currentBrand = value.brand;
      
      // Only update if brand is Unknown or missing
      if ((!currentBrand || currentBrand === 'Unknown') && value.sku) {
        const normSku = normalizeSku(value.sku || value.productId);
        const invItem = invMap[normSku];
        
        if (invItem && invItem.brand) {
          // Update the sale with brand from inventory
          updates[item.key] = {
            ...value,
            brand: invItem.brand
          };
          updatedCount++;
        }
      }
    }
    
    // Apply updates in batch
    if (Object.keys(updates).length > 0) {
      await kv.mset(updates);
    }
    
    return c.json({
      success: true,
      message: `${updatedCount} vendite aggiornate con brand dall'inventario`,
      updatedCount
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

export default app;

// Additional endpoints: orphans listing and corrections/mapping

// List orphan sales (missing brand or unknown; or invalid/missing channel)
app.get('/sales/orphans', async (c) => {
  try {
    const [kvItems, invMap] = await Promise.all([
      getAllSalesItems(),
      getInventoryMap()
    ]);
    const validChannels = ['negozio_donna', 'negozio_uomo', 'ecommerce', 'marketplace'];
    const orphans = kvItems
      .map((item: any) => ({ key: item.key, value: item.value || {} }))
      .filter(({ value }) => {
        const normSku = ((value.productId || value.sku || '') + '').trim().toUpperCase();
        const inv = invMap[normSku];
        const hasBrand = (value.brand && value.brand !== 'Unknown') || (inv && inv.brand);
        const hasValidChannel = value.channel && validChannels.includes(value.channel);
        return !hasBrand || !hasValidChannel;
      })
      .map(({ key, value }) => ({
        id: key,
        date: value.date,
        user: value.user,
        channel: value.channel,
        sku: value.sku || value.productId,
        amount: value.amount,
        brand: value.brand || null
      }));
    return c.json({ success: true, data: orphans });
  } catch (error) {
    return c.json({ success: false, error: (error as Error).message }, 500);
  }
});

// Bulk update sales (brand/channel)
app.post('/sales/bulk-update', async (c) => {
  try {
    const { updates } = await c.req.json();
    if (!Array.isArray(updates)) return c.json({ success: false, error: 'updates must be array' }, 400);
    let updated = 0;
    for (const up of updates) {
      const id = up.id;
      if (!id) continue;
      const existing = await kv.get(id);
      if (!existing) continue;
      const next = { ...existing } as any;
      if (up.brand) next.brand = up.brand;
      if (up.channel) next.channel = up.channel;
      await kv.set(id, next);
      updated++;
    }
    return c.json({ success: true, updated });
  } catch (error) {
    return c.json({ success: false, error: (error as Error).message }, 500);
  }
});

// Learn mappings from corrections
app.post('/sales/learn', async (c) => {
  try {
    const body = await c.req.json();
    const brandMappings = Array.isArray(body.brandMappings) ? body.brandMappings : [];
    const channelMappings = Array.isArray(body.channelMappings) ? body.channelMappings : [];
    const normalizeSku = (s?: string) => (s || '').toString().trim().toUpperCase();
    const userKey = (u?: string) => (u || '').toString().trim().toLowerCase();
    let learned = 0;
    for (const m of brandMappings) {
      if (!m || !m.sku || !m.brand) continue;
      await kv.set(`mapping_brand_${normalizeSku(m.sku)}`, { brand: m.brand });
      learned++;
    }
    for (const m of channelMappings) {
      if (!m || !m.user || !m.channel) continue;
      await kv.set(`mapping_channel_${userKey(m.user)}`, { channel: m.channel });
      learned++;
    }
    return c.json({ success: true, learned });
  } catch (error) {
    return c.json({ success: false, error: (error as Error).message }, 500);
  }
});
