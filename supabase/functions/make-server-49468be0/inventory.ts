// Inventory routes - Native Deno (no Hono)
import * as kv from './kv_store.ts';
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

// Efficient function to get only existing SKUs (for duplicate checking)
const getExistingSKUs = async (): Promise<Set<string>> => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  );
  
  const existingSKUs = new Set<string>();
  
  try {
    const { count, error: countError } = await supabase
      .from("kv_store_49468be0")
      .select("*", { count: 'exact', head: true })
      .like("key", "inventory_%");
    
    if (countError || !count || count === 0) {
      return existingSKUs;
    }
    
    const pageSize = 1000;
    const totalPages = Math.ceil(count / pageSize);
    const maxPages = 500; // Safety limit
    
    for (let currentPage = 0; currentPage < Math.min(totalPages, maxPages); currentPage++) {
      const from = currentPage * pageSize;
      const to = from + pageSize - 1;
      
      const { data: pageData, error } = await supabase
        .from("kv_store_49468be0")
        .select("value")
        .like("key", "inventory_%")
        .range(from, to);
      
      if (error) {
        console.warn(`Error loading page ${currentPage}: ${error.message}`);
        continue;
      }
      
      if (pageData) {
        pageData.forEach((row: any) => {
          const v = row.value || {};
          const sku = v.sku;
          if (sku) {
            existingSKUs.add(sku.toString().trim().toUpperCase());
          }
        });
      }
    }
    
    return existingSKUs;
  } catch (error) {
    console.error(`Error getting existing SKUs: ${error}`);
    return existingSKUs;
  }
};

// Custom function to get all inventory items with pagination to bypass 1000 row limit
const getAllInventoryItems = async (): Promise<any[]> => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  );
  
  try {
    const { count, error: countError } = await supabase
      .from("kv_store_49468be0")
      .select("*", { count: 'exact', head: true })
      .like("key", "inventory_%");
    
    if (countError) {
      throw new Error(countError.message);
    }
    
    if (count === 0) {
      return [];
    }
    
    if (count > 1000) {
      const allData: any[] = [];
      const pageSize = 1000;
      const totalPages = Math.ceil(count / pageSize);
      // Removed hard limit - now loads all pages based on actual count
      // Increased safety limit to 500 pages (500k items) to prevent infinite loops
      const maxPages = 500;
      
      for (let currentPage = 0; currentPage < Math.min(totalPages, maxPages); currentPage++) {
        const from = currentPage * pageSize;
        const to = from + pageSize - 1;
        
        const { data: pageData, error } = await supabase
          .from("kv_store_49468be0")
          .select("key, value")
          .like("key", "inventory_%")
          .range(from, to);
        
        if (error) {
          throw new Error(error.message);
        }
        
        if (pageData) {
          allData.push(...pageData.map((d) => ({ key: d.key, value: d.value })));
        }
        
        // Log progress for large inventories
        if (currentPage % 10 === 0 && totalPages > 10) {
          console.log(`Loading inventory: page ${currentPage + 1}/${totalPages} (${allData.length} items loaded so far)`);
        }
      }
      
      console.log(`Loaded ${allData.length} inventory items out of ${count} total`);
      
      // Warn if we hit the limit
      if (totalPages >= maxPages) {
        console.warn(`Warning: Inventory has ${count} items (${totalPages} pages), but only loaded first ${maxPages} pages (${allData.length} items)`);
      }
      
      return allData;
    } else {
      const { data, error } = await supabase
        .from("kv_store_49468be0")
        .select("key, value")
        .like("key", "inventory_%")
        .limit(count);
      
      if (error) {
        throw new Error(error.message);
      }
      
      return data?.map((d) => ({ key: d.key, value: d.value })) ?? [];
    }
  } catch (error) {
    throw error;
  }
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

