// Inventory routes - Native Deno (no Hono)
import * as kv from './kv_store.ts';
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

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
      let currentPage = 0;
      
      while (currentPage * pageSize < count) {
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
        
        currentPage++;
        
        if (currentPage > 100) {
          break;
        }
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
      const timeoutId = setTimeout(() => {
        throw new Error('Processing timeout - chunk too large or server overload');
      }, TIMEOUT_MS);
      
      try {
        const timestamp = new Date().toISOString();
        
        // Optimize: Only check for duplicates within the current chunk, not all existing items
        // This is much faster for large inventories (40k+ items)
        // We'll check duplicates within the chunk itself and let the database handle conflicts
        const chunkSKUs = new Set<string>();
        const chunkSKUCounts = new Map<string, number>();
        
        // Count SKUs in current chunk to detect duplicates within chunk
        for (const item of inventoryData) {
          if (item.sku) {
            chunkSKUCounts.set(item.sku, (chunkSKUCounts.get(item.sku) || 0) + 1);
          }
        }
        
        let skippedDuplicates = 0;
        let processedCount = 0;
        let skippedInvalid = 0;
        
        // Increased batch size for better performance
        const BATCH_SIZE = 1000;
        const kvData: Record<string, any> = {};
        
        for (let i = 0; i < inventoryData.length; i++) {
          const item = inventoryData[i];
          
          // Skip invalid items
          if (!item.sku || !item.brand) {
            skippedInvalid++;
            continue;
          }
          
          // Check for duplicates within the current chunk
          if (chunkSKUs.has(item.sku)) {
            skippedDuplicates++;
            continue;
          }
          
          chunkSKUs.add(item.sku);
          
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
        if (skippedInvalid > 0) {
          message += ` (${skippedInvalid} item senza SKU o brand ignorati)`;
        }
        
        return jsonResponse({
          success: true,
          message,
          count: processedCount,
          skippedDuplicates,
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
      const allInventoryItems = await getAllInventoryItems();
      const count = allInventoryItems.length;
      
      return jsonResponse({
        success: true,
        count,
        message: `Total inventory items: ${count}`
      });
    }

    // DELETE /inventory
    if (path === '/inventory' && method === 'DELETE') {
      const inventoryItems = await getAllInventoryItems();
      const keys = inventoryItems.map(item => item.key);
      
      if (keys.length > 0) {
        const BATCH_SIZE = 100;
        let deletedCount = 0;
        
        for (let i = 0; i < keys.length; i += BATCH_SIZE) {
          const batch = keys.slice(i, i + BATCH_SIZE);
          
          try {
            await kv.mdel(batch);
            deletedCount += batch.length;
          } catch (batchError) {
            // Continue with other batches
          }
          
          if (i + BATCH_SIZE < keys.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        return jsonResponse({
          success: true,
          message: `${deletedCount} inventory items deleted successfully`,
          deletedCount,
          totalItems: keys.length
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
