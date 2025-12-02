// Sales routes - Native Deno (no Hono)
import * as kv from './kv_store.ts';
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

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
  paymentMethod?: string;
  area?: 'Ferraris' | 'Zuklat';
  country?: string;
  orderReference?: string;
  shippingCost?: number;
  taxRate?: number;
  documento?: string;
  numero?: string;
}

// Helper: fetch all sales with pagination to bypass 1000 row limit
const getAllSalesItems = async (): Promise<Array<{ key: string; value: any }>> => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  );

  const { count, error: countError } = await supabase
    .from("kv_store_49468be0")
    .select("*", { count: 'exact', head: true })
    .like("key", "sale_%");

  if (countError) {
    throw new Error(countError.message);
  }

  if (!count || count === 0) return [];

  if (count <= 1000) {
    const { data, error } = await supabase
      .from("kv_store_49468be0")
      .select("key, value")
      .like("key", "sale_%")
      .limit(count);
    if (error) throw new Error(error.message);
    return data?.map(d => ({ key: d.key, value: d.value })) ?? [];
  }

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

// Helper: normalize SKU - very aggressive normalization for better matching
const normalizeSku = (s?: string): string => {
  if (!s) return '';
  // Convert to string, trim, uppercase
  let normalized = s.toString().trim().toUpperCase();
  // Remove ALL separators, spaces, and special characters (keep only alphanumeric)
  normalized = normalized.replace(/[-_\.\/\s]/g, '');
  // Remove any other non-alphanumeric characters
  normalized = normalized.replace(/[^A-Z0-9]/g, '');
  return normalized;
};

// Helper: build inventory map sku -> { brand, purchasePrice }
// Also create a map with multiple normalization variants for better matching
const getInventoryMap = async (): Promise<Record<string, { brand?: string; purchasePrice?: number }>> => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  );
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
        const sku = v.sku;
        if (sku) {
          const skuStr = sku.toString();
          
          // Store with normalized key (most aggressive)
          const normalizedKey = normalizeSku(skuStr);
          if (normalizedKey) {
            map[normalizedKey] = { brand: v.brand, purchasePrice: v.purchasePrice };
          }
          
          // Also store with original SKU (uppercase, trimmed, no separators) for fallback
          const originalKey = skuStr.trim().toUpperCase().replace(/[-_\.\/\s]/g, '');
          if (originalKey && originalKey !== normalizedKey) {
            if (!map[originalKey]) {
              map[originalKey] = { brand: v.brand, purchasePrice: v.purchasePrice };
            }
          }
          
          // Also store with just uppercase/trimmed (in case separators are important)
          const simpleKey = skuStr.trim().toUpperCase();
          if (simpleKey && simpleKey !== normalizedKey && simpleKey !== originalKey) {
            if (!map[simpleKey]) {
              map[simpleKey] = { brand: v.brand, purchasePrice: v.purchasePrice };
            }
          }
        }
      });
  }
  return map;
};