// Main inventory routes handler
export async function handleInventoryRoutes(req: Request, path: string, method: string): Promise<Response> {
  try {
    // GET /inventory
    if (path === '/inventory' && method === 'GET') {
      const requestStart = Date.now();
      const REQUEST_TIMEOUT = 25000;
      
      const url = new URL(req.url);
      const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
      const limit = Math.min(100, Math.max(10, parseInt(url.searchParams.get('limit') || '50')));
      const search = url.searchParams.get('search')?.trim() || '';
      const brand = url.searchParams.get('brand')?.trim() || '';
      const category = url.searchParams.get('category')?.trim() || '';
      
      const allInventoryItems = await getAllInventoryItems();
      
      if (allInventoryItems.length === 0) {
        return jsonResponse({
          success: true,
          inventory: [],
          pagination: {
            page: 1,
            limit,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          },
          filters: {
            brands: [],
            categories: []
          }
        });
      }
      
      let filteredItems: any[] = [];
      const uniqueBrands = new Set<string>();
      const uniqueCategories = new Set<string>();
      
      for (let i = 0; i < allInventoryItems.length; i++) {
        if (i % 1000 === 0 && Date.now() - requestStart > REQUEST_TIMEOUT) {
          break;
        }
        
        const item = allInventoryItems[i];
        const v = item.value || {};
        const inventoryItem = {
          id: (v.id || item.key?.replace(/^inventory_/, '') || '').toString(),
          sku: (v.sku || '').toString(),
          brand: (v.brand || '').toString(),
          category: (v.category || '').toString(),
          collection: (v.collection || '').toString(),
          purchasePrice: typeof v.purchasePrice === 'number' ? v.purchasePrice : Number(v.purchasePrice || 0),
          sellPrice: typeof v.sellPrice === 'number' ? v.sellPrice : Number(v.sellPrice || 0),
          createdAt: v.createdAt,
          updatedAt: v.updatedAt,
        };
        
        uniqueBrands.add(inventoryItem.brand);
        if (inventoryItem.category && inventoryItem.category.trim()) {
          uniqueCategories.add(inventoryItem.category);
        }
        
        let matchesFilters = true;
        
        if (search) {
          const searchLower = search.toLowerCase();
          const skuL = (inventoryItem.sku || '').toLowerCase();
          const brandL = (inventoryItem.brand || '').toLowerCase();
          const catL = (inventoryItem.category || '').toLowerCase();
          matchesFilters = matchesFilters && (
            skuL.includes(searchLower) || brandL.includes(searchLower) || catL.includes(searchLower)
          );
        }
        
        if (brand && brand !== 'all') {
          matchesFilters = matchesFilters && inventoryItem.brand === brand;
        }
        
        if (category && category !== 'all') {
          if (category === 'empty') {
            matchesFilters = matchesFilters && (!inventoryItem.category || inventoryItem.category.trim() === '');
          } else {
            matchesFilters = matchesFilters && inventoryItem.category === category;
          }
        }
        
        if (matchesFilters) {
          filteredItems.push(inventoryItem);
        }
      }
      
      const total = filteredItems.length;
      const totalPages = Math.ceil(total / limit);
      const offset = (page - 1) * limit;
      const paginatedItems = filteredItems.slice(offset, offset + limit);
      
      return jsonResponse({
        success: true,
        inventory: paginatedItems,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        filters: {
          brands: Array.from(uniqueBrands).sort(),
          categories: Array.from(uniqueCategories).sort()
        }
      });
    }

    // POST /inventory
    if (path === '/inventory' && method === 'POST') {
      const startTime = Date.now();
      
      const body = await req.json();
      const { inventory: inventoryData, chunk, totalChunks } = body;
      
      try {
        await kv.get('health_check_test_key');
      } catch (dbError) {
        throw new Error(`Database connection failed: ${dbError.message}`);
      }
      
      if (!inventoryData || !Array.isArray(inventoryData)) {
        return jsonResponse(
          { 
            success: false, 
            error: 'Invalid inventory data format' 
          }, 
          400
        );
      }
      
      // Increased timeout to 240 seconds (4 minutes) for large uploads
      const TIMEOUT_MS = 240000;
      let isTimedOut = false;
      const timeoutId = setTimeout(() => {
        isTimedOut = true;
      }, TIMEOUT_MS);
      
      try {
        const timestamp = new Date().toISOString();
        
        // Get existing SKUs efficiently (only SKU strings, not full items)
        console.log('Loading existing SKUs for duplicate check...');
        const existingSKUs = await getExistingSKUs();
        console.log(`Found ${existingSKUs.size} existing SKUs in database`);
        
        // Also check for duplicates within the current chunk
        const chunkSKUs = new Set<string>();
        
        let skippedDuplicates = 0;
        let skippedExisting = 0;
        let processedCount = 0;
        let skippedInvalid = 0;
        
        // Increased batch size for better performance
        const BATCH_SIZE = 1000;
        const kvData: Record<string, any> = {};
        
        for (let i = 0; i < inventoryData.length; i++) {
          // Check for timeout
          if (isTimedOut) {
            throw new Error('Processing timeout - chunk too large or server overload');
          }
          
          const item = inventoryData[i];
          
          // Skip invalid items
          if (!item.sku || !item.brand) {
            skippedInvalid++;
            continue;
          }
          
          const skuNormalized = item.sku.toString().trim().toUpperCase();
          
          // Check for duplicates within the current chunk
          if (chunkSKUs.has(skuNormalized)) {
            skippedDuplicates++;
            continue;
          }
          
          // Check if SKU already exists in database
          if (existingSKUs.has(skuNormalized)) {
            skippedExisting++;
            continue;
          }
          
          chunkSKUs.add(skuNormalized);
          
          const generatedId = `${item.sku}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const key = `inventory_${generatedId}`;
          const inventoryItem = {
            id: generatedId,
            sku: item.sku,
            category: item.category || '',
            brand: item.brand,
            purchasePrice: item.purchasePrice,
            sellPrice: item.sellPrice,
            collection: item.collection || '',
            createdAt: timestamp,
            updatedAt: timestamp
          };
          
          kvData[key] = inventoryItem;
          processedCount++;
          
          // Save in batches
          if (Object.keys(kvData).length >= BATCH_SIZE) {
            try {
              await kv.mset(kvData);
              Object.keys(kvData).forEach(key => delete kvData[key]);
            } catch (batchError) {
              throw new Error(`Failed to store batch: ${batchError.message}`);
            }
            
            // Check timeout but allow more time (200 seconds instead of 42)
            const elapsedTime = Date.now() - startTime;
            if (elapsedTime > 200000) {
              console.log(`Timeout warning: processed ${processedCount} items in ${elapsedTime}ms, saving remaining batch...`);
              break;
            }
          }
        }
        
        if (Object.keys(kvData).length > 0) {
          try {
            await kv.mset(kvData);
          } catch (finalBatchError) {
            throw new Error(`Failed to store final batch: ${finalBatchError.message}`);
          }
        }
        
        clearTimeout(timeoutId);
        
        if (processedCount === 0) {
          return jsonResponse(
            { 
              success: false, 
              error: 'No valid inventory items to process' 
            }, 
            400
          );
        }
        
        const processingTime = Date.now() - startTime;
        const chunkInfo = chunk && totalChunks ? ` (chunk ${chunk}/${totalChunks})` : '';
        
        let message = `${processedCount} inventory items uploaded successfully${chunkInfo}`;
        if (skippedDuplicates > 0) {
          message += ` (${skippedDuplicates} SKU duplicati nel chunk ignorati)`;
        }
        if (skippedExisting > 0) {
          message += ` (${skippedExisting} SKU già esistenti nel database ignorati)`;
        }
        if (skippedInvalid > 0) {
          message += ` (${skippedInvalid} item senza SKU o brand ignorati)`;
        }
        
        return jsonResponse({
          success: true,
          message,
          count: processedCount,
          skippedDuplicates,
          skippedExisting,
          skippedInvalid,
          chunk,
          totalChunks,
          processingTime,
          totalInChunk: inventoryData.length
        });
        
      } catch (innerError) {
        clearTimeout(timeoutId);
        throw innerError;
      }
    }

    // DELETE /inventory/:id
    const deleteMatch = path.match(/^\/inventory\/(.+)$/);
    if (deleteMatch && method === 'DELETE') {
      const id = deleteMatch[1];
      const key = `inventory_${id}`;
      
      await kv.del(key);
      
      return jsonResponse({
        success: true,
        message: `Inventory item ${id} deleted successfully`
      });
    }

    // GET /inventory/count
    if (path === '/inventory/count' && method === 'GET') {
      // Get count directly from database for accuracy (faster than loading all items)
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL"),
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
      );
      
      const { count, error: countError } = await supabase
        .from("kv_store_49468be0")
        .select("*", { count: 'exact', head: true })
        .like("key", "inventory_%");
      
      if (countError) {
        throw new Error(countError.message);
      }
      
      const actualCount = count || 0;
      
      // Also verify by loading items to check for discrepancies
      const allInventoryItems = await getAllInventoryItems();
      const loadedCount = allInventoryItems.length;
      
      return jsonResponse({
        success: true,
        count: actualCount,
        loadedCount: loadedCount,
        databaseCount: actualCount,
        discrepancy: actualCount !== loadedCount ? actualCount - loadedCount : 0,
        message: `Total inventory items: ${actualCount}${actualCount !== loadedCount ? ` (loaded: ${loadedCount}, discrepancy: ${actualCount - loadedCount})` : ''}`
      });
    }

    // DELETE /inventory
    if (path === '/inventory' && method === 'DELETE') {
      const startTime = Date.now();
      console.log('Starting inventory deletion...');
      
      const inventoryItems = await getAllInventoryItems();
      const keys = inventoryItems.map(item => item.key);
      
      console.log(`Found ${keys.length} inventory items to delete`);
      
      if (keys.length > 0) {
        // Batch size aumentato per velocizzare
        const BATCH_SIZE = 500;
        let deletedCount = 0;
        let errors = 0;
        
        for (let i = 0; i < keys.length; i += BATCH_SIZE) {
          const batch = keys.slice(i, i + BATCH_SIZE);
          
          try {
            await kv.mdel(batch);
            deletedCount += batch.length;
            
            // Log progress ogni 5000 items
            if (deletedCount % 5000 === 0) {
              console.log(`Deleted ${deletedCount}/${keys.length} items...`);
            }
          } catch (batchError) {
            errors++;
            console.error(`Error deleting batch at ${i}: ${batchError}`);
            // Continue with other batches
          }
          
          // Delay ridotto a 20ms per velocizzare
          if (i + BATCH_SIZE < keys.length) {
            await new Promise(resolve => setTimeout(resolve, 20));
          }
        }
        
        const processingTime = Date.now() - startTime;
        console.log(`Inventory deletion completed: ${deletedCount} items in ${processingTime}ms`);
        
        return jsonResponse({
          success: true,
          message: `${deletedCount} inventory items deleted successfully`,
          deletedCount,
          totalItems: keys.length,
          errors,
          processingTime
        });
      } else {
        return jsonResponse({
          success: true,
          message: 'No inventory items to delete',
          deletedCount: 0,
          totalItems: 0
        });
      }
    }

    // POST /inventory/remove-duplicates
    if (path === '/inventory/remove-duplicates' && method === 'POST') {
      const startTime = Date.now();
      
      try {
        console.log('Starting duplicate removal process...');
        const allInventoryItems = await getAllInventoryItems();
        console.log(`Loaded ${allInventoryItems.length} items for duplicate check`);
        
        // Group items by SKU (normalized)
        const skuGroups = new Map<string, Array<{ key: string; item: any; createdAt?: string }>>();
        
        for (const item of allInventoryItems) {
          const v = item.value || {};
          const sku = v.sku;
          if (!sku) continue;
          
          const skuNormalized = sku.toString().trim().toUpperCase();
          
          if (!skuGroups.has(skuNormalized)) {
            skuGroups.set(skuNormalized, []);
          }
          
          skuGroups.get(skuNormalized)!.push({
            key: item.key,
            item: v,
            createdAt: v.createdAt || item.key // Use key as fallback for sorting
          });
        }
        
        // Find duplicates (SKUs with more than 1 item)
        const duplicatesToRemove: string[] = [];
        let totalDuplicates = 0;
        let uniqueSKUs = 0;
        
        for (const [sku, items] of skuGroups.entries()) {
          if (items.length > 1) {
            // Sort by createdAt (newest first), keep the first one
            items.sort((a, b) => {
              const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
              const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
              return dateB - dateA; // Newest first
            });
            
            // Keep the first (newest), mark others for deletion
            for (let i = 1; i < items.length; i++) {
              duplicatesToRemove.push(items[i].key);
              totalDuplicates++;
            }
          } else {
            uniqueSKUs++;
          }
        }
        
        console.log(`Found ${totalDuplicates} duplicate items to remove (${skuGroups.size - uniqueSKUs} SKUs with duplicates)`);
        
        // Delete duplicates in batches
        let deletedCount = 0;
        const BATCH_SIZE = 100;
        
        for (let i = 0; i < duplicatesToRemove.length; i += BATCH_SIZE) {
          const batch = duplicatesToRemove.slice(i, i + BATCH_SIZE);
          
          try {
            await kv.mdel(batch);
            deletedCount += batch.length;
            console.log(`Deleted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${deletedCount}/${duplicatesToRemove.length}`);
          } catch (batchError) {
            console.error(`Error deleting batch: ${batchError}`);
            // Continue with other batches
          }
          
          // Small delay to avoid overwhelming the database
          if (i + BATCH_SIZE < duplicatesToRemove.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        const processingTime = Date.now() - startTime;
        
        return jsonResponse({
          success: true,
          message: `Rimossi ${deletedCount} item duplicati`,
          deletedCount,
          totalDuplicates,
          uniqueSKUs,
          skusWithDuplicates: skuGroups.size - uniqueSKUs,
          processingTime
        });
        
      } catch (error) {
        const errorDetails = error instanceof Error ? error.message : String(error);
        return jsonResponse(
          {
            success: false,
            error: 'Failed to remove duplicates',
            details: errorDetails
          },
          500
        );
      }
    }

    // 404 for unknown inventory routes
    return jsonResponse({ error: 'Inventory route not found' }, 404);
  } catch (error) {
    const errorDetails = error instanceof Error ? error.message : String(error);
    return jsonResponse(
      {
        success: false,
        error: 'Failed to process inventory request',
        details: errorDetails
      },
      500
    );
  }
}