// JSON response helper
function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// Main sales routes handler
export async function handleSalesRoutes(req: Request, path: string, method: string): Promise<Response> {
  try {
    // GET /sales
    if (path === '/sales' && method === 'GET') {
      const [kvItems, invMap, paymentMappingsData] = await Promise.all([
        getAllSalesItems(),
        getInventoryMap(),
        // Load payment mappings to apply them when retrieving sales
        (async () => {
          try {
            const mappings: Record<string, { macroArea: string; channel: string }> = {};
            const allKeys = await kv.getByPrefix('payment_mapping_');
            for (const item of allKeys) {
              const key = item.key;
              const paymentMethod = key.replace('payment_mapping_', '');
              const mapping = item.value || {};
              if (mapping.macroArea && mapping.channel) {
                mappings[paymentMethod] = {
                  macroArea: mapping.macroArea,
                  channel: mapping.channel
                };
              }
            }
            return mappings;
          } catch (e) {
            return {};
          }
        })()
      ]);
      let ecommerceFixed = 0;
      let mappingsApplied = 0;
      const sales = kvItems.map((item: any) => {
        const value = item.value || {};
        const id = value.id || item.key || `sale_${Math.random().toString(36).substr(2, 9)}`;
        const sku = value.sku || value.productId;
        
        // Start with existing channel
        let channel = value.channel;
        const isEcommerceSale = value.documento && value.numero;
        const paymentMethod = value.paymentMethod;
        
        // Apply payment method mapping if available
        // Priority: Payment mapping > Ecommerce default > Existing channel
        if (paymentMethod && paymentMappingsData[paymentMethod]) {
          const mapping = paymentMappingsData[paymentMethod];
          // Only apply mapping if it's for online channels (ecommerce or marketplace)
          if (mapping.channel === 'ecommerce' || mapping.channel === 'marketplace') {
            // Apply mapping if:
            // 1. Sale is ecommerce (has documento/numero), OR
            // 2. Sale doesn't have a store channel (negozio_donna/negozio_uomo)
            const isStoreSale = channel === 'negozio_donna' || channel === 'negozio_uomo';
            if (isEcommerceSale || !isStoreSale) {
              channel = mapping.channel;
              mappingsApplied++;
            }
          }
        }
        
        // For ecommerce sales without payment method mapping, ensure they have a channel
        if (isEcommerceSale && (!channel || channel === 'unknown' || channel === '' || channel === null)) {
          channel = 'ecommerce';
          ecommerceFixed++;
        }
        
        if (!sku) {
          // No SKU, use existing brand or Unknown
          return {
            id,
            date: value.date,
            user: value.user,
            channel: channel,
            sku: value.sku || value.productId,
            productId: value.productId || value.sku,
            quantity: value.quantity,
            price: value.price,
            amount: value.amount,
            brand: value.brand && value.brand !== 'Unknown' ? value.brand : 'Unknown',
            category: value.category || 'abbigliamento',
            season: value.season || 'autunno_inverno',
            marketplace: value.marketplace,
            paymentMethod: value.paymentMethod,
            area: value.area,
            country: value.country,
            orderReference: value.orderReference,
            shippingCost: value.shippingCost,
            taxRate: value.taxRate,
            documento: value.documento,
            numero: value.numero,
            purchasePrice: undefined
          } as SaleData;
        }
        
        const skuStr = sku.toString();
        const normSku = normalizeSku(skuStr);
        const originalSku = skuStr.trim().toUpperCase().replace(/[-_\.\/\s]/g, '');
        const simpleSku = skuStr.trim().toUpperCase();
        
        // Try all variants: normalized, original without separators, simple uppercase
        let inv = invMap[normSku];
        if (!inv && originalSku !== normSku) {
          inv = invMap[originalSku];
        }
        if (!inv && simpleSku !== normSku && simpleSku !== originalSku) {
          inv = invMap[simpleSku];
        }
        
        const brandFromInv = inv?.brand;
        const purchasePrice = inv?.purchasePrice;
        return {
          id,
          date: value.date,
          user: value.user,
          channel: channel,
          sku: value.sku || value.productId,
          productId: value.productId || value.sku,
          quantity: value.quantity,
          price: value.price,
          amount: value.amount,
          brand: value.brand && value.brand !== 'Unknown' ? value.brand : (brandFromInv || 'Unknown'),
          category: value.category || 'abbigliamento',
            season: value.season || 'autunno_inverno',
            marketplace: value.marketplace,
            paymentMethod: value.paymentMethod,
            area: value.area,
            country: value.country,
            orderReference: value.orderReference,
            shippingCost: value.shippingCost,
            taxRate: value.taxRate,
            documento: value.documento,
            numero: value.numero,
            purchasePrice
          } as SaleData;
      });
      
      // DEBUG: Check if raw kvItems contain documento
      const rawWithDoc = kvItems.filter((item: any) => item.value?.documento && item.value?.numero).length;
      console.log(`[DEBUG RAW] kvItems with documento/numero: ${rawWithDoc} out of ${kvItems.length}`);
      
      // Log statistics for debugging
      const ecommerceCount = sales.filter(s => s.channel === 'ecommerce').length;
      const marketplaceCount = sales.filter(s => s.channel === 'marketplace').length;
      const onlineCount = ecommerceCount + marketplaceCount;
      const withDocumentoNumero = sales.filter((s: any) => s.documento && s.numero).length;
      const withPaymentMethod = sales.filter((s: any) => s.paymentMethod).length;
      
      console.log(`[GET /sales] Total: ${sales.length}, Ecommerce: ${ecommerceCount}, Marketplace: ${marketplaceCount}, Online: ${onlineCount}, Fixed channels: ${ecommerceFixed}, Mappings applied: ${mappingsApplied}, With documento/numero: ${withDocumentoNumero}, With paymentMethod: ${withPaymentMethod}`);
      
      // DEBUG: Log first sale with documento to verify it's in the array before stringify
      const sampleWithDoc = sales.find((s: any) => s.documento && s.numero);
      if (sampleWithDoc) {
        console.log(`[DEBUG GET /sales] Sample with doc: id=${sampleWithDoc.id}, documento=${sampleWithDoc.documento}, numero=${sampleWithDoc.numero}, channel=${sampleWithDoc.channel}`);
      } else {
        console.log(`[DEBUG GET /sales] NO sales with documento/numero found in array!`);
      }
      
      return jsonResponse({ success: true, data: sales });
    }

    // GET /sales/returns
    if (path === '/sales/returns' && method === 'GET') {
      const returnsItems = await getAllReturnsItems();
      const returns = returnsItems.map((item: any) => {
        const value = item.value || {};
        const id = value.id || item.key || `return_${Math.random().toString(36).substr(2, 9)}`;
        return {
          id,
          date: value.date,
          channel: value.channel,
          sku: value.sku,
          quantity: value.quantity,
          price: value.price,
          amount: value.amount,
          brand: value.brand || 'Unknown',
          category: value.category || 'abbigliamento',
          marketplace: value.marketplace,
          paymentMethod: value.paymentMethod,
          area: value.area,
          country: value.country,
          orderReference: value.orderReference,
          returnShippingCost: value.returnShippingCost,
          taxRate: value.taxRate,
          reason: value.reason
        };
      });
      return jsonResponse({ success: true, data: returns });
    }

    // GET /sales/payment-mappings
    if (path === '/sales/payment-mappings' && method === 'GET') {
      try {
        const mappings: Record<string, { macroArea: string; channel: string }> = {};
        const allKeys = await kv.getByPrefix('payment_mapping_');
        
        for (const item of allKeys) {
          const key = item.key;
          const paymentMethod = key.replace('payment_mapping_', '');
          const mapping = item.value || {};
          if (mapping.macroArea && mapping.channel) {
            mappings[paymentMethod] = {
              macroArea: mapping.macroArea,
              channel: mapping.channel
            };
          }
        }
        
        return jsonResponse({
          success: true,
          mappings
        });
      } catch (error) {
        const errorDetails = error instanceof Error ? error.message : String(error);
        return jsonResponse(
          {
            success: false,
            error: 'Failed to load payment mappings',
            details: errorDetails
          },
          500
        );
      }
    }

    // POST /sales/payment-mappings
    if (path === '/sales/payment-mappings' && method === 'POST') {
      try {
        const body = await req.json();
        const { mappings } = body;
        
        if (!mappings || typeof mappings !== 'object') {
          return jsonResponse(
            {
              success: false,
              error: 'Invalid mappings data'
            },
            400
          );
        }
        
        const mappingData: Record<string, any> = {};
        for (const [paymentMethod, mapping] of Object.entries(mappings)) {
          const mappingObj = mapping as { macroArea: string; channel: string };
          if (mappingObj.macroArea && mappingObj.channel) {
            mappingData[`payment_mapping_${paymentMethod}`] = {
              macroArea: mappingObj.macroArea,
              channel: mappingObj.channel
            };
          }
        }
        
        if (Object.keys(mappingData).length > 0) {
          await kv.mset(mappingData);
        }
        
        return jsonResponse({
          success: true,
          message: `Saved ${Object.keys(mappingData).length} payment method mappings`
        });
      } catch (error) {
        const errorDetails = error instanceof Error ? error.message : String(error);
        return jsonResponse(
          {
            success: false,
            error: 'Failed to save payment mappings',
            details: errorDetails
          },
          500
        );
      }
    }

    // POST /sales/bulk
    if (path === '/sales/bulk' && method === 'POST') {
      const requestBody = await req.json();
      const { sales } = requestBody;
      
      if (!sales) {
        return jsonResponse({ success: false, error: 'No sales data provided' }, 400);
      }
      
      if (!Array.isArray(sales)) {
        return jsonResponse({ success: false, error: 'Sales data must be an array' }, 400);
      }

      const [existingSalesData, invMap, paymentMappingsData] = await Promise.all([
        getAllSalesItems(),
        getInventoryMap(),
        (async () => {
          try {
            const mappings: Record<string, { macroArea: string; channel: string }> = {};
            const allKeys = await kv.getByPrefix('payment_mapping_');
            for (const item of allKeys) {
              const key = item.key;
              const paymentMethod = key.replace('payment_mapping_', '');
              const mapping = item.value || {};
              if (mapping.macroArea && mapping.channel) {
                mappings[paymentMethod] = {
                  macroArea: mapping.macroArea,
                  channel: mapping.channel
                };
              }
            }
            return mappings;
          } catch (e) {
            return {};
          }
        })()
      ]);
      
      // Use the same normalizeSku function defined at top level
      const userKey = (u?: string) => (u || '').toString().trim().toLowerCase();
      
      // Create unique signatures using the same logic as frontend
      // For ecommerce sales: documento_numero_data_sku_qty_price
      // For store sales: date_sku_quantity_amount (fallback)
      const existingSalesSignatures = new Set(
        existingSalesData.map((s: any) => {
          const sale = s.value || s;
          // If we have documento and numero, it's an ecommerce sale - use more precise key
          if (sale.documento && sale.numero) {
            const price = sale.price || (sale.amount / sale.quantity);
            return `${sale.documento}_${sale.numero}_${sale.date}_${sale.productId || sale.sku}_${sale.quantity}_${price}`;
          }
          // Fallback for store sales: use date_sku_quantity_amount
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
        const sku = sale.sku || sale.productId;
        
        // Use same unique key logic as frontend ecommerce parser
        // For ecommerce: documento_numero_data_sku_qty_price
        // For store: date_sku_quantity_amount (fallback)
        let saleSignature: string;
        const saleAny = sale as any;
        if (saleAny.documento && saleAny.numero) {
          // Ecommerce sale - use documento and numero from sale object
          const price = sale.price || (sale.amount / sale.quantity);
          saleSignature = `${saleAny.documento}_${saleAny.numero}_${sale.date}_${sku}_${sale.quantity}_${price}`;
        } else {
          // Store sale - use simpler signature
          saleSignature = `${sale.date}_${sku}_${sale.quantity}_${sale.amount}`;
        }
        
        if (existingSalesSignatures.has(saleSignature)) {
          skippedDuplicates++;
          continue;
        }
        
        existingSalesSignatures.add(saleSignature);
        
        let brand = sale.brand || 'Unknown';
        let channel = sale.channel;
        const paymentMethod = sale.paymentMethod;
        
        // Apply payment method mapping if available
        if (paymentMethod && paymentMappingsData[paymentMethod]) {
          const mapping = paymentMappingsData[paymentMethod];
          // Override channel based on mapping
          if (mapping.channel === 'ecommerce' || mapping.channel === 'marketplace') {
            channel = mapping.channel;
          }
        }
        
        // Priority 1: Check inventory map if brand is Unknown or missing
        // Use same normalization logic as GET /sales for consistency
        if ((brand === 'Unknown' || !brand) && sku) {
          const skuStr = sku.toString();
          const normSku = normalizeSku(skuStr);
          const originalSku = skuStr.trim().toUpperCase().replace(/[-_\.\/\s]/g, '');
          const simpleSku = skuStr.trim().toUpperCase();
          
          // Try all variants: normalized, original without separators, simple uppercase
          let invItem = invMap[normSku];
          if (!invItem && originalSku !== normSku) {
            invItem = invMap[originalSku];
          }
          if (!invItem && simpleSku !== normSku && simpleSku !== originalSku) {
            invItem = invMap[simpleSku];
          }
          
          if (invItem && invItem.brand) {
            brand = invItem.brand;
            brandsFromInventory++;
          }
        }
        
        // Priority 2: Check learned brand mapping if still Unknown
        if (brand === 'Unknown' && sku) {
          try {
            const brandMapping = await kv.get(`mapping_brand_${normalizeSku(sku.toString())}`);
            if (brandMapping && brandMapping.brand) {
              brand = brandMapping.brand;
              mappingsApplied++;
            }
          } catch (e) {
            // Mapping not found
          }
        }
        
        if (sale.user && (!channel || channel === 'unknown')) {
          try {
            const channelMapping = await kv.get(`mapping_channel_${userKey(sale.user)}`);
            if (channelMapping && channelMapping.channel) {
              channel = channelMapping.channel;
              mappingsApplied++;
            }
          } catch (e) {
            // Mapping not found
          }
        }
        
        // For ecommerce sales (identified by documento/numero), ensure channel is set
        // If no channel is set and it's an ecommerce sale, default to 'ecommerce'
        if (saleAny.documento && saleAny.numero && (!channel || channel === 'unknown')) {
          channel = 'ecommerce';
        }
        
        const saleId = `sale_${timestamp}_${index}`;
        salesToSave[saleId] = {
          id: saleId,
          date: sale.date,
          user: sale.user || 'unknown',
          channel: channel || 'unknown',
          sku: sku,
          productId: sku,
          quantity: sale.quantity,
          price: sale.price,
          amount: sale.amount,
          brand: brand,
          category: sale.category || 'abbigliamento',
          season: sale.season || 'autunno_inverno',
          marketplace: sale.marketplace,
          paymentMethod: paymentMethod,
          area: sale.area,
          country: sale.country,
          orderReference: sale.orderReference,
          shippingCost: sale.shippingCost,
          taxRate: sale.taxRate,
          documento: saleAny.documento,
          numero: saleAny.numero
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
      
      return jsonResponse({ 
        success: true, 
        message,
        savedCount: processedCount,
        skippedDuplicates,
        brandsFromInventory,
        mappingsApplied
      });
    }

    // POST /sales/returns/bulk
    if (path === '/sales/returns/bulk' && method === 'POST') {
      const requestBody = await req.json();
      const { returns } = requestBody;
      
      if (!returns) {
        return jsonResponse({ success: false, error: 'No returns data provided' }, 400);
      }
      
      if (!Array.isArray(returns)) {
        return jsonResponse({ success: false, error: 'Returns data must be an array' }, 400);
      }

      // Get existing returns to check for duplicates
      const existingReturnsData = await getAllReturnsItems();
      
      const userKey = (u?: string) => (u || '').toString().trim().toLowerCase();
      const normalizeSku = (s?: string) => (s || '').toString().trim().toUpperCase();
      
      // Create a Set of unique return signatures
      const existingReturnSignatures = new Set(
        existingReturnsData.map((r: any) => {
          const ret = r.value || r;
          return `${ret.date}_${ret.orderReference || ret.sku}_${ret.quantity}_${ret.amount}`;
        })
      );

      const returnsToSave: Record<string, any> = {};
      const timestamp = Date.now();
      let skippedDuplicates = 0;
      let processedCount = 0;
      
      for (let index = 0; index < returns.length; index++) {
        const ret = returns[index];
        const returnSignature = `${ret.date}_${ret.orderReference || ret.sku}_${ret.quantity}_${ret.amount}`;
        
        if (existingReturnSignatures.has(returnSignature)) {
          skippedDuplicates++;
          continue;
        }
        
        existingReturnSignatures.add(returnSignature);
        
        // Keep amount as-is from frontend:
        // - Articoli resi: negativi (rimborsi)
        // - Spese di reso (trattenute): positivi (riducono il rimborso)
        // - Rimborso spedizione: negativi (aumentano il rimborso)
        const amount = ret.amount;
        
        const returnId = `return_${timestamp}_${index}`;
        returnsToSave[returnId] = {
          id: returnId,
          saleId: ret.orderReference || `unknown_${returnId}`, // Use orderReference as saleId reference
          date: ret.date,
          amount: amount,
          reason: ret.reason || 'Reso ecommerce',
          channel: ret.channel || 'ecommerce',
          marketplace: ret.paymentMethod || undefined,
          area: ret.area,
          country: ret.country,
          orderReference: ret.orderReference,
          returnShippingCost: ret.returnShippingCost,
          taxRate: ret.taxRate
        };
        processedCount++;
      }

      const keys = Object.keys(returnsToSave);
      
      if (keys.length > 0) {
        await kv.mset(returnsToSave);
      }
      
      let message = `${processedCount} resi caricati con successo`;
      if (skippedDuplicates > 0) {
        message += ` (${skippedDuplicates} resi duplicate ignorati)`;
      }
      
      return jsonResponse({ 
        success: true, 
        message,
        savedCount: processedCount,
        skippedDuplicates
      });
    }

    // Helper: get all returns items
    async function getAllReturnsItems(): Promise<Array<{ key: string; value: any }>> {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL"),
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
      );

      const { count, error: countError } = await supabase
        .from("kv_store_49468be0")
        .select("*", { count: 'exact', head: true })
        .like("key", "return_%");

      if (countError) {
        throw new Error(countError.message);
      }

      if (!count || count === 0) return [];

      if (count <= 1000) {
        const { data, error } = await supabase
          .from("kv_store_49468be0")
          .select("key, value")
          .like("key", "return_%")
          .limit(count);
        if (error) throw new Error(error.message);
        return data?.map(d => ({ key: d.key, value: d.value })) ?? [];
      }

      const pageSize = 1000;
      const pages = Math.ceil(count / pageSize);
      const all: Array<{ key: string; value: any }> = [];

      for (let i = 0; i < pages; i++) {
        const from = i * pageSize;
        const to = from + pageSize - 1;
        const { data, error } = await supabase
          .from("kv_store_49468be0")
          .select("key, value")
          .like("key", "return_%")
          .range(from, to);
        if (error) throw new Error(error.message);
        if (data) {
          all.push(...data.map(d => ({ key: d.key, value: d.value })));
        }
      }

      return all;
    }

    // DELETE /sales/all
    if (path === '/sales/all' && method === 'DELETE') {
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
      return jsonResponse({ 
        success: true, 
        deletedCount: deleted,
        message: `Deleted ${deleted} sales records`
      });
    }

    // POST /sales
    if (path === '/sales' && method === 'POST') {
      const saleData = await req.json();
      
      const invMap = await getInventoryMap();
      const normalizeSku = (s?: string) => (s || '').toString().trim().toUpperCase();
      
      let brand = saleData.brand || 'Unknown';
      const sku = saleData.sku || saleData.productId;
      
      if ((brand === 'Unknown' || !brand) && sku) {
        const normSku = normalizeSku(sku);
        const invItem = invMap[normSku];
        if (invItem && invItem.brand) {
          brand = invItem.brand;
        }
      }
      
      if (brand === 'Unknown' && sku) {
        try {
          const brandMapping = await kv.get(`mapping_brand_${normalizeSku(sku)}`);
          if (brandMapping && brandMapping.brand) {
            brand = brandMapping.brand;
          }
        } catch (e) {
          // Mapping not found
        }
      }
      
      const saleId = `sale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const sale: SaleData = {
        ...saleData,
        id: saleId,
        brand: brand,
        paymentMethod: saleData.paymentMethod,
        area: saleData.area,
        country: saleData.country,
        orderReference: saleData.orderReference,
        shippingCost: saleData.shippingCost,
        taxRate: saleData.taxRate,
        documento: saleData.documento,
        numero: saleData.numero
      };
      
      await kv.set(saleId, sale);
      
      return jsonResponse({ success: true, data: sale });
    }

    // DELETE /sales/:id
    const deleteMatch = path.match(/^\/sales\/(.+)$/);
    if (deleteMatch && method === 'DELETE') {
      const saleId = deleteMatch[1];
      await kv.del(saleId);
      return jsonResponse({ success: true, message: 'Sale deleted' });
    }

    // POST /sales/update-brands-from-inventory
    if (path === '/sales/update-brands-from-inventory' && method === 'POST') {
      const [kvItems, invMap] = await Promise.all([
        getAllSalesItems(),
        getInventoryMap()
      ]);
      
      const updates: Record<string, SaleData> = {};
      let updatedCount = 0;
      let noSkuCount = 0;
      let noMatchCount = 0;
      let alreadyHasBrandCount = 0;
      
      for (const item of kvItems) {
        const value = item.value || {};
        const currentBrand = value.brand;
        
        // Skip if already has a valid brand
        if (currentBrand && currentBrand !== 'Unknown' && currentBrand.trim() !== '') {
          alreadyHasBrandCount++;
          continue;
        }
        
        // Get SKU from either sku or productId field
        const sku = value.sku || value.productId;
        
        if (!sku || sku.toString().trim() === '') {
          noSkuCount++;
          continue;
        }
        
        // Try multiple normalization approaches
        const skuStr = sku.toString();
        const normSku = normalizeSku(skuStr);
        const originalSku = skuStr.trim().toUpperCase().replace(/[-_\.\/\s]/g, '');
        const simpleSku = skuStr.trim().toUpperCase();
        
        // Try all variants: normalized, original without separators, simple uppercase
        let invItem = invMap[normSku];
        if (!invItem && originalSku !== normSku) {
          invItem = invMap[originalSku];
        }
        if (!invItem && simpleSku !== normSku && simpleSku !== originalSku) {
          invItem = invMap[simpleSku];
        }
        
        if (invItem && invItem.brand) {
          updates[item.key] = {
            ...value,
            brand: invItem.brand
          };
          updatedCount++;
        } else {
          noMatchCount++;
        }
      }
      
      if (Object.keys(updates).length > 0) {
        await kv.mset(updates);
      }
      
      return jsonResponse({
        success: true,
        message: `${updatedCount} vendite aggiornate con brand dall'inventario`,
        updatedCount,
        stats: {
          total: kvItems.length,
          updated: updatedCount,
          noSku: noSkuCount,
          noMatch: noMatchCount,
          alreadyHasBrand: alreadyHasBrandCount
        }
      });
    }

    // GET /sales/orphans
    if (path === '/sales/orphans' && method === 'GET') {
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
      return jsonResponse({ success: true, data: orphans });
    }

    // POST /sales/bulk-update
    if (path === '/sales/bulk-update' && method === 'POST') {
      const { updates } = await req.json();
      if (!Array.isArray(updates)) return jsonResponse({ success: false, error: 'updates must be array' }, 400);
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
      return jsonResponse({ success: true, updated });
    }

    // GET /sales/unknown-analysis - Analyze Unknown brand sales and find potential matches
    if (path === '/sales/unknown-analysis' && method === 'GET') {
      const [kvItems, invMap] = await Promise.all([
        getAllSalesItems(),
        getInventoryMap()
      ]);
      
      const url = new URL(req.url);
      const limit = Math.min(100, parseInt(url.searchParams.get('limit') || '50'));
      
      const unknownSales: Array<{ sku: string; normalized: string; amount: number }> = [];
      const inventorySkuList: string[] = [];
      
      // Get all inventory SKUs (normalized)
      for (const key of Object.keys(invMap)) {
        inventorySkuList.push(key);
      }
      
      // Find sales with Unknown brand
      for (let i = 0; i < Math.min(limit * 10, kvItems.length); i++) {
        const item = kvItems[i];
        const value = item.value || {};
        const sku = value.sku || value.productId;
        const currentBrand = value.brand;
        
        if ((!currentBrand || currentBrand === 'Unknown') && sku) {
          const skuStr = sku.toString();
          const normSku = normalizeSku(skuStr);
          
          // Check if this SKU matches anything in inventory
          const hasMatch = invMap[normSku] || 
                          invMap[skuStr.trim().toUpperCase().replace(/[-_\.\/\s]/g, '')] ||
                          invMap[skuStr.trim().toUpperCase()];
          
          if (!hasMatch) {
            unknownSales.push({
              sku: skuStr,
              normalized: normSku,
              amount: value.amount || 0
            });
            
            if (unknownSales.length >= limit) break;
          }
        }
      }
      
      // Try to find partial matches
      const partialMatches: Array<{ saleSku: string; inventorySku: string; similarity: number }> = [];
      
      for (const unknown of unknownSales.slice(0, 20)) {
        const normSale = unknown.normalized;
        
        // Try to find SKUs that contain parts of the sale SKU
        for (const invSku of inventorySkuList) {
          // Check if sale SKU contains inventory SKU or vice versa
          if (normSale.length > 3 && invSku.length > 3) {
            if (normSale.includes(invSku) || invSku.includes(normSale)) {
              const similarity = Math.min(normSale.length, invSku.length) / Math.max(normSale.length, invSku.length);
              if (similarity > 0.5) {
                partialMatches.push({
                  saleSku: unknown.sku,
                  inventorySku: invSku,
                  similarity: Math.round(similarity * 100)
                });
                break; // One match per sale SKU
              }
            }
          }
        }
      }
      
      return jsonResponse({
        success: true,
        analysis: {
          totalSales: kvItems.length,
          unknownCount: unknownSales.length,
          unknownSamples: unknownSales.slice(0, 20),
          partialMatches: partialMatches.slice(0, 10),
          inventorySize: inventorySkuList.length
        }
      });
    }

    // GET /sales/diagnose-skus - Diagnostic endpoint to analyze SKU matching issues
    if (path === '/sales/diagnose-skus' && method === 'GET') {
      const [kvItems, invMap] = await Promise.all([
        getAllSalesItems(),
        getInventoryMap()
      ]);
      
      const url = new URL(req.url);
      const limit = Math.min(50, parseInt(url.searchParams.get('limit') || '20'));
      
      const unmatched: Array<{ sku: string; normalized: string; original: string; brand: string | null }> = [];
      const matched: Array<{ sku: string; brand: string }> = [];
      const inventorySkuSamples: string[] = [];
      
      // Get sample inventory SKUs
      let invCount = 0;
      for (const [key, value] of Object.entries(invMap)) {
        if (invCount < 10) {
          inventorySkuSamples.push(key);
          invCount++;
        }
      }
      
      // Analyze first N sales
      for (let i = 0; i < Math.min(limit, kvItems.length); i++) {
        const item = kvItems[i];
        const value = item.value || {};
        const sku = value.sku || value.productId;
        const currentBrand = value.brand;
        
        if (!sku) continue;
        
        const originalSku = sku.toString().trim().toUpperCase();
        const normSku = normalizeSku(sku);
        
        const invItem = invMap[normSku] || invMap[originalSku];
        
        if (invItem && invItem.brand) {
          matched.push({ sku: originalSku, brand: invItem.brand });
        } else if (!currentBrand || currentBrand === 'Unknown') {
          unmatched.push({
            sku: originalSku,
            normalized: normSku,
            original: sku.toString(),
            brand: currentBrand
          });
        }
      }
      
      return jsonResponse({
        success: true,
        analysis: {
          totalSales: kvItems.length,
          analyzed: Math.min(limit, kvItems.length),
          matched: matched.length,
          unmatched: unmatched.length,
          unmatchedSamples: unmatched.slice(0, 10),
          matchedSamples: matched.slice(0, 10),
          inventorySkuSamples: inventorySkuSamples.slice(0, 10)
        }
      });
    }

    // POST /sales/learn
    if (path === '/sales/learn' && method === 'POST') {
      const body = await req.json();
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
      return jsonResponse({ success: true, learned });
    }

    // GET /sales/duplicates - Identify duplicate sales
    if (path === '/sales/duplicates' && method === 'GET') {
      const kvItems = await getAllSalesItems();
      
      // Build signature map: signature -> array of { key, value }
      const signatureMap = new Map<string, Array<{ key: string; value: any }>>();
      
      for (const item of kvItems) {
        const sale = item.value || {};
        const sku = sale.sku || sale.productId;
        
        // Use same signature logic as bulk upload
        let signature: string;
        if (sale.documento && sale.numero) {
          // Ecommerce sale
          const price = sale.price || (sale.amount / sale.quantity);
          signature = `${sale.documento}_${sale.numero}_${sale.date}_${sku}_${sale.quantity}_${price}`;
        } else {
          // Store sale
          signature = `${sale.date}_${sku}_${sale.quantity}_${sale.amount}`;
        }
        
        if (!signatureMap.has(signature)) {
          signatureMap.set(signature, []);
        }
        signatureMap.get(signature)!.push({ key: item.key, value: sale });
      }
      
      // Find duplicates (signatures with more than 1 entry)
      const duplicates: Array<{
        signature: string;
        count: number;
        sales: Array<{ id: string; date: string; amount: number; channel: string; documento?: string; numero?: string }>;
      }> = [];
      
      for (const [signature, entries] of signatureMap.entries()) {
        if (entries.length > 1) {
          duplicates.push({
            signature,
            count: entries.length,
            sales: entries.map(e => ({
              id: e.key,
              date: e.value.date,
              amount: e.value.amount,
              channel: e.value.channel,
              documento: e.value.documento,
              numero: e.value.numero
            }))
          });
        }
      }
      
      // Sort by count (most duplicates first)
      duplicates.sort((a, b) => b.count - a.count);
      
      const totalDuplicates = duplicates.reduce((sum, d) => sum + (d.count - 1), 0);
      
      return jsonResponse({
        success: true,
        totalDuplicateGroups: duplicates.length,
        totalDuplicateRecords: totalDuplicates,
        duplicates: duplicates.slice(0, 100) // Return first 100 groups
      });
    }

    // POST /sales/remove-duplicates - Remove duplicate sales (keeps oldest)
    if (path === '/sales/remove-duplicates' && method === 'POST') {
      const kvItems = await getAllSalesItems();
      
      // Build signature map: signature -> array of { key, value, timestamp }
      const signatureMap = new Map<string, Array<{ key: string; value: any; timestamp: number }>>();
      
      for (const item of kvItems) {
        const sale = item.value || {};
        const sku = sale.sku || sale.productId;
        
        // Extract timestamp from key (sale_TIMESTAMP_index)
        const keyMatch = item.key.match(/^sale_(\d+)_/);
        const timestamp = keyMatch ? parseInt(keyMatch[1], 10) : Date.now();
        
        // Use same signature logic as bulk upload
        let signature: string;
        if (sale.documento && sale.numero) {
          // Ecommerce sale
          const price = sale.price || (sale.amount / sale.quantity);
          signature = `${sale.documento}_${sale.numero}_${sale.date}_${sku}_${sale.quantity}_${price}`;
        } else {
          // Store sale
          signature = `${sale.date}_${sku}_${sale.quantity}_${sale.amount}`;
        }
        
        if (!signatureMap.has(signature)) {
          signatureMap.set(signature, []);
        }
        signatureMap.get(signature)!.push({ key: item.key, value: sale, timestamp });
      }
      
      // Find duplicates and keep the oldest one (lowest timestamp)
      const keysToDelete: string[] = [];
      let duplicateGroups = 0;
      
      for (const [signature, entries] of signatureMap.entries()) {
        if (entries.length > 1) {
          duplicateGroups++;
          // Sort by timestamp (oldest first)
          entries.sort((a, b) => a.timestamp - b.timestamp);
          // Keep the first (oldest), delete the rest
          for (let i = 1; i < entries.length; i++) {
            keysToDelete.push(entries[i].key);
          }
        }
      }
      
      // Delete duplicates in batches
      const BATCH_SIZE = 500;
      let deleted = 0;
      for (let i = 0; i < keysToDelete.length; i += BATCH_SIZE) {
        const batch = keysToDelete.slice(i, i + BATCH_SIZE);
        if (batch.length > 0) {
          await kv.mdel(batch);
          deleted += batch.length;
        }
      }
      
      return jsonResponse({
        success: true,
        duplicateGroups,
        deletedCount: deleted,
        message: `Rimossi ${deleted} record duplicati da ${duplicateGroups} gruppi`
      });
    }

    // GET /sales/stats - Get database statistics
    if (path === '/sales/stats' && method === 'GET') {
      const kvItems = await getAllSalesItems();
      
      const stats = {
        totalSales: kvItems.length,
        byChannel: {} as Record<string, number>,
        byMonth: {} as Record<string, number>,
        ecommerceSales: 0,
        withDocumentoNumero: 0,
        totalAmount: 0,
        sampleDates: [] as string[]
      };
      
      for (const item of kvItems) {
        const sale = item.value || {};
        const channel = sale.channel || 'unknown';
        stats.byChannel[channel] = (stats.byChannel[channel] || 0) + 1;
        
        // Extract month from date
        if (sale.date) {
          const date = new Date(sale.date);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          stats.byMonth[monthKey] = (stats.byMonth[monthKey] || 0) + 1;
          
          if (stats.sampleDates.length < 10) {
            stats.sampleDates.push(sale.date);
          }
        }
        
        if (sale.documento && sale.numero) {
          stats.withDocumentoNumero++;
          if (sale.channel === 'ecommerce' || sale.channel === 'marketplace') {
            stats.ecommerceSales++;
          }
        }
        
        stats.totalAmount += (sale.amount || 0);
      }
      
      return jsonResponse({
        success: true,
        stats
      });
    }

    // 404 for unknown sales routes
    return jsonResponse({ error: 'Sales route not found' }, 404);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return jsonResponse({ success: false, error: errorMessage }, 500);
  }
}
